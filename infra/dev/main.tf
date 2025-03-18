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
    stripe = {
      source  = "lukasaron/stripe"
      version = "3.3.0"
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

provider "stripe" {
  api_key = var.stripe_api_key
}

data "google_organization" "org" {
  provider = google-beta
  domain   = "choonify.com"
}

resource "google_project" "dev" {
  provider = google-beta.no_user_project_override

  name            = "Choonify Dev"
  project_id      = "choonify-dev"
  billing_account = var.billing_account
  org_id          = data.google_organization.org.org_id

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
  site_id  = google_firebase_project.dev.project
  app_id   = google_firebase_web_app.dev.app_id
}

data "google_firebase_web_app_config" "dev" {
  provider   = google-beta
  project    = google_firebase_project.dev.project
  web_app_id = google_firebase_web_app.dev.app_id

  depends_on = [google_firebase_web_app.dev]
}

output "FIREBASE_CONFIG" {
  value = replace(jsonencode(data.google_firebase_web_app_config.dev), data.google_firebase_web_app_config.dev.storage_bucket, google_storage_bucket.dev.name)
}

output "PROJECT_ID" {
  value = google_firebase_project.dev.id
}

output "REGION" {
  value = var.region
}
