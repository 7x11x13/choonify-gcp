resource "stripe_product" "free" {
  name     = "Free"
  tax_code = "txcd_10103000"
  metadata = {
    tier = "0"
  }
}

resource "stripe_price" "free_monthly" {
  product        = stripe_product.free.id
  currency       = "usd"
  billing_scheme = "per_unit"
  unit_amount    = -1

  recurring {
    interval       = "month"
    interval_count = 1
  }
}

resource "stripe_product" "basic" {
  name     = "Basic"
  tax_code = "txcd_10103000"
  metadata = {
    tier = "1"
  }
}

resource "stripe_price" "basic_monthly" {
  product        = stripe_product.basic.id
  currency       = "usd"
  billing_scheme = "per_unit"
  unit_amount    = 599

  recurring {
    interval       = "month"
    interval_count = 1
  }
}

resource "stripe_price" "basic_yearly" {
  product        = stripe_product.basic.id
  currency       = "usd"
  billing_scheme = "per_unit"
  unit_amount    = 5999

  recurring {
    interval       = "year"
    interval_count = 1
  }
}

resource "stripe_product" "plus" {
  name     = "Plus"
  tax_code = "txcd_10103000"
  metadata = {
    tier = "2"
  }
}

resource "stripe_price" "plus_monthly" {
  product        = stripe_product.plus.id
  currency       = "usd"
  billing_scheme = "per_unit"
  unit_amount    = 1199

  recurring {
    interval       = "month"
    interval_count = 1
  }
}

resource "stripe_price" "plus_yearly" {
  product        = stripe_product.plus.id
  currency       = "usd"
  billing_scheme = "per_unit"
  unit_amount    = 11999

  recurring {
    interval       = "year"
    interval_count = 1
  }
}

resource "stripe_product" "premium" {
  name     = "Premium"
  tax_code = "txcd_10103000"
  metadata = {
    tier = "3"
  }
}

resource "stripe_price" "premium_monthly" {
  product        = stripe_product.premium.id
  currency       = "usd"
  billing_scheme = "per_unit"
  unit_amount    = 2399

  recurring {
    interval       = "month"
    interval_count = 1
  }
}

resource "stripe_price" "premium_yearly" {
  product        = stripe_product.premium.id
  currency       = "usd"
  billing_scheme = "per_unit"
  unit_amount    = 23999

  recurring {
    interval       = "year"
    interval_count = 1
  }
}

resource "stripe_webhook_endpoint" "webhook" {
  url            = "${google_cloud_run_v2_service.dev.uri}/stripe-webhook"
  enabled_events = ["customer.subscription.updated"]
}

output "STRIPE_FREE_TIER_PRICE" {
  value = stripe_price.free_monthly.id
}

output "STRIPE_WEBHOOK_SECRET" {
  sensitive = true
  value     = stripe_webhook_endpoint.webhook.secret
}

// use adaptive pricing
// create customer portal
// enable stripe tax
