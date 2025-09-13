// Common types shared across the monorepo

// Authentication Types
export interface User {
    id: string;
    email: string;
    name: string;
    role: 'WORKER' | 'MANAGER' | 'ADMIN' | 'CLIENT';
    isActive: boolean;
    twoFactorEnabled: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    success: boolean;
    data?: {
        user: User;
        accessToken: string;
    };
    message?: string;
    error?: string;
}

export interface RefreshTokenRequest {
    refreshToken: string;
}

export interface RefreshTokenResponse {
    success: boolean;
    data?: {
        accessToken: string;
        refreshToken: string;
    };
    message?: string;
    error?: string;
}

export interface MagicLinkRequest {
    email: string;
    interviewId: string;
}

export interface MagicLinkResponse {
    success: boolean;
    data?: {
        token: string;
        expiresAt: Date;
    };
    message?: string;
    error?: string;
}

export interface InterviewOffer {
    id: string;
    interviewId: string;
    clientId: string;
    token: string;
    status: 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
    expiresAt: Date;
    acceptedAt?: Date;
    declinedAt?: Date;
    paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
    stripeSessionId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface OfferAcceptRequest {
    token: string;
}

export interface OfferAcceptResponse {
    success: boolean;
    data?: {
        checkoutUrl: string;
        sessionId: string;
    };
    message?: string;
    error?: string;
}

export interface OfferDeclineRequest {
    token: string;
    reason?: string;
}

export interface OfferDeclineResponse {
    success: boolean;
    message?: string;
    error?: string;
}

export interface Client {
    id: string;
    workerId: string; // The worker managing this client
    name: string;
    email: string;
    phone?: string;
    linkedinUrl?: string;
    profilePicture?: string;
    status: 'active' | 'inactive' | 'placed';
    paymentStatus: 'pending' | 'paid' | 'overdue';
    totalInterviews: number;
    totalPaid: number;
    isNew: boolean; // NEW: Indicates if client is newly assigned (within 72 hours)
    assignedAt: Date; // NEW: When the client was assigned to the worker
    createdAt: Date;
    updatedAt: Date;
}

export interface Resume {
    id: string;
    clientId: string;
    name: string; // e.g., "Software Engineer - Tech Companies"
    fileUrl: string;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface JobPreference {
    id: string;
    clientId: string;
    title: string; // e.g., "Senior Software Engineer"
    company?: string;
    location: string;
    workType: 'remote' | 'hybrid' | 'onsite';
    visaSponsorship: boolean;
    salaryRange?: {
        min: number;
        max: number;
        currency: string;
    };
    status: 'active' | 'paused' | 'achieved';
    createdAt: Date;
    updatedAt: Date;
}

export interface Application {
    id: string;
    clientId: string;
    jobPreferenceId: string;
    resumeId: string;
    companyName: string;
    jobTitle: string;
    applicationDate: Date;
    status: 'applied' | 'interviewing' | 'offered' | 'rejected' | 'accepted';
    interviewDate?: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Interview {
    id: string;
    applicationId: string;
    clientId: string;
    companyName: string;
    jobTitle: string;
    scheduledDate: Date;
    interviewType: 'phone' | 'video' | 'onsite' | 'technical' | 'behavioral';
    status: 'scheduled' | 'client_accepted' | 'client_declined' | 'completed' | 'cancelled';
    paymentStatus: 'pending' | 'paid' | 'failed';
    paymentAmount: number; // £10
    paymentCurrency: string; // GBP
    clientResponseDate?: Date;
    clientResponseNotes?: string;
    workerNotes?: string;
    paidAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface Payment {
    id: string;
    interviewId: string;
    clientId: string;
    amount: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    stripePaymentIntentId?: string;
    stripeCustomerId?: string;
    paymentMethod?: string;
    paidAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface ClientNotification {
    id: string;
    clientId: string;
    type: 'interview_scheduled' | 'payment_required' | 'payment_successful' | 'interview_reminder';
    title: string;
    message: string;
    isRead: boolean;
    actionRequired: boolean;
    actionUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface DashboardStats {
    totalClients: number;
    activeClients: number;
    newClients: number; // NEW: Number of clients assigned in the last 72 hours
    interviewsThisMonth: number;
    placementsThisMonth: number;
    successRate: number;
    pendingPayments: number;
    totalRevenue: number;
    interviewsScheduled: number;
    interviewsAccepted: number;
    interviewsDeclined: number;
}

// Job Aggregation Types
export type JobAggregator = 'adzuna' | 'jooble';

export type JobType = 'full-time' | 'part-time' | 'contract' | 'internship' | 'temporary' | 'freelance';

export type WorkLocation = 'remote' | 'hybrid' | 'onsite';

export type AutoApplyStatus =
    | 'eligible'           // Job is eligible for auto-apply
    | 'ineligible'         // Job is not eligible (e.g., requires manual application)
    | 'pending_review'     // Job needs manual review before auto-apply
    | 'applied'            // Auto-apply has been attempted
    | 'failed'             // Auto-apply failed
    | 'blacklisted';       // Job is blacklisted from auto-apply

export interface Job {
    id: string;
    title: string;
    company: string;
    company_website?: string; // Required for AI applicability
    location: string;
    salary?: string;
    descriptionSnippet: string;
    source: JobAggregator;
    postedDate: string;
    applyUrl: string;
    // Additional fields for enhanced functionality
    jobType?: JobType;
    workLocation?: WorkLocation;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
    requirements?: string[];
    benefits?: string[];
    // Auto-apply functionality
    autoApplyStatus: AutoApplyStatus;
    autoApplyNotes?: string;
    // Internal tracking
    externalId?: string; // Original ID from aggregator
    createdAt: Date;
    updatedAt: Date;
}

export interface JobSearchFilters {
    keywords?: string;
    location?: string;
    radius?: number; // in km
    jobType?: JobType[];
    workLocation?: WorkLocation[];
    salaryMin?: number;
    salaryMax?: number;
    postedWithin?: '24h' | '7d' | '30d' | 'all';
    company?: string;
    autoApplyEligible?: boolean;
    aiFilterType?: 'all' | 'ai_only' | 'manual_only' | 'high_confidence' | 'medium_confidence' | 'low_confidence';
    page?: number;
    limit?: number;
}

export interface JobSearchResponse {
    jobs: Job[];
    totalCount: number;
    page: number;
    totalPages: number;
    aggregatorResults: {
        [key in JobAggregator]?: {
            count: number;
            success: boolean;
            error?: string;
        };
    };
}

export interface AggregatorConfig {
    name: JobAggregator;
    apiKey: string;
    appId?: string; // For Adzuna
    baseUrl: string;
    rateLimit: {
        requestsPerMinute: number;
        requestsPerDay: number;
    };
    enabled: boolean;
}

export interface JobAggregatorResponse {
    success: boolean;
    jobs: Job[];
    error?: string;
    source: JobAggregator;
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
} 