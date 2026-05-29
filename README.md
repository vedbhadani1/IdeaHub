# Internal Product Collaboration Social Network

A lightweight, Discord-style discussion platform for internal product teams.

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Zustand, Axios, React-Router
- **Backend**: Node 18, Express, TypeScript, Prisma, PostgreSQL, JWT, Socket.io
- **Database**: PostgreSQL

## Quick Start

### Prerequisites
- Node.js >= 18
- PostgreSQL running locally (or via Docker)

### Backend Setup
```bash
cd backend
cp .env.example .env      # edit DATABASE_URL if needed
npm install
npx prisma migrate dev --name init
npm run dev               # http://localhost:4000
```

### Frontend Setup
```bash
cd frontend
cp .env.example .env
npm install
npm run dev               # http://localhost:5173
```

## Environment Variables

### backend/.env.example
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/collab?schema=public"
JWT_SECRET="super-secret-key"
PORT=4000
```

### frontend/.env.example
```
VITE_API_URL=http://localhost:4000/api
```

## License
MIT
