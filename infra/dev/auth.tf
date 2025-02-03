resource "google_identity_platform_config" "dev" {
  provider                   = google-beta
  project                    = google_firebase_project.dev.project
  autodelete_anonymous_users = true
  sign_in {
    anonymous {
      enabled = true
    }
  }
  depends_on = [google_firebase_project.dev]
}

resource "google_identity_platform_default_supported_idp_config" "dev" {
  provider      = google-beta
  project       = google_firebase_project.dev.project
  enabled       = true
  idp_id        = "google.com"
  client_id     = var.google_client_id
  client_secret = var.google_client_secret
}


resource "google_storage_bucket" "gcf_source" {
  provider                    = google-beta
  project                     = google_firebase_project.dev.project
  name                        = "choonify-dev-gcf-source"
  location                    = var.region
  uniform_bucket_level_access = true
}

data "archive_file" "sign_in_source" {
  type             = "zip"
  source_dir       = "${path.module}/../../packages/backend/functions/signin"
  output_file_mode = "0666"
  output_path      = "${path.module}/../../packages/backend/functions/dist/signin.zip"
}

resource "google_storage_bucket_object" "sign_in_source" {
  provider = google-beta
  name     = "signin-${data.archive_file.sign_in_source.output_md5}.zip"
  bucket   = google_storage_bucket.gcf_source.name
  source   = data.archive_file.sign_in_source.output_path
}

resource "google_cloudfunctions_function" "sign_in" {
  provider    = google-beta
  project     = google_firebase_project.dev.project
  region      = var.region
  name        = "sign-in"
  description = "Firebase auth sign in function"

  event_trigger {
    event_type = "providers/firebase.auth/eventTypes/user.create"
    resource   = google_firebase_project.dev.id
  }

  runtime               = "go123"
  entry_point           = "OnSignIn"
  source_archive_bucket = google_storage_bucket_object.sign_in_source.bucket
  source_archive_object = google_storage_bucket_object.sign_in_source.name
  max_instances         = 1
  available_memory_mb   = 256
  timeout               = 60

  environment_variables = {
    FIREBASE_CONFIG = var.firebase_config
  }
}
