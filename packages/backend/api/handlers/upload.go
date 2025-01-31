package handlers

import (
	"encoding/json"
	"net/http"
	"os"

	"choonify.com/api/extensions"
	"choonify.com/api/types"
	"choonify.com/api/util"
	"cloud.google.com/go/run/apiv2/runpb"
	"github.com/gin-gonic/gin"
)

func getUploadQuota(subscription int) int {
	return []int{10, 25, 1000, 1000}[subscription]
}

type uploadRequestResponse struct {
	Uploading int `json:"uploading"`
}

func UploadRequestHandler(ctx *gin.Context) {
	var body types.UploadBatchRequest
	err := ctx.BindJSON(&body)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, "Bad request")
		return
	}

	userId := util.GetUserId(ctx)
	user, err := util.GetUser(ctx, userId)
	if err != nil {
		return
	}

	// TODO: change to bytes quota
	uploadedToday, _ := user.RealUploadedToday()
	uploadCount := min(max(0, getUploadQuota(user.Subscription)-uploadedToday), len(body.Videos))
	body.Videos = body.Videos[:uploadCount]

	msg := util.ValidateBatchRequest(&body, userId, user)
	if msg != "" {
		ctx.JSON(http.StatusBadRequest, msg)
		return
	}

	if len(body.Videos) > 0 {
		// send to render job
		raw, err := json.Marshal(body)
		if err != nil {
			ctx.Error(err)
			ctx.JSON(http.StatusInternalServerError, nil)
			return
		}
		extensions.Jobs.RunJob(ctx, &runpb.RunJobRequest{
			Name: os.Getenv("RENDER_JOB_NAME"),
			Overrides: &runpb.RunJobRequest_Overrides{
				ContainerOverrides: []*runpb.RunJobRequest_Overrides_ContainerOverride{
					{
						Env: []*runpb.EnvVar{
							{
								Name: "RENDER_PARAMS_JSON",
								Values: &runpb.EnvVar_Value{
									Value: string(raw),
								},
							},
						},
					},
				},
			},
		})
	}
	ctx.JSON(http.StatusOK, uploadRequestResponse{
		Uploading: len(body.Videos),
	})
}
