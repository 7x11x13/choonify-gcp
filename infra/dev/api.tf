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
  repo = format("%s-docker.pkg.dev/%s/%s", google_artifact_registry_repository.dev.location, google_artifact_registry_repository.dev.project, google_artifact_registry_repository.dev.repository_id)
}

resource "ko_build" "api" {
  provider    = ko
  working_dir = "${path.module}/../../packages/backend/api"
  importpath  = "choonify.com/backend/api"
}

resource "google_cloud_run_v2_service" "dev" {
  provider = google-beta
  project  = google_firebase_project.dev.project
  name     = "api"
  location = var.region

  template {
    service_account                  = google_service_account.backend_admin.email
    max_instance_request_concurrency = 500
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
        name  = "TASK_QUEUE_NAME"
        value = google_cloud_tasks_queue.dev.id
      }
      env {
        name  = "RENDER_FUNCTION_URL"
        value = google_cloudfunctions2_function.render.url
      }
      env {
        name  = "DELETE_FUNCTION_URL"
        value = google_cloudfunctions2_function.delete.url
      }
      env {
        name  = "FIREBASE_STORAGE_BUCKET"
        value = google_storage_bucket.dev.name
      }
      env {
        name  = "SERVICE_ACCOUNT_EMAIL"
        value = google_service_account.backend_admin.email
      }
      env {
        name  = "STRIPE_API_KEY"
        value = var.stripe_api_key
      }
      env {
        name  = "STRIPE_FREE_TIER_PRICE"
        value = stripe_price.free_monthly.id
      }
      env {
        name  = "STRIPE_WEBHOOK_SECRET"
        value = var.stripe_webhook_secret
      }
      env {
        name  = "PROJECT_ID"
        value = google_firebase_project.dev.id
      }
    }
  }

  depends_on = [google_project_service.dev-init]
}

data "archive_file" "render_source" {
  type             = "zip"
  source_dir       = "${path.module}/../../packages/backend/functions/render"
  output_file_mode = "0666"
  output_path      = "${path.module}/../../packages/backend/functions/dist/render.zip"
}

resource "google_storage_bucket_object" "render_source" {
  provider = google-beta
  name     = "render-${data.archive_file.render_source.output_md5}.zip"
  bucket   = google_storage_bucket.gcf_source.name
  source   = data.archive_file.render_source.output_path
}

resource "google_cloudfunctions2_function" "render" {
  provider    = google-beta
  project     = google_firebase_project.dev.project
  location    = var.region
  name        = "render"
  description = "Render and upload function"

  build_config {
    runtime     = "go123"
    entry_point = "Render"

    source {
      storage_source {
        bucket = google_storage_bucket_object.render_source.bucket
        object = google_storage_bucket_object.render_source.name
      }
    }
  }

  service_config {
    service_account_email = google_service_account.backend_admin.email
    available_memory      = "4096M"
    timeout_seconds       = 1800

    environment_variables = {
      SERVICE_ACCOUNT_EMAIL   = google_service_account.backend_admin.email
      FIREBASE_STORAGE_BUCKET = google_storage_bucket.dev.name
      GOOGLE_CLIENT_ID        = var.google_client_id
      GOOGLE_CLIENT_SECRET    = var.google_client_secret
      GOOGLE_REDIRECT_URL     = google_firebase_hosting_site.dev.default_url
    }
  }
}

data "archive_file" "delete_source" {
  type             = "zip"
  source_dir       = "${path.module}/../../packages/backend/functions/delete"
  output_file_mode = "0666"
  output_path      = "${path.module}/../../packages/backend/functions/dist/delete.zip"
}

resource "google_storage_bucket_object" "delete_source" {
  provider = google-beta
  name     = "delete-${data.archive_file.delete_source.output_md5}.zip"
  bucket   = google_storage_bucket.gcf_source.name
  source   = data.archive_file.delete_source.output_path
}

resource "google_cloudfunctions2_function" "delete" {
  provider    = google-beta
  project     = google_firebase_project.dev.project
  location    = var.region
  name        = "delete"
  description = "User deletion function"

  build_config {
    runtime     = "go123"
    entry_point = "Delete"

    source {
      storage_source {
        bucket = google_storage_bucket_object.delete_source.bucket
        object = google_storage_bucket_object.delete_source.name
      }
    }
  }

  service_config {
    service_account_email = google_service_account.backend_admin.email
    max_instance_count    = 1
    available_memory      = "256M"
    timeout_seconds       = 60

    environment_variables = {
      FIREBASE_STORAGE_BUCKET = google_storage_bucket.dev.name
      STRIPE_API_KEY          = var.stripe_api_key
    }
  }
}

resource "google_cloud_tasks_queue" "dev" {
  provider = google-beta
  project  = google_firebase_project.dev.project
  location = var.region
  name     = "api-tasks"

  retry_config {
    max_attempts = 1
  }

  http_target {
    oidc_token {
      service_account_email = google_service_account.backend_admin.email
    }
  }

  depends_on = [google_project_service.dev-init]
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

output "TASK_QUEUE_NAME" {
  value = google_cloud_tasks_queue.dev.id
}

output "RENDER_FUNCTION_URL" {
  value = google_cloudfunctions2_function.render.url
}

output "DELETE_FUNCTION_URL" {
  value = google_cloudfunctions2_function.delete.url
}
