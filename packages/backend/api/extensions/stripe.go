package extensions

import (
	"os"

	"github.com/stripe/stripe-go/v81"
)

func InitStripe() {
	stripe.Key = os.Getenv("STRIPE_API_KEY")
}
