# CutTrack

Personal 3-month cut tracker for Ali Raza.

## Deploy on Render

1. Push this repo to GitHub
2. Go to render.com → New → Blueprint
3. Connect your GitHub repo
4. Render will auto-detect `render.yaml` and create both the web service and PostgreSQL database
5. Hit Deploy — done

## Local dev

```bash
# Add your local postgres URL to .env
echo 'DATABASE_URL="postgresql://user:pass@localhost:5432/cuttrack"' > .env

npm install
npx prisma migrate dev --name init
npm run dev
```

## Stack
- Next.js 15 (App Router)
- PostgreSQL + Prisma
- Recharts
- Deployed on Render
