package delete

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"choonify.com/backend/core/log"
	"choonify.com/backend/core/types"
	"cloud.google.com/go/firestore"
	"cloud.google.com/go/logging"
	"cloud.google.com/go/storage"
	firebase "firebase.google.com/go"
	"firebase.google.com/go/auth"
	"github.com/GoogleCloudPlatform/functions-framework-go/funcframework"
	"github.com/GoogleCloudPlatform/functions-framework-go/functions"
	"github.com/stripe/stripe-go/v81"
	"github.com/stripe/stripe-go/v81/customer"
)

var Firestore *firestore.Client
var Firebase *firebase.App
var Bucket *storage.BucketHandle
var Auth *auth.Client

func InitStripe() {
	stripe.Key = os.Getenv("STRIPE_API_KEY")
}

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
	log.InitLogging("delete")
	InitFirebase()
	InitStripe()
	functions.HTTP("Delete", Delete)
}

type deleteRequestBody struct {
	UserId string `json:"userId"`
}

func Delete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var request deleteRequestBody
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		log.LogError(logging.Alert, "Failed to decode body", err, nil)
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
		if user.CustomerId != "" {
			// delete stripe customer
			_, err := customer.Del(user.CustomerId, &stripe.CustomerParams{})
			if err != nil {
				return err
			}
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
		log.LogError(logging.Alert, "Failed to delete documents", err, &map[string]string{
			"userId": userId,
		})
	}
	// delete cloud storage for user
	err = Bucket.Object(fmt.Sprintf("default/%s/default", userId)).Delete(ctx)
	if err != nil {
		log.LogError(logging.Info, "Failed to delete objects", err, &map[string]string{
			"userId": userId,
		})
	}
	// remove from idp/firebase auth
	err = Auth.DeleteUser(ctx, userId)
	if err != nil {
		log.LogError(logging.Alert, "Failed to delete IDP user", err, &map[string]string{
			"userId": userId,
		})
	}
}
