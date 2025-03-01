package handlers

import (
	"net/http"
	"os"

	"choonify.com/backend/api/extensions"
	"choonify.com/backend/api/util"
	"choonify.com/backend/core/types"
	"cloud.google.com/go/firestore"
	"github.com/gin-gonic/gin"
	"github.com/stripe/stripe-go/v81"
	"github.com/stripe/stripe-go/v81/billingportal/session"
	"github.com/stripe/stripe-go/v81/customer"
	"github.com/stripe/stripe-go/v81/subscription"
)

type portalSessionRequestBody struct {
	ReturnUrl string `json:"returnUrl"`
}

func CreatePortalSessionHandler(ctx *gin.Context) {
	var body portalSessionRequestBody
	err := ctx.BindJSON(&body)
	if err != nil {
		util.SendErrorNoLog(ctx, &types.ErrorBody{
			StatusCode: http.StatusBadRequest,
			I18NKey:    "api.bad-request",
		})
		return
	}

	userId, user, err := util.GetUser(ctx)
	if err != nil {
		return
	}

	if user.CustomerId == "" {
		// create stripe customer and save in db
		record, err := extensions.Auth.GetUser(ctx, userId)
		if err != nil {
			util.SendError(ctx, err, "Could not get IDP user", &map[string]string{
				"userId": userId,
			}, nil)
			return
		}
		cus, err := customer.New(&stripe.CustomerParams{
			Name:  stripe.String(record.DisplayName),
			Email: stripe.String(record.Email),
			Metadata: map[string]string{
				"UID": userId,
			},
		})
		if err != nil {
			util.SendError(ctx, err, "Could not create Stripe customer", &map[string]string{
				"userId": userId,
				"email":  record.Email,
				"name":   record.DisplayName,
			}, nil)
			return
		}
		user.CustomerId = cus.ID
		_, err = extensions.Firestore.Collection("users").Doc(userId).Update(ctx, []firestore.Update{
			{
				Path:  "customerId",
				Value: cus.ID,
			},
		})
		if err != nil {
			util.SendError(ctx, err, "Could not update user in DB", &map[string]string{
				"userId":     userId,
				"customerId": cus.ID,
			}, nil)
			return
		}
	}

	// if customer has no active subscriptions, add free one
	it := subscription.List(&stripe.SubscriptionListParams{
		Customer: &user.CustomerId,
		Status:   stripe.String("active"),
		ListParams: stripe.ListParams{
			Limit: stripe.Int64(1),
		},
	})
	if !it.Next() {
		// subscribe to free plan
		_, err := subscription.New(&stripe.SubscriptionParams{
			Customer: &user.CustomerId,
			Items: []*stripe.SubscriptionItemsParams{
				{
					Price: stripe.String(os.Getenv("STRIPE_FREE_TIER_PRICE")),
				},
			},
		})
		if err != nil {
			util.SendError(ctx, err, "Could not subscribe to free plan", &map[string]string{
				"userId":     userId,
				"customerId": user.CustomerId,
				"priceId":    os.Getenv("STRIPE_FREE_TIER_PRICE"),
			}, nil)
			return
		}
	}

	// create portal session
	ses, err := session.New(&stripe.BillingPortalSessionParams{
		Customer:  &user.CustomerId,
		ReturnURL: &body.ReturnUrl,
	})
	if err != nil {
		util.SendError(ctx, err, "Could not create portal session", &map[string]string{
			"customerId": user.CustomerId,
			"returnUrl":  body.ReturnUrl,
		}, nil)
		return
	}

	ctx.JSON(http.StatusOK, ses.URL)
}
