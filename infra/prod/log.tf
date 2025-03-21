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
  display_name = "Task ratelimit alert policy"
  combiner     = "OR"
  conditions {
    display_name = "Ratelimited"
    condition_matched_log {
      filter = "httpRequest.status=429"
    }
  }

  notification_channels = [google_monitoring_notification_channel.email-me.name]
  alert_strategy {
    notification_rate_limit {
      period = "300s"
    }
  }
}
