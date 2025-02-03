package handlers

import "github.com/gin-gonic/gin"

func DeleteAccountHandler(ctx *gin.Context) {
	// TODO
	// schedule user for deletion in 24h (create delayed cloud task)
	// disable account login

	// on deletion (cloud run function triggered by task queue):
	// delete cloud storage for user
	// remove user from firestore
	// remove channel creds from firestore
	// remove from idp/firebase auth
}
