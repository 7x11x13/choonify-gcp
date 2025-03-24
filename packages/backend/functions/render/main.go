package render

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"slices"
	"strings"
	"time"

	"choonify.com/backend/core/log"
	"choonify.com/backend/core/types"
	cloudtasks "cloud.google.com/go/cloudtasks/apiv2"
	"cloud.google.com/go/firestore"
	"cloud.google.com/go/logging"
	"cloud.google.com/go/storage"
	firebase "firebase.google.com/go"
	"firebase.google.com/go/auth"
	"github.com/GoogleCloudPlatform/functions-framework-go/funcframework"
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
		log.LogError(logging.Emergency, "Failed to create Firebase app", err, &map[string]string{
			"FIREBASE_CONFIG": os.Getenv("FIREBASE_CONFIG"),
		})
		panic(err)
	}
	Auth, err = Firebase.Auth(ctx)
	if err != nil {
		log.LogError(logging.Emergency, "Failed to create Firebase auth client", err, &map[string]string{
			"FIREBASE_CONFIG": os.Getenv("FIREBASE_CONFIG"),
		})
		panic(err)
	}
	Firestore, err = Firebase.Firestore(ctx)
	if err != nil {
		log.LogError(logging.Emergency, "Failed to create Firebase firestore client", err, &map[string]string{
			"FIREBASE_CONFIG": os.Getenv("FIREBASE_CONFIG"),
		})
		panic(err)
	}
	Storage, err := Firebase.Storage(ctx)
	if err != nil {
		log.LogError(logging.Emergency, "Failed to create Firebase storage client", err, &map[string]string{
			"FIREBASE_CONFIG": os.Getenv("FIREBASE_CONFIG"),
		})
		panic(err)
	}
	Bucket, err = Storage.Bucket(os.Getenv("FIREBASE_STORAGE_BUCKET"))
	if err != nil {
		log.LogError(logging.Emergency, "Failed to create Firebase bucket", err, &map[string]string{
			"FIREBASE_CONFIG":         os.Getenv("FIREBASE_CONFIG"),
			"FIREBASE_STORAGE_BUCKET": os.Getenv("FIREBASE_STORAGE_BUCKET"),
		})
		panic(err)
	}
}

func init() {
	if false {
		funcframework.Start("foo")
	}
	log.InitLogging("render")
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
	cmd.Env = []string{
		fmt.Sprintf("PATH=%s", os.Getenv("PATH")),
	}
	cmd.Stdout = pw
	err := cmd.Run()
	pw.CloseWithError(err)
	output <- err
}

func getYouTubeClient(ctx context.Context, channelId string) (*youtube.Service, string, error) {
	channel, err := Firestore.Collection("yt_channel_credentials").Doc(channelId).Get(ctx)
	if err != nil {
		return nil, "api.render.credentials-not-found", err
	}
	var item types.YTChannelCreds
	err = channel.DataTo(&item)
	if err != nil {
		log.LogError(logging.Error, "Failed to convert credentials item", err, &map[string]string{
			"channelId": channelId,
		})
		return nil, "api.render.internal-error", err
	}
	cfg := oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		Endpoint:     google.Endpoint,
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"),
		Scopes:       []string{"https://www.googleapis.com/auth/youtube.upload"},
	}
	token := item.Token
	client := cfg.Client(ctx, &token)
	service, err := youtube.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		log.LogError(logging.Error, "Failed to make youtube client", err, &map[string]string{
			"channelId": channelId,
			"config":    fmt.Sprintf("%+v", cfg),
			"token":     fmt.Sprintf("%+v", token),
		})
		return nil, "api.render.internal-error", err
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

