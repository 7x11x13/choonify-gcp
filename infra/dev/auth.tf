resource "google_identity_platform_config" "dev" {
  provider                   = google-beta
  project                    = google_firebase_project.dev.project
  autodelete_anonymous_users = true
  sign_in {
    anonymous {
      enabled = false
    }
    email {
      enabled = false
    }
    phone_number {
      enabled = false
    }
  }

  blocking_functions {
    forward_inbound_credentials {
      access_token  = true
      id_token      = true
      refresh_token = true
    }

    triggers {
      event_type   = "beforeSignIn"
      function_uri = google_cloudfunctions2_function.before_sign_in.url
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
