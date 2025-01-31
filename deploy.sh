# 0. source infra/{stage}/.env
# 1. terraform apply in infra/{stage}
# 2. npm run build --mode={stage} with NODE_ENV={stage}
# 3. firebase use choonify-{stage}
# 4. firebase deploy --only hosting:{stage}