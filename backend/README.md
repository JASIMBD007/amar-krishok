# AmarKrishok Backend

NestJS + Prisma backend for AmarKrishok.

## Setup

```bash
cd backend
cp .env.example .env
npm install
docker compose up -d
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

API docs will be available at `http://localhost:4000/docs`.
