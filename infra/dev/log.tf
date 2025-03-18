# TODO: make this prod-only
resource "google_monitoring_notification_channel" "email-me" {
  project      = google_firebase_project.dev.project
  display_name = "Email Me"
  type         = "email"
  labels = {
    email_address = "admin@choonify.com"
  }

}

resource "google_monitoring_alert_policy" "loglevel" {
  project      = google_firebase_project.dev.project
  display_name = "Loglevel alert policy"
  combiner     = "OR"
  conditions {
    display_name = "Loglevel alert"
    condition_matched_log {
      filter = "severity>=CRITICAL"
    }
  }

  notification_channels = [google_monitoring_notification_channel.email-me.name]
  alert_strategy {
    notification_rate_limit {
      period = "300s"
    }
  }
}

resource "google_monitoring_alert_policy" "tasks" {
  project      = google_firebase_project.dev.project
  display_name = "Tasks alert policy"
  combiner     = "OR"
  conditions {
    display_name = "Failed tasks"
    condition_matched_log {
      filter = "resource.type=cloud_run_revision severity>=WARNING"
    }
  }

  notification_channels = [google_monitoring_notification_channel.email-me.name]
  alert_strategy {
    notification_rate_limit {
      period = "300s"
    }
  }
}
