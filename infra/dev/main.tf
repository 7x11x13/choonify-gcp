terraform {
  required_providers {
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "6.18.0"
    }
    ko = {
      source  = "ko-build/ko"
      version = "0.0.16"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "2.7.0"
    }
  }
}

provider "google-beta" {
  alias                 = "no_user_project_override"
  user_project_override = false
}

provider "google-beta" {
  user_project_override = true
}

resource "google_project" "dev" {
  provider = google-beta.no_user_project_override

  name            = "Choonify Dev"
  project_id      = "choonify-dev"
  billing_account = var.billing_account

  labels = {
    "firebase" = "enabled"
  }
}

resource "google_project_service" "dev-init" {
  provider = google-beta.no_user_project_override
  project  = google_project.dev.project_id
  for_each = toset([
    "serviceusage.googleapis.com",
    "firebase.googleapis.com",
    "cloudbilling.googleapis.com",
    "firestore.googleapis.com",
    "firebasestorage.googleapis.com",
    "firebaserules.googleapis.com",
    "identitytoolkit.googleapis.com",
    "artifactregistry.googleapis.com",
    "run.googleapis.com",
    "cloudfunctions.googleapis.com",
    "youtube.googleapis.com",
    "cloudbuild.googleapis.com",
    "eventarc.googleapis.com",
    "cloudtasks.googleapis.com",
  ])
  service = each.key

  disable_on_destroy = false
}

resource "google_firebase_project" "dev" {
  provider = google-beta
  project  = google_project.dev.project_id

  depends_on = [google_project_service.dev-init]
}

resource "google_firebase_web_app" "dev" {
  provider     = google-beta
  project      = google_firebase_project.dev.project
  display_name = "Choonify Web"

  deletion_policy = "DELETE"
}

resource "google_firebase_hosting_site" "dev" {
  provider = google-beta
  project  = google_firebase_project.dev.project
  site_id  = "choonify-dev-site"
  app_id   = google_firebase_web_app.dev.app_id
}

data "google_firebase_web_app_config" "dev" {
  provider   = google-beta
  project    = google_firebase_project.dev.project
  web_app_id = google_firebase_web_app.dev.app_id

  depends_on = [google_firebase_web_app.dev]
}

output "firebase_site" {
  value = google_firebase_hosting_site.dev.site_id
}

output "firebase_config" {
  value = data.google_firebase_web_app_config.dev
}
