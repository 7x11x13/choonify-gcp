resource "google_firestore_database" "dev" {
  provider = google-beta
  project  = google_firebase_project.dev.project
  name     = "(default)"

  location_id = var.region

  type             = "FIRESTORE_NATIVE"
  concurrency_mode = "OPTIMISTIC"

  depends_on = [google_project_service.dev-init]
}

resource "google_storage_bucket" "dev" {
  provider                    = google-beta
  project                     = google_firebase_project.dev.project
  name                        = "${google_firebase_project.dev.project}-ffmpeg-input"
  location                    = var.region
  uniform_bucket_level_access = true

  depends_on = [google_project_service.dev-init]

  lifecycle_rule {
    condition {
      age            = 1
      matches_prefix = ["private/"]
    }
    action {
      type = "Delete"
    }
  }

  cors {
    origin          = ["*"]
    method          = ["GET", "PUT", "DELETE", "OPTIONS"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }
}

resource "google_firebase_storage_bucket" "dev" {
  provider  = google-beta
  project   = google_firebase_project.dev.project
  bucket_id = google_storage_bucket.dev.id

  depends_on = [google_storage_bucket.dev]
}

resource "google_storage_bucket" "gcf_source" {
  provider                    = google-beta
  project                     = google_firebase_project.dev.project
  name                        = "${google_firebase_project.dev.project}-gcf-source"
  location                    = var.region
  uniform_bucket_level_access = true
}

output "FIREBASE_STORAGE_BUCKET" {
  value = google_storage_bucket.dev.name
}
