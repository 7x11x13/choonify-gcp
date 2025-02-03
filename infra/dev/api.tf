resource "google_artifact_registry_repository" "dev" {
  provider      = google-beta
  project       = google_firebase_project.dev.project
  location      = var.region
  repository_id = "choonify"
  format        = "DOCKER"

  cleanup_policy_dry_run = false

  cleanup_policies {
    id     = "delete-old"
    action = "DELETE"
    condition {
      older_than = "5m"
    }
  }
  cleanup_policies {
    id     = "keep-minimum-versions"
    action = "KEEP"
    most_recent_versions {
      keep_count = 1
    }
  }

  depends_on = [google_project_service.dev-init]
}

provider "ko" {
  #   repo       = "us-west1-docker.pkg.dev/choonify-dev/choonify"
  repo = format("%s-docker.pkg.dev/%s/%s", google_artifact_registry_repository.dev.location, google_artifact_registry_repository.dev.project, google_artifact_registry_repository.dev.repository_id)
}

resource "ko_build" "api" {
  provider    = ko
  working_dir = "../../packages/backend/api"
  importpath  = "choonify.com/api"
}

resource "ko_build" "render" {
  provider    = ko
  working_dir = "../../packages/backend/render"
  importpath  = "choonify.com/render"
}

// TODO: permissions for cloud storage, firestore, cloud run jobs
resource "google_cloud_run_v2_service" "dev" {
  provider = google-beta
  project  = google_firebase_project.dev.project
  name     = "api"
  location = var.region

  template {
    containers {
      image = ko_build.api.image_ref
      env {
        name  = "GIN_MODE"
        value = "debug"
      }
      env {
        name  = "GOOGLE_CLIENT_ID"
        value = var.google_client_id
      }
      env {
        name  = "GOOGLE_CLIENT_SECRET"
        value = var.google_client_secret
      }
      env {
        name  = "GOOGLE_REDIRECT_URL"
        value = google_firebase_hosting_site.dev.default_url
      }
      env {
        name  = "RENDER_JOB_NAME"
        value = format("projects/%s/locations/%s/jobs/%s", google_firebase_project.dev.project, var.region, google_cloud_run_v2_job.dev.name)
      }
      env {
        name  = "FIREBASE_CONFIG"
        value = var.firebase_config
      }
    }
  }

  depends_on = [google_project_service.dev-init, google_firebase_hosting_site.dev, google_cloud_run_v2_job.dev]
}

// TODO: permissions for cloud storage bucket and firestore
resource "google_cloud_run_v2_job" "dev" {
  provider = google-beta
  project  = google_firebase_project.dev.project
  name     = "render"
  location = var.region

  template {
    template {
      containers {
        image = ko_build.render.image_ref

        env {
          name  = "GOOGLE_CLIENT_ID"
          value = var.google_client_id
        }
        env {
          name  = "GOOGLE_CLIENT_SECRET"
          value = var.google_client_secret
        }
        env {
          name  = "GOOGLE_REDIRECT_URL"
          value = google_firebase_hosting_site.dev.default_url
        }
      }
    }
  }

  depends_on = [google_project_service.dev-init, google_firebase_hosting_site.dev]
}

data "google_iam_policy" "noauth" {
  binding {
    role = "roles/run.invoker"
    members = [
      "allUsers",
    ]
  }
}

resource "google_cloud_run_service_iam_policy" "noauth" {
  location = google_cloud_run_v2_service.dev.location
  project  = google_cloud_run_v2_service.dev.project
  service  = google_cloud_run_v2_service.dev.name

  policy_data = data.google_iam_policy.noauth.policy_data
}

output "urls" {
  value = google_cloud_run_v2_service.dev.urls
}

output "service_name" {
  value = google_cloud_run_v2_service.dev.name
}
