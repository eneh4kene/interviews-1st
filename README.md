# InterviewsFirst - Job Placement Platform

A modern B2B SaaS platform for career coaches, recruiters, and job placement professionals to manage their clients' job search portfolios and track interview success rates.

## 🎯 **Platform Overview**

**InterviewsFirst** is a comprehensive job placement platform that operates on a unique **£10 per interview payment model**. Clients only pay when they accept an interview invitation, creating a risk-free, transparent pricing structure.

### **Key Features**
- **Client Portfolio Management**: Manage job seekers with detailed profiles
- **Resume Management**: Upload, organize, and manage multiple resume versions
- **Job Preference Tracking**: Set target roles, locations, and requirements
- **Job Aggregation System**: Multi-source job listings from Adzuna, Jooble, and more
- **Application Tracking**: Monitor job applications and interview status
- **Interview Scheduling**: Schedule interviews on behalf of clients
- **Payment Processing**: £10 fee when clients accept interviews
- **Analytics Dashboard**: Track success rates and performance metrics

## 🏗️ **Architecture**

- **Monorepo**: Turborepo with npm workspaces
- **Frontend**: Next.js 14 with App Router, Tailwind CSS, shadcn/ui
- **Backend**: Express.js with TypeScript, Zod validation, security middleware
- **Database**: PostgreSQL 16 (Neon in production)
- **Cache**: Redis 7 (HashMap mock in development)
- **Payment**: Stripe integration
- **Authentication**: JWT-based with refresh tokens
- **Deployment**: Vercel (Frontend) + Railway (API) + Neon (Database)
- **Monitoring**: Production-ready observability and performance monitoring

## 📁 **Project Structure**

```
interview-me/
├── apps/
│   ├── web/          # Next.js frontend application
│   └── api/          # Express.js backend API
├── packages/
│   ├── types/        # Shared TypeScript types
│   └── ui/           # Shared UI components (shadcn/ui)
├── scripts/          # Database initialization scripts
├── docs/             # Platform documentation
└── docker-compose.dev.yml
```

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+
- npm 10+
- Docker & Docker Compose (recommended)

### **1. Clone and Install**
```bash
git clone https://github.com/eneh4kene/interview-me.git
cd interview-me
npm install
```

### **2. Environment Setup**
```bash
# Copy environment examples
cp env.example .env
cp apps/web/env.example apps/web/.env.local
cp apps/api/env.example apps/api/.env

# Edit with your configuration
```

### **3. Start Services**
```bash
# Start database services (PostgreSQL + Redis)
docker-compose -f docker-compose.dev.yml up -d

# Start development servers
npm run dev
```

### **4. Access the Application**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Database**: localhost:5432
- **Redis**: localhost:6379

## 👥 **User Types & Features**

### **Workers (Career Coaches/Recruiters)**
- **Dashboard**: Overview of all clients and performance metrics
- **Client Management**: Add, edit, and manage client profiles
- **Resume Management**: Upload and organize client resumes
- **Job Preferences**: Set target roles and requirements
- **Job Search**: Browse aggregated job listings from multiple sources
- **Application Tracking**: Monitor application progress
- **Interview Scheduling**: Schedule interviews on behalf of clients
- **Analytics**: Track success rates and revenue

### **Clients (Job Seekers)**
- **Profile Management**: Update personal and professional information
- **Resume Upload**: Multiple resume versions for different roles
- **Job Preferences**: Set target roles, locations, and salary expectations
- **Interview Notifications**: Receive notifications when interviews are scheduled
- **Payment Processing**: Pay £10 only when accepting interviews

### **Admins**
- **Platform Management**: Oversee all workers and clients
- **Analytics**: Platform-wide performance metrics
- **User Management**: Manage user accounts and permissions

## 🎨 **UI Components & Features**

### **Professional Modals**
- **EditResumeModal**: Upload, download, edit, and manage resumes
- **JobPreferenceModal**: Add and edit job preferences with comprehensive forms
- **ViewApplicationsModal**: View applications filtered by job preference
- **EditClientForm**: Manage client profile information

### **Interactive Features**
- **File Upload**: Drag-and-drop resume upload with progress indicators
- **Form Validation**: Real-time validation with error messages
- **Loading States**: Professional loading indicators
- **Responsive Design**: Mobile-first responsive interface
- **Status Tracking**: Visual status indicators for applications and interviews

## 🔧 **API Endpoints**

### **Authentication**
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT tokens
- `POST /api/auth/logout` - User logout

### **Clients**
- `GET /api/clients` - Get all clients for worker
- `GET /api/clients/:id` - Get specific client details
- `PUT /api/clients/:id` - Update client information
- `POST /api/clients` - Create new client

### **Resumes**
- `POST /api/resumes` - Upload new resume
- `GET /api/resumes/:id` - Download resume
- `PUT /api/resumes/:id` - Update resume details
- `DELETE /api/resumes/:id` - Delete resume

### **Job Preferences**
- `GET /api/preferences` - Get job preferences for client
- `POST /api/preferences` - Create new job preference
- `PUT /api/preferences/:id` - Update job preference
- `DELETE /api/preferences/:id` - Delete job preference

