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

output "service_account_email" {
  value = google_service_account.backend_admin.email
}
