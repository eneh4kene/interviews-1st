# n8n Railway Deployment Guide

This repository contains a complete CI/CD setup for deploying n8n workflows to Railway with Docker.

## 🚀 Quick Start

1. **Set up Railway project**
2. **Configure environment variables**
3. **Add your workflows**
4. **Deploy**

## 📁 Project Structure

```
├── Dockerfile                 # n8n Docker configuration
├── railway.toml              # Railway deployment config
├── .env.example              # Environment variables template
├── .dockerignore             # Docker ignore file
├── scripts/
│   ├── entrypoint.sh         # Container startup script
│   └── import-workflows.sh   # Workflow import automation
└── workflows/
    ├── README.md             # Workflow management guide
    ├── .gitkeep              # Ensures directory is tracked
    └── *.json                # Your n8n workflow files
```

## 🔧 Setup Instructions

### 1. Railway Configuration

1. **Create a new Railway project**
2. **Connect your GitHub repository**
3. **Set up environment variables** (see below)
4. **Deploy**

### 2. Environment Variables

Copy `.env.example` to `.env` and configure:

#### Required Variables:
```bash
# Database (Neon Postgres)
DB_POSTGRESDB_HOST=your-neon-host.neon.tech
DB_POSTGRESDB_DATABASE=your-database-name
DB_POSTGRESDB_USER=your-username
DB_POSTGRESDB_PASSWORD=your-password

# n8n Security
N8N_ENCRYPTION_KEY=your-32-char-encryption-key
N8N_USER=admin@yourcompany.com
N8N_PASSWORD=your-secure-password

# Webhook URLs
WEBHOOK_URL=https://your-n8n-app.railway.app
INTERVIEW_ME_APP_URL=https://your-main-app.railway.app
```

#### Railway-Specific Variables:
Railway will automatically set:
- `PORT=5678`
- `NODE_ENV=production`
- `RAILWAY_STATIC_URL` (your app URL)

### 3. Adding Workflows

1. **Export workflows** from your local n8n instance as JSON
2. **Save them** in the `workflows/` directory
3. **Commit and push** to trigger deployment
4. **Workflows auto-import** on next deployment

## 🔄 Deployment Process

### Automatic Deployment:
1. **Push to main branch** → Railway detects changes
2. **Docker build** → Creates n8n image with workflows
3. **Container startup** → Runs entrypoint script
4. **n8n starts** → Initializes with database
5. **Workflow import** → Imports new workflows (hybrid mode)
6. **Ready** → n8n is accessible via Railway URL

### Hybrid Import Mode:
- ✅ **New workflows**: Automatically imported
- ✅ **Existing workflows**: Skipped (not overwritten)
- ✅ **Safe updates**: No data loss
- ✅ **Idempotent**: Can run multiple times safely

## 🛠️ Development Workflow

### Local Development:
```bash
# Test workflow import locally
docker build -t n8n-local .
docker run -p 5678:5678 --env-file .env n8n-local
```

### Production Updates:
1. **Update workflows** in `workflows/` directory
2. **Commit changes** to git
3. **Push to main** → Automatic Railway deployment
4. **Monitor logs** for import status

## 📊 Monitoring & Logs

### Railway Dashboard:
- **Deployment status**
- **Resource usage**
- **Environment variables**
- **Logs and metrics**

### n8n Logs:
```bash
# View container logs
railway logs

# Check workflow import status
railway logs | grep "workflow"
```

## 🔒 Security Best Practices

1. **Strong encryption key**: Use 32+ character random string
2. **Secure passwords**: Use strong, unique passwords
3. **Database security**: Use SSL connections
4. **Environment variables**: Use Railway's secrets management
5. **HTTPS only**: Railway handles SSL automatically

## 🚨 Troubleshooting

### Common Issues:

#### Workflows Not Importing:
- Check JSON format validity
- Verify workflow names don't conflict
- Check container logs for errors
- Ensure n8n is fully started before import

#### Database Connection Issues:
- Verify Neon database credentials
- Check SSL settings
- Ensure database is accessible from Railway

#### Authentication Problems:
- Verify N8N_USER and N8N_PASSWORD
- Check N8N_ENCRYPTION_KEY is set
- Ensure user management is enabled

### Debug Commands:
```bash
# Check container status
railway status

# View detailed logs
railway logs --follow

# Access container shell
railway shell
```

## 📈 Scaling & Performance

### Resource Allocation:
- **Memory**: 1GB (configurable in railway.toml)
- **CPU**: 0.5 cores (configurable)
- **Storage**: Ephemeral (use external database)

### Optimization Tips:
- Use PostgreSQL for persistence
- Enable workflow queuing for high volume
- Monitor resource usage in Railway dashboard
- Consider Redis for queue management

## 🔄 Updates & Maintenance

### Updating n8n:
1. **Update Dockerfile** base image
2. **Test locally** with new version
3. **Deploy to Railway**
4. **Verify workflows** still work

### Workflow Management:
- **Add new workflows**: Drop JSON files in `workflows/`
- **Update existing**: Delete from n8n, then redeploy
- **Backup workflows**: Export before major changes

## 📞 Support

- **Railway Documentation**: https://docs.railway.app/
- **n8n Documentation**: https://docs.n8n.io/
- **Issues**: Create GitHub issues for bugs
- **Discussions**: Use GitHub discussions for questions
