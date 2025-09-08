# 🌿 Branch Strategy for Interview-Me Deployment

## 📋 **Branch Overview**

### **1. `railway-ghcr-separate-services`** 
**Current working branch with two separate services**

**Architecture:**
- **API Service**: Express.js API running on port 3001
- **Web Service**: Next.js app running on port 3000
- **Deployment**: Two separate Railway services using GHCR images
- **Communication**: Railway handles internal service networking

**Files:**
- `railway-api.toml` - API service configuration
- `railway-web.toml` - Web service configuration
- `.github/workflows/docker-build.yml` - GHCR build workflow

**Pros:**
- ✅ Independent scaling
- ✅ Independent deployments
- ✅ Clear separation of concerns
- ✅ Easy debugging

**Cons:**
- ❌ More complex deployment
- ❌ Two services to manage
- ❌ Service-to-service communication overhead

---

### **2. `nextjs-api-routes-single-service`** 
**New branch for single service approach**

**Architecture:**
- **Single Service**: Next.js app with API routes (`/api/*`)
- **Port**: Single port (3000) for everything
- **Deployment**: One Railway service
- **Communication**: Internal Next.js routing

**Planned Changes:**
- Move Express.js routes to Next.js API routes
- Remove separate API service
- Single Docker build
- Single Railway deployment

**Pros:**
- ✅ Simpler architecture
- ✅ Single deployment
- ✅ Built-in Next.js features
- ✅ Easier management

**Cons:**
- ❌ Tightly coupled API and Web
- ❌ Less flexible scaling
- ❌ Migration effort required

---

## 🚀 **Current Status**

### **`railway-ghcr-separate-services`** ✅ READY
- GHCR images built successfully
- Railway configs updated
- Ready for deployment

### **`nextjs-api-routes-single-service`** 🔄 IN PROGRESS
- Branch created
- Ready for implementation
- Next: Migrate API routes to Next.js

---

## 📝 **Next Steps**

1. **Deploy current branch** (`railway-ghcr-separate-services`) to Railway
2. **Implement single service** in `nextjs-api-routes-single-service` branch
3. **Compare both approaches** and choose the best one
4. **Merge chosen approach** back to master

---

## 🔗 **Branch URLs**

- **Separate Services**: `https://github.com/eneh4kene/interview-me/tree/railway-ghcr-separate-services`
- **Single Service**: `https://github.com/eneh4kene/interview-me/tree/nextjs-api-routes-single-service`