### **Applications**
- `GET /api/applications` - Get applications for client
- `POST /api/applications` - Create new application
- `PUT /api/applications/:id` - Update application status

### **Job Aggregation**
- `GET /api/jobs/search` - Search jobs from live aggregators and stored database
- `GET /api/jobs/search?source=live` - Search only live aggregator APIs
- `GET /api/jobs/search?source=stored` - Search only stored database jobs
- `GET /api/jobs/:id` - Get specific job details
- `PUT /api/jobs/:id/auto-apply` - Update auto-apply status for job
- `GET /api/jobs/stats/aggregators` - Get aggregator statistics
- `GET /api/jobs/health/aggregators` - Health check for job aggregators

## 🔍 **Job Aggregation System**

### **Overview**
The platform includes a sophisticated job aggregation system that fetches job listings from multiple sources, normalizes the data, and provides a unified search interface.

### **Supported Aggregators**
- **Adzuna**: UK job listings with comprehensive metadata
- **Jooble**: Global job search with location-based filtering
- **Future**: Indeed, ZipRecruiter, Workable, Greenhouse

### **Key Features**
- **Multi-Source Integration**: Fetch jobs from multiple aggregators simultaneously
- **Data Normalization**: Consistent job data structure across all sources
- **Deduplication**: Prevent duplicate job listings using smart hashing
- **Caching**: Redis-based caching for improved performance (30-minute TTL)
- **Partial Persistence**: Store essential job data in PostgreSQL for search and analytics
- **Auto-Cleanup**: Automatic removal of old jobs (30-day TTL)
- **Rate Limiting**: Respect API rate limits for each aggregator
- **Error Handling**: Graceful degradation when aggregators are unavailable

### **Search Capabilities**
- **Keyword Search**: Search across job titles, companies, and descriptions
- **Location Filtering**: Filter by city, remote, hybrid, or onsite
- **Job Type Filtering**: Full-time, part-time, contract, internship, etc.
- **Salary Range**: Filter by minimum and maximum salary
- **Date Filtering**: Jobs posted in last 24h, 7 days, 30 days
- **Company Filtering**: Search by specific company names

### **Auto-Apply Integration**
- **Status Tracking**: Track jobs eligible for automated applications
- **AI Integration Ready**: Prepared for future AI-powered auto-apply features
- **Status Types**: Eligible, ineligible, pending review, applied, failed, blacklisted

### **Performance Optimizations**
- **Parallel Fetching**: Fetch from multiple aggregators simultaneously
- **Smart Caching**: Cache results to reduce API calls
- **Database Indexing**: Optimized PostgreSQL indexes for fast searches
- **Connection Pooling**: Efficient database connection management

## 💰 **Business Model**

### **£10 Per Interview Payment Model**
- **Zero Upfront Cost**: Clients sign up for free
- **Pay Only When Successful**: £10 charged only when interview is accepted
- **No Risk**: Clients don't pay until they have a real opportunity
- **Transparent Pricing**: Clear, simple fee structure

### **Revenue Streams**
- **Interview Fees**: £10 per accepted interview
- **Subscription Plans**: Premium features for workers
- **Success Fees**: Percentage of placement bonuses
- **Add-on Services**: Resume writing, interview coaching

## 🔒 **Security & Compliance**

### **Security Features**
- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **Rate Limiting**: API protection against abuse (configurable limits)
- **Input Validation**: Zod schema validation with sanitization
- **CORS Configuration**: Secure cross-origin requests
- **Security Headers**: Helmet.js with CSP, HSTS, X-Frame-Options
- **Request Logging**: Structured logging with Pino HTTP logger
- **Security Monitoring**: Real-time security event tracking
- **Password Management**: Secure password change and reset functionality

### **Data Protection**
- **GDPR Compliance**: Data privacy regulations
- **Encryption**: Data at rest and in transit
- **Access Control**: Role-based permissions (Admin, Worker, Manager)
- **Audit Logs**: Complete activity tracking and security events
- **Input Sanitization**: XSS protection and data validation
- **Request ID Tracking**: Unique request identification for debugging

## 🛠️ **Development**

### **Available Scripts**
```bash
# Development
npm run dev          # Start all apps in development mode
npm run build        # Build all packages and apps
npm run lint         # Lint all packages and apps
npm run type-check   # Type check all packages and apps

# Individual apps
npm run dev --workspace=@interview-me/web    # Start only web app
npm run dev --workspace=@interview-me/api    # Start only API
```

### **Database Management**
```bash
# Start services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down

# Reset database
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

## 📦 **Packages**

### **@interview-me/types**
Shared TypeScript interfaces and types used across the monorepo:
- `Client` - Client profile information
- `Resume` - Resume data structure
- `JobPreference` - Job preference details
- `Application` - Application tracking data
- `Job` - Job listing data structure
- `JobAggregator` - Supported job aggregator types
- `JobSearchFilters` - Job search filter parameters
- `AutoApplyStatus` - Auto-apply status enumeration

### **@interview-me/ui**
Reusable UI components built with shadcn/ui and Tailwind CSS:
- Button, Card, Input, Label, Select
- Modal components for forms
- Loading states and error handling
- Responsive design utilities

## 📝 **Environment Variables**

### **Development (.env)**
```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jobplace
REDIS_URL=redis://localhost:6379

