package extensions

import (
	"context"

	"cloud.google.com/go/firestore"
	run "cloud.google.com/go/run/apiv2"
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
var Jobs *run.JobsClient

func InitFirebase() {
	var err error
	ctx := context.Background()
	Firebase, err = firebase.NewApp(ctx, nil)
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
	Storage, err = Firebase.Storage(ctx)
	if err != nil {
		panic(err)
	}
	Bucket, err = Storage.DefaultBucket()
	if err != nil {
		panic(err)
	}
	Jobs, err = run.NewJobsClient(ctx)
	if err != nil {
		panic(err)
	}
}
