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

- **Monorepo**: Turborepo with npm workspaces
- **Frontend**: Next.js 14 with App Router, Tailwind CSS, shadcn/ui
- **Backend**: Express.js with TypeScript, Zod validation, security middleware
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Payment**: Stripe integration
- **Authentication**: JWT-based with refresh tokens

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
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: API protection against abuse
- **Input Validation**: Zod schema validation
- **CORS Configuration**: Secure cross-origin requests
- **Helmet.js**: Security headers
- **Request Logging**: Pino HTTP logger

### **Data Protection**
- **GDPR Compliance**: Data privacy regulations
- **Encryption**: Data at rest and in transit
- **Access Control**: Role-based permissions
- **Audit Logs**: Complete activity tracking

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

### **@interview-me/ui**
Reusable UI components built with shadcn/ui and Tailwind CSS:
- Button, Card, Input, Label, Select
- Modal components for forms
- Loading states and error handling
- Responsive design utilities

## 📝 **Environment Variables**

### **Root (.env)**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jobplace
REDIS_URL=redis://localhost:6379
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
JWT_PRIVATE_KEY=your_jwt_private_key
JWT_PUBLIC_KEY=your_jwt_public_key
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

### **Web App (.env.local)**
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

### **API (.env)**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jobplace
REDIS_URL=redis://localhost:6379
PORT=3001
NODE_ENV=development
```

## 🚀 **Deployment**

### **Production Build**
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