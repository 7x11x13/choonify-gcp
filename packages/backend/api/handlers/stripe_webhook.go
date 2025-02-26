package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"

	"choonify.com/backend/api/extensions"
	"choonify.com/backend/api/util"
	"choonify.com/backend/core/log"
	"cloud.google.com/go/firestore"
	"cloud.google.com/go/logging"
	"github.com/gin-gonic/gin"
	"github.com/stripe/stripe-go/v81"
	"github.com/stripe/stripe-go/v81/customer"
	"github.com/stripe/stripe-go/v81/product"
	"github.com/stripe/stripe-go/v81/webhook"
)

func StripeWebhookHandler(ctx *gin.Context) {
	payload, err := io.ReadAll(ctx.Request.Body)
	if err != nil {
		util.SendAlert(ctx, err, "Could not read request body", nil, nil)
		return
	}
	event, err := webhook.ConstructEvent(payload, ctx.GetHeader("Stripe-Signature"), os.Getenv("STRIPE_WEBHOOK_SECRET"))
	if err != nil {
		util.SendAlert(ctx, err, "Could not construct webhook event", nil, nil)
		return
	}

	switch event.Type {
	case "customer.subscription.updated":
		var sub stripe.Subscription
		err := json.Unmarshal(event.Data.Raw, &sub)
		if err != nil {
			util.SendAlert(ctx, err, "Could not unmarshal event", &map[string]string{
				"eventData": string(event.Data.Raw),
			}, nil)
			return
		}
		cus, err := customer.Get(sub.Customer.ID, &stripe.CustomerParams{})
		if err != nil {
			util.SendAlert(ctx, err, "Could not get customer", &map[string]string{
				"customerId": sub.Customer.ID,
			}, nil)
			return
		}
		userId, ok := cus.Metadata["UID"]
		if !ok {
			util.SendAlert(ctx, err, "Could not get UID", &map[string]string{
				"customer": fmt.Sprintf("%+v", cus),
			}, nil)
			return
		}
		subItems := sub.Items.Data
		if len(subItems) != 1 {
			util.SendAlert(ctx, err, "Unexpected number of subscriptions", &map[string]string{
				"subscription": fmt.Sprintf("%+v", sub),
			}, nil)
			return
		}
		prod, err := product.Get(subItems[0].Price.Product.ID, &stripe.ProductParams{})
		if err != nil {
			util.SendAlert(ctx, err, "Could not get product", &map[string]string{
				"product": fmt.Sprintf("%+v", subItems[0].Price.Product),
			}, nil)
			return
		}
		tier, ok := prod.Metadata["tier"]
		if !ok {
			util.SendAlert(ctx, err, "Could not get product tier", &map[string]string{
				"product": fmt.Sprintf("%+v", prod),
			}, nil)
			return
		}
		tierInt, err := strconv.Atoi(tier)
		if err != nil {
			util.SendAlert(ctx, err, "Could not convert product tier to int", &map[string]string{
				"tier": tier,
			}, nil)
			return
		}

		_, err = extensions.Firestore.Collection("users").Doc(userId).Update(ctx, []firestore.Update{
			{
				Path:  "subscription",
				Value: tierInt,
			},
		})
		if err != nil {
			util.SendAlert(ctx, err, "Could not update user subscription", &map[string]string{
				"tier":   fmt.Sprintf("%d", tierInt),
				"userId": userId,
			}, nil)
			return
		}
	default:
		log.LogError(logging.Info, fmt.Sprintf("Unhandled event type: %s", event.Type), nil, nil)
	}

	ctx.JSON(http.StatusOK, nil)
}
