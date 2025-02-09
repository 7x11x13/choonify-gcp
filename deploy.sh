if [ "$1" == prod ]; then
    stage=prod
    mode=production
else
    stage=dev
    mode=development
fi

source .env.${stage} &&
cd infra/${stage} &&
terraform apply -auto-approve &&
cd ../../packages/frontend &&
npm run build --mode=${mode} &&
firebase use choonify-${stage} &&
firebase deploy --only hosting:${stage},firestore:rules,storage