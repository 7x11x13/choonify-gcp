package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"

	"choonify.com/backend/api/extensions"
	"choonify.com/backend/api/util"
	"cloud.google.com/go/firestore"
	"github.com/gin-gonic/gin"
	"github.com/stripe/stripe-go/v81"
	"github.com/stripe/stripe-go/v81/customer"
	"github.com/stripe/stripe-go/v81/product"
	"github.com/stripe/stripe-go/v81/webhook"
)

func StripeWebhookHandler(ctx *gin.Context) {
	payload, err := io.ReadAll(ctx.Request.Body)
	if err != nil {
		util.SendError(ctx, http.StatusBadRequest, err, nil)
		return
	}
	event, err := webhook.ConstructEvent(payload, ctx.GetHeader("Stripe-Signature"), os.Getenv("STRIPE_WEBHOOK_SECRET"))
	if err != nil {
		util.SendError(ctx, http.StatusBadRequest, err, nil)
		return
	}

	switch event.Type {
	case "customer.subscription.updated":
		var sub stripe.Subscription
		err := json.Unmarshal(event.Data.Raw, &sub)
		if err != nil {
			util.SendError(ctx, http.StatusBadRequest, err, nil)
			return
		}
		cus, err := customer.Get(sub.Customer.ID, &stripe.CustomerParams{})
		if err != nil {
			util.SendError(ctx, http.StatusInternalServerError, err, nil)
			return
		}
		userId, ok := cus.Metadata["UID"]
		if !ok {
			log.Printf("UserId %s not found", userId)
			util.SendError(ctx, http.StatusInternalServerError, nil, nil)
			return
		}
		subItems := sub.Items.Data
		if len(subItems) != 1 {
			log.Printf("Unexpected number of subscriptions: %d", len(subItems))
			util.SendError(ctx, http.StatusBadRequest, nil, nil)
			return
		}
		prod, err := product.Get(subItems[0].Price.Product.ID, &stripe.ProductParams{})
		if err != nil {
			util.SendError(ctx, http.StatusInternalServerError, err, nil)
			return
		}
		tier, ok := prod.Metadata["tier"]
		if !ok {
			log.Printf("Tier %s not found", tier)
			util.SendError(ctx, http.StatusInternalServerError, nil, nil)
			return
		}
		tierInt, err := strconv.Atoi(tier)
		if err != nil {
			util.SendError(ctx, http.StatusInternalServerError, err, nil)
			return
		}

		_, err = extensions.Firestore.Collection("users").Doc(userId).Update(ctx, []firestore.Update{
			{
				Path:  "subscription",
				Value: tierInt,
			},
		})
		if err != nil {
			util.SendError(ctx, http.StatusBadRequest, err, nil)
			return
		}
	default:
		log.Printf("Unhandled event type: %s", event.Type)
	}

	ctx.JSON(http.StatusOK, nil)
}
