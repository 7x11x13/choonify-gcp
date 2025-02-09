package render

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"slices"
	"strings"
	"time"

	"choonify.com/backend/functions/render/types"
	cloudtasks "cloud.google.com/go/cloudtasks/apiv2"
	"cloud.google.com/go/firestore"
	"cloud.google.com/go/storage"
	firebase "firebase.google.com/go"
	"firebase.google.com/go/auth"
	"github.com/GoogleCloudPlatform/functions-framework-go/functions"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/googleapi"
	"google.golang.org/api/option"
	"google.golang.org/api/youtube/v3"
)

var Firestore *firestore.Client
var Firebase *firebase.App
var Bucket *storage.BucketHandle
var Auth *auth.Client
var Tasks *cloudtasks.Client

func InitFirebase() {
	var err error
	ctx := context.Background()
	Firebase, err = firebase.NewApp(ctx, nil)
	if err != nil {
		panic(err)
	}
	Firestore, err = Firebase.Firestore(ctx)
	if err != nil {
		panic(err)
	}
	Storage, err := Firebase.Storage(ctx)
	if err != nil {
		panic(err)
	}
	Bucket, err = Storage.Bucket(os.Getenv("FIREBASE_STORAGE_BUCKET"))
	if err != nil {
		panic(err)
	}
}

func init() {
	InitFirebase()
	functions.HTTP("Render", Render)
}

var lavfiCommands = map[types.FilterType]string{
	"solidblack": "[0:v]select='eq(n,0)',scale=1920:1080:force_original_aspect_ratio=decrease," +
		"pad=1920:1080:-1:-1:color=black,setpts=N*%f/TB",
	"solidcolor": "[0:v]select='eq(n,0)',scale=1920:1080:force_original_aspect_ratio=decrease," +
		"pad=1920:1080:-1:-1:color=%s,setpts=N*%f/TB",
	"blurred": "[0:v]select='eq(n,0)',scale=1920:1080:force_original_aspect_ratio=increase," +
		"gblur=sigma=10[bg];[0:v]scale=1920:1080:force_original_aspect_ratio=decrease[ov];" +
		"[bg][ov]overlay=(W-w)/2:(H-h)/2,crop=w=1920:h=1080,setpts=N*%f/TB",
}

func renderVideo(output chan error, pw *io.PipeWriter, audioFile string, imageFile string, audioLength float32, settings *types.RenderSettings) {
	defer close(output)
	filterFmt := lavfiCommands[settings.FilterType]
	var filter string
	switch settings.FilterType {
	case types.FilterTypeBlurred, types.FilterTypeSolidBlack:
		filter = fmt.Sprintf(filterFmt, audioLength)
	case types.FilterTypeSolidColor:
		filter = fmt.Sprintf(filterFmt, settings.BackgroundColor, audioLength)
	default:
		output <- fmt.Errorf("invalid filter type: %s", settings.FilterType)
		pw.Close()
	}
	if settings.Watermark {
		// TODO: use image overlay instead?
		filter += ",drawtext=text:'choonify.com':fontcolor=white:bordercolor=black:borderw=2:fontsize=1080/20:x=w-tw-20:y=20"
	}
	cmd := exec.Command("ffmpeg",
		"-loglevel", "error",
		"-y",
		"-r", "1",
		"-i", imageFile,
		"-i", audioFile,
		"-r", "30",
		"-lavfi", filter,
		"-acodec", "copy",
		"-vcodec", "libx264",
		"-qp", "0",
		"-preset", "ultrafast",
		"-f", "matroska",
		"-",
	)
	cmd.Stdout = pw
	err := cmd.Run()
	pw.CloseWithError(err)
	output <- err
}

func getYouTubeClient(ctx context.Context, channelId string) (*youtube.Service, string, error) {
	channel, err := Firestore.Collection("yt_channel_credentials").Doc(channelId).Get(ctx)
	if err != nil {
		return nil, "Could not get YouTube credentials", err
	}
	var item types.YTChannelCreds
	err = channel.DataTo(&item)
	if err != nil {
		return nil, "Could not get YouTube credentials", err
	}
	cfg := oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		Endpoint:     google.Endpoint,
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"),
		Scopes:       []string{"https://www.googleapis.com/auth/youtube.upload"},
	}
	// TODO: store token after if refreshed
	token := item.Token
	client := cfg.Client(ctx, &token)
	service, err := youtube.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		log.Printf("Failed to make youtube client: %v", err)
		return nil, "Internal error", err
	}
	return service, "", nil
}

