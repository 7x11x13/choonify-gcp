resource "google_service_account" "backend_admin" {
  provider   = google-beta
  project    = google_firebase_project.dev.project
  account_id = "backend-admin"
}

resource "google_project_iam_member" "firebase_admin_binding" {
  provider = google-beta
  project  = google_firebase_project.dev.project
  role     = "roles/firebase.admin"
  member   = "serviceAccount:${google_service_account.backend_admin.email}"
}

resource "google_project_iam_member" "task_queue_binding" {
  provider = google-beta
  project  = google_firebase_project.dev.project
  role     = "roles/cloudtasks.enqueuer"
  member   = "serviceAccount:${google_service_account.backend_admin.email}"
}

resource "google_project_iam_member" "signer_binding" {
  provider = google-beta
  project  = google_firebase_project.dev.project
  role     = "roles/iam.serviceAccountTokenCreator"
  member   = "serviceAccount:${google_service_account.backend_admin.email}"
}

resource "google_project_iam_member" "user_binding" {
  provider = google-beta
  project  = google_firebase_project.dev.project
  role     = "roles/iam.serviceAccountUser"
  member   = "serviceAccount:${google_service_account.backend_admin.email}"
}

output "SERVICE_ACCOUNT_EMAIL" {
  value = google_service_account.backend_admin.email
}
