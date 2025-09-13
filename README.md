# InterviewsFirst - Job Placement Platform

A modern B2B SaaS platform for career coaches, recruiters, and job placement professionals to manage their clients' job search portfolios and track interview success rates.

## 🎯 **Platform Overview**

**InterviewsFirst** is a comprehensive job placement platform that operates on a unique **£10 per interview payment model**. Clients only pay when they accept an interview invitation, creating a risk-free, transparent pricing structure.

### **Key Features**
- **Client Portfolio Management**: Manage job seekers with detailed profiles
- **Resume Management**: Upload, organize, and manage multiple resume versions
- **Job Preference Tracking**: Set target roles, locations, and requirements
- **Application Tracking**: Monitor job applications and interview status
- **Interview Scheduling**: Schedule interviews on behalf of clients
- **Payment Processing**: £10 fee when clients accept interviews
- **Analytics Dashboard**: Track success rates and performance metrics

## 🏗️ **Architecture**

- **Single Service**: Next.js 14 with API routes (no separate backend required)
- **Frontend**: Next.js 14 with App Router, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes with TypeScript (consolidated from Express.js)
- **Database**: PostgreSQL (Neon in production)
- **Cache**: Redis (optional - uses mock if not available)
- **Authentication**: JWT-based with refresh tokens
- **Deployment**: Single service deployment (Vercel, Railway, or Replit)

## 📁 **Project Structure**

```
interview-me/
├── apps/
│   └── web/                    # Next.js single service application
│       ├── src/
│       │   ├── app/
│       │   │   ├── api/        # Next.js API routes (consolidated backend)
│       │   │   │   ├── jobs/   # Job discovery and classification APIs
│       │   │   │   ├── emails/ # Email management APIs
│       │   │   │   └── ...     # Other API endpoints
│       │   │   ├── dashboard/  # Worker dashboard
│       │   │   ├── login/      # Login pages
│       │   │   └── page.tsx    # Home page
│       │   ├── components/     # React components
│       │   └── lib/           # Services and utilities
│       ├── .env.local         # Environment variables
│       └── package.json       # Dependencies
├── packages/
│   ├── types/                 # Shared TypeScript types
│   └── ui/                    # Shared UI components
├── scripts/                   # Database initialization scripts
└── schema.sql                 # Database schema
```

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+
- npm 10+
- PostgreSQL database (or Neon account)

### **1. Clone and Install**
```bash
git clone https://github.com/eneh4kene/interview-me.git
cd interview-me
npm install
```

### **2. Environment Setup**
```bash
# Copy environment example
cp env.example .env

# Edit with your configuration
# Set DATABASE_URL to your PostgreSQL connection string
```

### **3. Start the Application**
```bash
# Start development server
npm run dev

# Or build and start production
npm run build
npm start
```

### **4. Access the Application**
- **Application**: http://localhost:3000
- **API**: http://localhost:3000/api/*

## 👥 **User Types & Features**

### **Workers (Career Coaches/Recruiters)**
- **Dashboard**: Overview of all clients and performance metrics
- **Client Management**: Add, edit, and manage client profiles
- **Resume Management**: Upload and organize client resumes
- **Job Preferences**: Set target roles and requirements
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
- `GET /api/resumes` - Get resumes for client

### **Job Preferences**
- `GET /api/job-preferences` - Get job preferences for client
- `POST /api/job-preferences` - Create new job preference

### **Applications**
- `GET /api/applications` - Get applications for client
- `POST /api/applications` - Create new application

### **Health Check**
- `GET /api/health` - Application health status

## 💰 **Business Model**

### **£10 Per Interview Payment Model**
- **Zero Upfront Cost**: Clients sign up for free
- **Pay Only When Successful**: £10 charged only when interview is accepted
- **No Risk**: Clients don't pay until they have a real opportunity
- **Transparent Pricing**: Clear, simple fee structure

## 🔒 **Security & Compliance**

### **Security Features**
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Zod schema validation with sanitization
- **CORS Configuration**: Secure cross-origin requests
- **Password Management**: Secure password hashing with bcrypt

### **Data Protection**
- **Encryption**: Data at rest and in transit
- **Access Control**: Role-based permissions (Admin, Worker, Client)
- **Input Sanitization**: XSS protection and data validation

## 🛠️ **Development**

### **Available Scripts**
```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Lint code
npm run type-check   # Type check TypeScript
```

### **Database Setup**
```bash
# Initialize database with schema
psql -d your_database -f schema.sql

# Seed with sample data (optional)
node scripts/seed-database.js
```

## 📦 **Packages**

### **@interview-me/types**
Shared TypeScript interfaces and types:
- `Client` - Client profile information
- `Resume` - Resume data structure
- `JobPreference` - Job preference details
- `Application` - Application tracking data

### **@interview-me/ui**
Reusable UI components built with shadcn/ui and Tailwind CSS:
- Button, Card, Input, Label, Select
- Modal components for forms
- Loading states and error handling
- Responsive design utilities

## 📝 **Environment Variables**

### **Required Variables**
```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# API Configuration
NEXT_PUBLIC_API_BASE_URL=/api
```

### **Optional Variables**
```env
# Redis (optional - will use mock if not available)
REDIS_URL=redis://localhost:6379
```

## 🚀 **Deployment**

### **Vercel (Recommended)**
1. Connect your GitHub repository to Vercel
2. Set root directory to `apps/web`
3. Add environment variables
4. Deploy automatically on push

### **Railway**
1. Connect your GitHub repository to Railway
2. Set root directory to `apps/web`
3. Add environment variables
4. Deploy automatically on push

### **Replit**
1. Import from GitHub
2. Set environment variables in Replit Secrets
3. Run `npm install && npm run build && npm start`

## 📊 **Current Status**

### **✅ Completed Features**
- User authentication and authorization
- Client portfolio management
- Resume upload and management
- Job preference tracking
- Application status tracking
- Professional modal interfaces
- Payment model implementation
- Responsive design
- Single-service architecture

### **🔄 In Development**
- Email notifications
- Calendar integration
- Advanced reporting
- Client portal access

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
- **Documentation**: See `docs/` directory