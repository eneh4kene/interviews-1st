# Replit AI Deployment Prompt

## 🚀 **Application Overview**
This is a **Next.js single-service application** that combines frontend and backend into one unified service. The application has been migrated from a Docker-based microservices architecture to a monolithic Next.js application with API routes.

## 📁 **Project Structure**
```
interview-me/

├── apps/web/                    # Main Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/            # Next.js API routes (backend)
│   │   │   │   ├── auth/       # Authentication endpoints
│   │   │   │   ├── clients/    # Client management
│   │   │   │   ├── resumes/    # Resume upload/management
│   │   │   │   ├── job-preferences/ # Job preferences
│   │   │   │   └── applications/ # Job applications
│   │   │   ├── dashboard/      # Worker dashboard
│   │   │   ├── login/          # Login pages
│   │   │   └── page.tsx        # Home page
│   │   ├── components/         # React components
│   │   └── lib/               # Utilities and API client
│   ├── .env.local             # Environment variables
│   ├── package.json           # Dependencies
│   └── next.config.js         # Next.js configuration
├── packages/                   # Shared packages
│   ├── types/                 # TypeScript types
│   └── ui/                    # UI components
├── nixpacks.toml             # Replit build configuration
├── deploy-replit.sh          # Deployment script
└── schema.sql                # Database schema
```

## 🛠 **How to Run the Application**

### **1. Install Dependencies**
```bash
cd apps/web
npm install
```

### **2. Set Up Environment Variables**
Create `.env.local` in `apps/web/` with these variables:
```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# Redis (optional - will use mock if not available)
REDIS_URL=redis://localhost:6379

# API Configuration
NEXT_PUBLIC_API_BASE_URL=/api
```

### **3. Build the Application**
```bash
cd apps/web
npm run build
```

### **4. Start the Application**
```bash
cd apps/web
npm start
```

**OR use the deployment script:**
```bash
chmod +x deploy-replit.sh
./deploy-replit.sh
```

## 🔧 **Build Configuration (nixpacks.toml)**
The application uses Nixpacks for automatic build detection. The `nixpacks.toml` file specifies:
- **Build command**: `cd apps/web && npm install && npm run build`
- **Start command**: `cd apps/web && npm start`
- **Node.js version**: 18.x

## 📊 **Database Requirements**
- **PostgreSQL** database (Neon, Supabase, or any PostgreSQL provider)
- **Redis** (optional - application will use mock Redis if not available)
- Database schema is in `schema.sql`

## 🔑 **Key Features**
1. **Authentication System**: JWT-based login for workers, clients, and admins
2. **Client Management**: CRUD operations for client profiles
3. **Resume Upload**: File upload with validation (PDF, DOC, DOCX)
4. **Job Preferences**: Job search preferences management
5. **Dashboard**: Worker dashboard with statistics
6. **API Routes**: All backend functionality in Next.js API routes

## 🚨 **Important Notes**
- **No Docker required** - this is a single Next.js service
- **Port**: Application runs on port 3000 by default
- **Environment**: All environment variables must be set in `.env.local`
- **Database**: Must have PostgreSQL connection string
- **File Uploads**: Resume files are stored in `public/uploads/resumes/`

## 🔍 **Troubleshooting**
1. **Database Connection Issues**: Check `DATABASE_URL` in `.env.local`
2. **Build Failures**: Ensure all dependencies are installed with `npm install`
3. **API 404 Errors**: Verify API routes are in `src/app/api/` directory
4. **File Upload Issues**: Check file permissions and upload directory exists

## 📝 **Available Scripts**
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm start` - Production server
- `npm run type-check` - TypeScript type checking

## 🌐 **API Endpoints**
- `POST /api/auth/login` - User authentication
- `GET /api/clients` - List clients
- `POST /api/clients` - Create client
- `PUT /api/clients/[id]` - Update client
- `DELETE /api/clients/[id]` - Delete client
- `POST /api/resumes` - Upload resume
- `POST /api/job-preferences` - Create job preference
- `GET /api/health` - Health check

## 🎯 **Deployment Steps for Replit**
1. Import this repository from GitHub
2. Set up environment variables in Replit Secrets
3. Run `npm install` in `apps/web` directory
4. Run `npm run build` in `apps/web` directory
5. Run `npm start` in `apps/web` directory
6. Application will be available on the Replit URL

**The application is ready to run as a single Next.js service!**
