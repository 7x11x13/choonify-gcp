package extensions

import (
	"context"
	"os"

	"choonify.com/backend/core/log"
	cloudtasks "cloud.google.com/go/cloudtasks/apiv2"
	"cloud.google.com/go/firestore"
	"cloud.google.com/go/logging"
	"cloud.google.com/go/storage"
	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	fstorage "firebase.google.com/go/v4/storage"
)

var Firestore *firestore.Client
var Firebase *firebase.App
var Storage *fstorage.Client
var Bucket *storage.BucketHandle
var Auth *auth.Client
var Tasks *cloudtasks.Client

func InitGCP() {
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
	Storage, err = Firebase.Storage(ctx)
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
	Tasks, err = cloudtasks.NewClient(ctx)
	if err != nil {
		log.LogError(logging.Emergency, "Failed to create tasks client", err, nil)
		panic(err)
	}
}
