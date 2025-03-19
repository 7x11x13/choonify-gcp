variable "billing_account" { type = string }
variable "google_client_id" { type = string }
variable "google_client_secret" { type = string }
variable "region" {
  type    = string
  default = "us-west1"
}
variable "stripe_api_key" { type = string }
variable "stripe_webhook_secret" {
  type    = string
  default = ""
}
