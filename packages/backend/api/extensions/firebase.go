package extensions

import (
	"context"
	"encoding/json"
	"os"

	cloudtasks "cloud.google.com/go/cloudtasks/apiv2"
	"cloud.google.com/go/firestore"
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
	Storage, err = Firebase.Storage(ctx)
	if err != nil {
		panic(err)
	}
	Bucket, err = Storage.Bucket(os.Getenv("FIREBASE_STORAGE_BUCKET"))
	if err != nil {
		panic(err)
	}
	Tasks, err = cloudtasks.NewClient(ctx)
	if err != nil {
		panic(err)
	}
}
