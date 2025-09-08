# Replit Deployment Guide

## Environment Variables Setup

### Method 1: Replit Secrets Tab (Recommended)
1. In your Replit project, click on the **"Secrets"** tab in the left sidebar
2. Add the following environment variables:

```
DATABASE_URL=postgresql://neondb_owner:npg_pi8PbIqt5WSD@ep-purple-silence-ad2u8w9w-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
JWT_SECRET=your-super-secret-jwt-key-here-make-it-very-long-and-random
REDIS_URL=redis://localhost:6379
NEXTAUTH_URL=https://your-replit-app-name.your-username.repl.co
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXT_PUBLIC_API_BASE_URL=/api
PORT=3000
NODE_ENV=production
```

### Method 2: .env File
Create a `.env` file in your Replit project root with the above variables.

## Deployment Steps

1. **Upload your code to Replit**
   - Either connect your GitHub repo or upload files directly

2. **Set up environment variables** (see above)

3. **Install dependencies**
   ```bash
   cd apps/web
   npm install
   ```

4. **Build the application**
   ```bash
   npm run build
   ```

5. **Start the application**
   ```bash
   npm start
   ```

## Replit Configuration

### nixpacks.toml (if needed)
Create a `nixpacks.toml` file in your project root:

```toml
[phases.setup]
nixPkgs = ['nodejs', 'npm']

[phases.install]
cmds = ['cd apps/web && npm install']

[phases.build]
cmds = ['cd apps/web && npm run build']

[start]
cmd = 'cd apps/web && npm start'
```

### package.json Scripts
Make sure your root `package.json` has these scripts:

```json
{
  "scripts": {
    "dev": "cd apps/web && npm run dev",
    "build": "cd apps/web && npm run build",
    "start": "cd apps/web && npm start",
    "install": "cd apps/web && npm install"
  }
}
```

## Troubleshooting

### Database Connection Issues
- Make sure your Neon database URL is correct
- Check if Replit allows external database connections
- Consider using Replit's built-in database if external connections are blocked

### Port Issues
- Replit usually assigns a port automatically
- Use `process.env.PORT || 3000` in your code
- Check Replit's console for the assigned port

### Build Issues
- Make sure all dependencies are installed
- Check for TypeScript errors: `npm run type-check`
- Verify all environment variables are set

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `JWT_SECRET` | Secret key for JWT tokens | `your-secret-key` |
| `REDIS_URL` | Redis connection string (optional) | `redis://localhost:6379` |
| `NEXTAUTH_URL` | Your Replit app URL | `https://app-name.username.repl.co` |
| `NEXTAUTH_SECRET` | NextAuth secret | `your-nextauth-secret` |
| `NEXT_PUBLIC_API_BASE_URL` | API base URL | `/api` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `production` |
