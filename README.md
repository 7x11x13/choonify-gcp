# Choonify - a (dead) TunesToTube / Audioship clone

Choonify allows users to convert audio files to videos and upload them directly to YouTube.
Unfortunately my quota increase request and subsequent appeal were denied so I'm releasing the source.

## Technical details (kinda)

The backend is fully serverless and hosted on GCP to avoid egress fees to YouTube. I have some scripts in the root directory which use Terraform and firebase CLI to deploy the project, which expect
json files `.env.tf.dev.json` and `.env.tf.prod.json` filled with secrets.
