if [ "$1" == prod ]; then
    stage=prod
else
    stage=dev
fi

source .env.${stage} &&
cd infra/${stage} &&
terraform apply -auto-approve &&
cd ../../packages/frontend &&
npm run build &&
firebase use choonify-${stage} &&
firebase deploy --only hosting:${stage},firestore:rules,storage