func handleInvalidCredentials(ctx context.Context, userId string, channelId string) bool {
	// if primary channel, do nothing and tell them to re-log
	// otherwise, unlink channel and tell them to link it again
	ref := Firestore.Collection("users").Doc(userId)
	credsRef := Firestore.Collection("yt_channel_credentials").Doc(channelId)
	var isPrimary bool
	err := Firestore.RunTransaction(ctx, func(c context.Context, tx *firestore.Transaction) error {
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
		isPrimary = user.Channels[channelIdx].Primary
		if !isPrimary {
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
			err = tx.Delete(credsRef)
			if err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		log.LogError(logging.Alert, "Failed to handle invalid credentials", err, &map[string]string{
			"userId":    userId,
			"channelId": channelId,
		})
	}
	return isPrimary
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
		log.LogError(logging.Error, "Error sending message", err, &map[string]string{
			"userId": userId,
			"msg":    fmt.Sprintf("%+v", msg),
		})
	}
}

func setNotUploading(ctx context.Context, userId string) {
	_, err := Firestore.Collection("is_rendering").Doc(userId).Delete(ctx)
	if err != nil {
		log.LogError(logging.Alert, "Failed to delete is_rendering", err, &map[string]string{
			"userId": userId,
		})
	}
}

func Render(w http.ResponseWriter, r *http.Request) {
	var request types.UploadBatchRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		log.LogError(logging.Alert, "Failed to decode body", err, nil)
		return
	}
	ctx := r.Context()
	defer setNotUploading(ctx, request.UserId)
	youtube, msg, err := getYouTubeClient(ctx, request.ChannelId)
	if err != nil {
		log.LogError(logging.Error, "Failed to get youtube client", err, nil)
	}
	if youtube == nil {
		reloadUsers := false
		if msg == "api.render.credentials-not-found" {
			isPrimary := handleInvalidCredentials(ctx, request.UserId, request.ChannelId)
			if isPrimary {
				msg = "api.render.credentials-not-found-primary"
			}
			reloadUsers = !isPrimary
		}
		sendMessage(ctx, request.UserId, &types.ErrorMessage{
			BaseMessage: types.BaseMessage{
				Type:      "error",
				ItemId:    request.Videos[0].Id,
				Timestamp: time.Now().UnixMilli(),
			},
			Message: types.ErrorBody{
				I18NKey: msg,
			},
			ReloadUsers: reloadUsers,
		})
		return
	}

	for _, req := range request.Videos {
		errMessage, err := handleRequest(ctx, youtube, req, request.UserId)
		if err == nil {
			continue
		}
		log.LogError(logging.Error, "Could not upload video", err, &map[string]string{
			"request": fmt.Sprintf("%+v", req),
		})
		reloadUsers := false
		gerr, ok := err.(*googleapi.Error)
		if ok {
			log.LogError(logging.Error, "googleapi error", err, nil)
			if gerr.Code == 401 || gerr.Code == 403 {
				isPrimary := handleInvalidCredentials(ctx, request.UserId, request.ChannelId)
				if isPrimary {
					errMessage.I18NKey = "api.render.yt-auth-error-primary"
				} else {
					errMessage.I18NKey = "api.render.yt-auth-error"
				}
				reloadUsers = !isPrimary
			}
		}
		sendMessage(ctx, request.UserId, &types.ErrorMessage{
			BaseMessage: types.BaseMessage{
				Type:      "error",
				ItemId:    req.Id,
				Timestamp: time.Now().UnixMilli(),
			},
			Message:     *errMessage,
			ReloadUsers: reloadUsers,
		})
		return
	}
}

type ProgressPipeReader struct {
	*io.PipeReader
	progress          int64
	totalSize         int64
	lastSentProgress  int64
	lastSentTimestamp int64
	progressChannel   chan float32
}

func (pr *ProgressPipeReader) Read(data []byte) (int, error) {
	n, err := pr.PipeReader.Read(data)

	if err == nil {
		pr.progress += int64(n)
	}

	if (float32(pr.progress)-float32(pr.lastSentProgress))/float32(pr.totalSize) >= 0.05 && pr.lastSentTimestamp < time.Now().UnixMilli()-500 {
		// send in 5% increments or 0.5 second increments
		pr.progressChannel <- float32(pr.progress) / float32(pr.totalSize)

		pr.lastSentProgress = pr.progress
		pr.lastSentTimestamp = time.Now().Unix()
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

func handleRequest(ctx context.Context, yt *youtube.Service, request types.UploadRequestData, userId string) (*types.ErrorBody, error) {
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
		return &types.ErrorBody{
			I18NKey: "validate.invalid-audio-path",
		}, err
	}
	imageURL, imageSize, err := presignGet(ctx, request.ImageKey)
	if err != nil {
		return &types.ErrorBody{
			I18NKey: "validate.invalid-image-path",
		}, err
	}

	pr, pw := io.Pipe()

	ffmpegOutput := make(chan error)
	go renderVideo(ffmpegOutput, pw, *audioURL, *imageURL, request.AudioLength, &request.Settings)

	progressChannel := make(chan float32, 64)
	progReader := &ProgressPipeReader{pr, 0, *audioSize + *imageSize, 0, 0, progressChannel}
	go relayProgress(ctx, request.Id, userId, progressChannel)

	// TODO: check if accesstoken changes and store it
	response, err := call.Media(progReader).Do()
	if err != nil {
		msg := fmt.Sprintf("%s", err)
		return &types.ErrorBody{
			I18NKey: "api.render.yt-error",
			Data: map[string]any{
				"msg": msg,
			},
		}, err
	}

	err = <-ffmpegOutput
	if err == nil {
		if strings.HasPrefix(request.ImageKey, "private") {
			err = Bucket.Object(request.ImageKey).Delete(ctx)
			if err != nil {
				log.LogError(logging.Error, "Could not delete image", err, &map[string]string{
					"imageKey": request.ImageKey,
				})
			}
		}
		err = Bucket.Object(request.AudioKey).Delete(ctx)
		if err != nil {
			log.LogError(logging.Error, "Could not delete audio", err, &map[string]string{
				"audioKey": request.AudioKey,
			})
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
			log.LogError(logging.Error, "Could not update user stats", err, &map[string]string{
				"userId": userId,
			})
		}
		return nil, nil
	}
	exiterr, ok := err.(*exec.ExitError)
	var msg string
	if ok {
		msg = string(exiterr.Stderr)
	} else {
		msg = err.Error()
	}
	return &types.ErrorBody{
		I18NKey: "api.render.ffmpeg-error",
		Data: map[string]any{
			"msg": msg,
		},
	}, err
}
