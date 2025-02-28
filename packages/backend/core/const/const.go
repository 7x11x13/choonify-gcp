package constants

var UPLOAD_QUOTA_BYTES = []int64{
	100 * 1000 * 1000,       // tier 0: 100 MB
	500 * 1000 * 1000,       // tier 1: 500 MB
	5 * 1000 * 1000 * 1000,  // tier 2: 5 GB
	50 * 1000 * 1000 * 1000, // tier 3: 50 GB
}