func updateUserTable(ctx context.Context, userId string, uploadedBytes int64) error {
	ref := Firestore.Collection("users").Doc(userId)
	err := Firestore.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		doc, err := tx.Get(ref)
		if err != nil {
			return err
		}
		var user types.UserInfo
		err = doc.DataTo(&user)
		if err != nil {
			return err
		}
		uploadedToday, uploadedBytesToday := user.RealUploadedToday()
		newUploadedToday := uploadedToday + 1
		newUploadedBytesToday := uploadedBytesToday + uploadedBytes
		return tx.Update(ref, []firestore.Update{
			{
				Path:  "uploadedToday",
				Value: newUploadedToday,
			},
			{
				Path:  "uploadedBytesToday",
				Value: newUploadedBytesToday,
			},
			{
				Path:  "uploadedAllTime",
				Value: user.UploadedAllTime + 1,
			},
			{
				Path:  "uploadedBytesAllTime",
				Value: user.UploadedBytesAllTime + uploadedBytes,
			},
			{
				Path:  "lastUploaded",
				Value: time.Now().UnixMilli(),
			},
		})
	})
	return err
}

func deleteYTChannelInfo(ctx context.Context, userId string, channelId string) {
	ref := Firestore.Collection("users").Doc(userId)
	credsRef := Firestore.Collection("yt_channel_credentials").Doc(channelId)
	err := Firestore.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		doc, err := tx.Get(ref)
		if err != nil {
			return err
		}
		var user types.UserInfo
		err = doc.DataTo(&user)
		if err != nil {
			return err
		}
		channelIdx := slices.IndexFunc(user.Channels, func(channel types.YTChannelInfo) bool {
			return channel.ChannelId == channelId
		})
		if channelIdx == -1 {
			return nil
		}
		err = tx.Update(ref,
			[]firestore.Update{
				{
					Path:  "channels",
					Value: firestore.ArrayRemove(user.Channels[channelIdx]),
				},
			},
		)
		if err != nil {
			return err
		}
		return tx.Delete(credsRef)
	})
	if err != nil {
		log.Printf("Error deleting YT channel: %s", err)
	}
}

func presignGet(ctx context.Context, key string) (*string, *int64, error) {
	url, err := Bucket.SignedURL(key, &storage.SignedURLOptions{
		GoogleAccessID: os.Getenv("SERVICE_ACCOUNT_EMAIL"),
		Method:         "GET",
		Expires:        time.Now().Add(time.Hour),
	})
	if err != nil {
		return nil, nil, err
	}
	attrs, err := Bucket.Object(key).Attrs(ctx)
	if err != nil {
		return nil, nil, err
	}
	return &url, &attrs.Size, nil
}

func sendMessage(ctx context.Context, userId string, msg any) {
	_, err := Firestore.Collection("task_messages").Doc(userId).Set(ctx, msg)
	if err != nil {
		log.Printf("Error sending message: %s", err)
	}
}

func Render(w http.ResponseWriter, r *http.Request) {
	var request types.UploadBatchRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		log.Printf("Failed to decode body: %s", err)
		return
	}
	ctx := r.Context()
	youtube, msg, err := getYouTubeClient(ctx, request.ChannelId)
	if err != nil {
		log.Printf("Error getting YT client: %s", err)
	}
	if youtube == nil {
		reloadUsers := false
		if msg == "Could not get YouTube credentials" {
			deleteYTChannelInfo(ctx, request.UserId, request.ChannelId)
			reloadUsers = true
		}
		sendMessage(ctx, request.UserId, &types.ErrorMessage{
			BaseMessage: types.BaseMessage{
				Type:      "error",
				ItemId:    request.Videos[0].Id,
				Timestamp: time.Now().UnixMilli(),
			},
			Message:     msg,
			ReloadUsers: reloadUsers,
		})
		return
	}

	for _, req := range request.Videos {
		err, errMessage := handleRequest(ctx, youtube, req, request.UserId)
		if err == nil {
			continue
		}
		log.Printf("Error while uploading: %s", err)
		reloadUser := false
		gerr, ok := err.(*googleapi.Error)
		if ok {
			if gerr.Code == 401 || gerr.Code == 403 {
				deleteYTChannelInfo(ctx, request.UserId, request.ChannelId)
				reloadUser = true
			}
		}
		sendMessage(ctx, request.UserId, &types.ErrorMessage{
			BaseMessage: types.BaseMessage{
				Type:      "error",
				ItemId:    req.Id,
				Timestamp: time.Now().UnixMilli(),
			},
			Message:     errMessage,
			ReloadUsers: reloadUser,
		})
		return
	}
}

