# AmarKrishok

React/Vite frontend and NestJS/Prisma API for the AmarKrishok marketplace.

## Requirements

- Node.js 24.6.0 (see `.nvmrc`)
- PostgreSQL 16+

## Local setup

```sh
cp .env.example .env
cp backend/.env.example backend/.env
npm ci
npm ci --prefix backend
npm run backend:prisma:generate
npm --prefix backend run prisma:deploy
npm run seed
```

Run the API and frontend in separate terminals:

```sh
npm run backend:dev
npm run dev
```

The frontend defaults to `bn-BD`, falls back to English, and renders dates and times in
`Asia/Dhaka`. Database timestamps are written as UTC. All P0 domain money columns and seed values
are integer poisha; quantities are integer mon.

## Verification

```sh
npm run test:p0
npm run check
```

CI repeats the migration, seed, database assertions, lint, and both production builds against a
fresh PostgreSQL database.

## Compatibility note

The deployed v1 API remains available through Prisma models prefixed with `Legacy`. P0 adds the
architecture document's platform domain alongside those tables, so later packages can migrate
features without breaking the current application.
