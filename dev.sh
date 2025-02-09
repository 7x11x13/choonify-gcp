source .env.dev
export VITE_LOCAL_BACKEND=1
cd packages/frontend && npm run dev &
cd packages/backend/api && air