type ProgressPipeReader struct {
	*io.PipeReader
	progress        int64
	totalSize       int64
	lastSent        int64
	progressChannel chan float32
}

func (pr *ProgressPipeReader) Read(data []byte) (int, error) {
	n, err := pr.PipeReader.Read(data)

	if err == nil {
		pr.progress += int64(n)
	}

	if (float32(pr.progress)-float32(pr.lastSent))/float32(pr.totalSize) >= 0.05 {
		// send in 5% increments
		pr.progressChannel <- float32(pr.progress) / float32(pr.totalSize)
		pr.lastSent = pr.progress
	}

	return n, err
}

func (pr *ProgressPipeReader) Close() error {
	close(pr.progressChannel)
	return pr.PipeReader.Close()
}

func (pr *ProgressPipeReader) CloseWithError(err error) error {
	close(pr.progressChannel)
	return pr.PipeReader.CloseWithError(err)
}

func relayProgress(ctx context.Context, itemId string, userId string, progressChannel chan float32) {
	for prog := range progressChannel {
		// TODO: don't send unless enough time has elapsed since last write
		sendMessage(ctx, userId, &types.RenderProgressMessage{
			BaseMessage: types.BaseMessage{
				Type:      "progress",
				ItemId:    itemId,
				Timestamp: time.Now().UnixMilli(),
			},
			Percent: min(prog*100, 100),
		})
	}
}

func handleRequest(ctx context.Context, yt *youtube.Service, request types.UploadRequestData, userId string) (error, string) {
	startTime := time.Now()
	upload := &youtube.Video{
		Snippet: &youtube.VideoSnippet{
			Title:       request.Metadata.Title,
			Description: request.Metadata.Description,
			CategoryId:  request.Metadata.CategoryId,
			Tags:        request.Metadata.Tags,
		},
		Status: &youtube.VideoStatus{PrivacyStatus: request.Metadata.Visibility, MadeForKids: request.Metadata.MadeForKids},
	}
	call := yt.Videos.Insert([]string{"snippet", "status"}, upload).NotifySubscribers(request.Metadata.NotifySubscribers)

	// get presigned download URL for audio and image
	audioURL, audioSize, err := presignGet(ctx, request.AudioKey)
	if err != nil {
		return err, "Invalid audio path"
	}
	imageURL, imageSize, err := presignGet(ctx, request.ImageKey)
	if err != nil {
		return err, "Invalid image path"
	}

	pr, pw := io.Pipe()

	ffmpegOutput := make(chan error)
	go renderVideo(ffmpegOutput, pw, *audioURL, *imageURL, request.AudioLength, &request.Settings)

	progressChannel := make(chan float32, 64)
	progReader := &ProgressPipeReader{pr, 0, *audioSize + *imageSize, 0, progressChannel}
	go relayProgress(ctx, request.Id, userId, progressChannel)

	response, err := call.Media(progReader).Do()
	if err != nil {
		msg := fmt.Sprintf("Failed to upload video: %v", err)
		log.Println(msg)
		return err, msg
	}

	err = <-ffmpegOutput
	if err == nil {
		if strings.HasPrefix(request.ImageKey, "private") {
			err = Bucket.Object(request.ImageKey).Delete(ctx)
			if err != nil {
				log.Printf("Error deleting image: %s", err)
			}
		}
		err = Bucket.Object(request.AudioKey).Delete(ctx)
		if err != nil {
			log.Printf("Error deleting audio: %s", err)
		}
		sendMessage(ctx, userId, types.RenderSuccessMessage{
			BaseMessage: types.BaseMessage{
				Type:      "success",
				ItemId:    request.Id,
				Timestamp: time.Now().UnixMilli(),
			},
			VideoUrl: fmt.Sprintf("https://youtube.com/watch?v=%s", response.Id),
			Elapsed:  time.Since(startTime).Seconds(),
		})
		// update user stats
		err = updateUserTable(ctx, userId, *audioSize+*imageSize)
		if err != nil {
			log.Printf("Error updating user: %s", err)
		}
		return nil, ""
	}
	exiterr, ok := err.(*exec.ExitError)
	var msg string
	if ok {
		msg = string(exiterr.Stderr)
	} else {
		msg = err.Error()
	}
	return err, fmt.Sprintf("FFmpeg error: %s", msg)
}
