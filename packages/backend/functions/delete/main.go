package delete

import (
	"net/http"

	"github.com/GoogleCloudPlatform/functions-framework-go/functions"
)

func init() {
	functions.HTTP("Delete", Delete)
}

func Delete(w http.ResponseWriter, r *http.Request) {
	
}