# JWT Secrets
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here

# API Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Job Aggregators
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key
ADZUNA_BASE_URL=https://api.adzuna.com/v1/api
JOOBLE_API_KEY=your_jooble_api_key
JOOBLE_BASE_URL=https://jooble.org/api

# Rate Limits (requests per minute)
ADZUNA_RATE_LIMIT_PER_MINUTE=25
JOOBLE_RATE_LIMIT_PER_MINUTE=60

# Job Cache Settings
JOB_CACHE_TTL_SECONDS=1800
JOB_STORAGE_TTL_DAYS=30
```

### **Production (Vercel + Railway)**
```env
# Frontend (Vercel)
NEXT_PUBLIC_API_URL=https://your-railway-api-url.railway.app

# Backend (Railway)
DATABASE_URL=your_neon_database_url_here
REDIS_URL=your_railway_redis_url_here
JWT_SECRET=your_production_jwt_secret_here
JWT_REFRESH_SECRET=your_production_jwt_refresh_secret_here
CORS_ORIGIN=https://your-vercel-app.vercel.app
NODE_ENV=production
PORT=3001
```

### **Web App (.env.local)**
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

## 🚀 **Deployment**

### **Production Deployment (Recommended)**
The platform is configured for **free hosting** with Vercel + Railway:

#### **Quick Deploy**
1. **Deploy API to Railway:**
   - Go to [railway.app](https://railway.app)
   - Connect GitHub → Select your repo
   - Set root directory to `apps/api`
   - Add environment variables (see [Deployment Guide](DEPLOYMENT_GUIDE.md))

2. **Deploy Frontend to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Connect GitHub → Select your repo
   - Set root directory to `apps/web`
   - Add environment variables

3. **Configure CORS:**
   - Update `CORS_ORIGIN` in Railway with your Vercel URL
   - Update `NEXT_PUBLIC_API_URL` in Vercel with your Railway URL

#### **Automated Deployment**
```bash
# Deploy frontend to Vercel
./scripts/deploy-vercel.sh

# Follow Railway deployment guide
```

### **Local Development**
```bash
# Build all packages and apps
npm run build

# Start production servers
npm start
```

### **Docker Deployment**
```bash
# Build and run with Docker Compose
docker-compose up -d
```

### **Cost: $0/month**
- **Vercel**: FREE (100GB bandwidth)
- **Railway**: FREE ($5 credit monthly)
- **Neon**: FREE (generous free tier)

## 🚀 **Production-Ready Features**

### **Security & Monitoring**
- **Enterprise-grade security** with rate limiting, input sanitization, and security headers
- **Comprehensive monitoring** with health checks, structured logging, and performance metrics
- **Real-time observability** with request tracking and error monitoring
- **Security event logging** and audit trails

### **Performance & Scalability**
- **Redis-based caching** for improved response times
- **Response compression** for reduced bandwidth usage
- **Database query optimization** with performance monitoring
- **Load testing framework** with Artillery integration
- **Auto-scaling** on Vercel and Railway

### **Database & Infrastructure**
- **Production database setup** with automated backups and migrations
- **Database health monitoring** and maintenance scripts
- **Connection pooling** and query optimization
- **Data integrity** with foreign key constraints and validation

### **Deployment & CI/CD**
- **Automated deployment** with GitHub Actions
- **Docker containerization** for consistent environments
- **Kubernetes manifests** for production orchestration
- **Health checks** and rollback capabilities
- **Free hosting** with Vercel + Railway + Neon

## 📊 **Current Status**

### **✅ Completed Features**
- User authentication and authorization
- Client portfolio management
- Resume upload and management
- Job preference tracking
- **Job aggregation system with Adzuna and Jooble APIs**
- **Multi-source job search with caching and deduplication**
- **Job storage with TTL cleanup and auto-apply status tracking**
- Application status tracking
- Professional modal interfaces
- Payment model implementation
- Responsive design
- **Production-ready security (rate limiting, input sanitization, security headers)**
- **Comprehensive monitoring and observability (health checks, logging, metrics)**
- **Database production setup (backups, migrations, maintenance)**
- **CI/CD pipeline with automated testing and deployment**
- **Performance optimization (caching, compression, query optimization)**
- **Load testing framework with Artillery integration**
- **Free hosting deployment (Vercel + Railway + Neon)**

### **🔄 In Development**
- Email notifications
- Calendar integration
- Advanced reporting
- Client portal access
- Mobile app

### **📅 Planned Features**
- AI-powered resume optimization
- Job matching algorithms
- Interview preparation tools
- Integration with job boards
- Advanced analytics dashboard

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 **License**

MIT License - see [LICENSE](LICENSE) file for details.

## 📞 **Support**

For support and questions:
- **Email**: support@interviewsfirst.com
- **Documentation**: [Platform Guide](docs/PLATFORM_GUIDE.md)
- **Payment Model**: [Payment Guide](docs/PAYMENT_MODEL_GUIDE.md) 