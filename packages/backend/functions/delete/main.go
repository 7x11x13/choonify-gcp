package delete

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"choonify.com/backend/functions/delete/types"
	"cloud.google.com/go/firestore"
	"cloud.google.com/go/storage"
	firebase "firebase.google.com/go"
	"firebase.google.com/go/auth"
	"github.com/GoogleCloudPlatform/functions-framework-go/functions"
)

var Firestore *firestore.Client
var Firebase *firebase.App
var Bucket *storage.BucketHandle
var Auth *auth.Client

type firebaseConfigObject struct {
	ApiKey            string `json:"api_key"`
	AuthDomain        string `json:"auth_domain"`
	DatabaseUrl       string `json:"database_url"`
	Id                string `json:"id"`
	LocationId        string `json:"location_id"`
	MeasurementId     string `json:"measurement_id"`
	MessagingSenderId string `json:"messaging_sender_id"`
	Project           string `json:"project"`
	StorageBucket     string `json:"storage_bucket"`
	WebAppId          string `json:"web_app_id"`
}

func loadFirebaseConfig() *firebase.Config {
	var obj firebaseConfigObject
	err := json.Unmarshal([]byte(os.Getenv("FIREBASE_CONFIG")), &obj)
	if err != nil {
		panic(err)
	}
	return &firebase.Config{
		DatabaseURL:   obj.DatabaseUrl,
		ProjectID:     obj.Project,
		StorageBucket: obj.StorageBucket,
	}
}

func InitFirebase() {
	var err error
	ctx := context.Background()
	Firebase, err = firebase.NewApp(ctx, loadFirebaseConfig())
	if err != nil {
		panic(err)
	}
	Auth, err = Firebase.Auth(ctx)
	if err != nil {
		panic(err)
	}
	Firestore, err = Firebase.Firestore(ctx)
	if err != nil {
		panic(err)
	}
	storage, err := Firebase.Storage(ctx)
	if err != nil {
		panic(err)
	}
	Bucket, err = storage.Bucket(os.Getenv("FIREBASE_STORAGE_BUCKET"))
	if err != nil {
		panic(err)
	}
}

func init() {
	InitFirebase()
	functions.HTTP("Delete", Delete)
}

type deleteRequestBody struct {
	UserId string `json:"userId"`
}

func Delete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var request deleteRequestBody
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		log.Printf("Failed to decode body: %s", err)
		return
	}
	userId := request.UserId
	err := Firestore.RunTransaction(ctx, func(ctx context.Context, t *firestore.Transaction) error {
		var user types.UserInfo
		userRef := Firestore.Collection("users").Doc(userId)
		doc, err := t.Get(userRef)
		if err != nil {
			return err
		}
		err = doc.DataTo(&user)
		if err != nil {
			return err
		}
		for _, channel := range user.Channels {
			err = t.Delete(Firestore.Collection("yt_channel_credentials").Doc(channel.ChannelId))
			if err != nil {
				return err
			}
		}
		for _, collection := range []string{"users", "sessions", "task_messages"} {
			err = t.Delete(Firestore.Collection(collection).Doc(userId))
			if err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		log.Printf("Failed to delete documents: %s", err)
	}
	// delete cloud storage for user
	err = Bucket.Object(fmt.Sprintf("default/%s/default", userId)).Delete(ctx)
	if err != nil {
		log.Printf("Failed to delete object: %s", err)
	}
	// remove from idp/firebase auth
	err = Auth.DeleteUser(ctx, userId)
	if err != nil {
		log.Printf("Failed to delete user: %s", err)
	}
}
