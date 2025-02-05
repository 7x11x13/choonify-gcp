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
  name                        = "ffmpeg-input"
  location                    = var.region
  uniform_bucket_level_access = true

  depends_on = [google_project_service.dev-init]
}

resource "google_firebase_storage_bucket" "dev" {
  provider  = google-beta
  project   = google_firebase_project.dev.project
  bucket_id = google_storage_bucket.dev.id

  depends_on = [google_storage_bucket.dev]
}

resource "google_firebaserules_ruleset" "dev" {
  provider = google-beta
  project  = google_firebase_project.dev.project
  source {
    files {
      name    = "firestore.rules"
      content = file("firestore.rules")
    }
  }

  depends_on = [
    google_firestore_database.dev,
  ]
}

resource "google_firebaserules_release" "dev" {
  provider     = google-beta
  name         = "cloud.firestore"
  ruleset_name = google_firebaserules_ruleset.dev.name
  project      = google_firebase_project.dev.project
}

resource "google_storage_bucket" "gcf_source" {
  provider                    = google-beta
  project                     = google_firebase_project.dev.project
  name                        = "${google_firebase_project.dev.project}-gcf-source"
  location                    = var.region
  uniform_bucket_level_access = true
}
