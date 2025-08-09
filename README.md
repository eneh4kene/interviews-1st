# Interview Me - Turborepo Monorepo

A modern full-stack interview platform built with Next.js, Express, and Turborepo.

## 🏗️ Architecture

- **Monorepo**: Turborepo with pnpm workspaces
- **Frontend**: Next.js 14 with App Router, Tailwind CSS, shadcn/ui
- **Backend**: Express.js with TypeScript, Zod validation, security middleware
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Shared Packages**: Types and UI components

## 📁 Project Structure

```
interview-me/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Express backend
├── packages/
│   ├── types/        # Shared TypeScript types
│   └── ui/           # Shared UI components
├── scripts/          # Database initialization
└── docker-compose.dev.yml
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm 10+
- Docker & Docker Compose (optional)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up Environment Variables

```bash
# Copy environment examples
cp env.example .env
cp apps/web/env.example apps/web/.env.local
cp apps/api/env.example apps/api/.env

# Edit the files with your configuration
```

### 3. Start Database Services (Optional)

If you have Docker installed, you can start PostgreSQL and Redis:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

**Note**: The apps will work without Docker, but you'll need to set up PostgreSQL and Redis separately or update the environment variables to point to your existing services.

### 4. Start Development Servers

```bash
npm run dev
```

This will start:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 🛠️ Development

### Available Scripts

```bash
# Root level
npm run dev          # Start all apps in development mode
npm run build        # Build all packages and apps
npm run lint         # Lint all packages and apps
npm run type-check   # Type check all packages and apps

# Individual apps
npm run dev --workspace=@interview-me/web    # Start only web app
npm run dev --workspace=@interview-me/api    # Start only API
```
```

### Database Management

```bash
# Start database services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down

# Reset database (removes all data)
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

## 📦 Packages

### @interview-me/types
Shared TypeScript interfaces and types used across the monorepo.

### @interview-me/ui
Reusable UI components built with shadcn/ui and Tailwind CSS.

## 🔧 API Endpoints

- `GET /health` - Health check
- `GET /api/hello?name=World` - Hello endpoint
- `POST /api/users` - Create user (with validation)

## 🎨 UI Components

The project includes shadcn/ui components:
- Button (with variants)
- Card (with all sub-components)

## 🔒 Security Features

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- Input validation with Zod
- Cookie parsing
- Request logging with Pino

## 🐳 Docker

The project includes Docker Compose for development services:

- **PostgreSQL 16**: Main database
- **Redis 7**: Caching and sessions

## 📝 Environment Variables

### Root (.env)
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jobplace
REDIS_URL=redis://localhost:6379
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
JWT_PRIVATE_KEY=...
JWT_PUBLIC_KEY=...
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

### Web App (.env.local)
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

### API (.env)
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jobplace
REDIS_URL=redis://localhost:6379
PORT=3001
NODE_ENV=development
```

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run tests in watch mode
npm run test:watch
```

## 📦 Production Build

```bash
# Build all packages and apps
npm run build

# Start production servers
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details. 