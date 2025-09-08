// API service layer for frontend
const API_BASE_URL = '/api';

console.log('🔧 API_BASE_URL configured as:', API_BASE_URL);

// Utility function to convert API date strings to Date objects
const convertDates = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;

    if (Array.isArray(obj)) {
        return obj.map(convertDates);
    }

    if (typeof obj === 'object') {
        const converted: any = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string' && (key.includes('Date') || key.includes('At'))) {
                // Convert date strings to Date objects
                converted[key] = new Date(value);
            } else if (typeof value === 'object' && value !== null) {
                converted[key] = convertDates(value);
            } else {
                converted[key] = value;
            }
        }
        return converted;
    }

    return obj;
};

export interface ApiError {
    success: false;
    error: string;
    message?: string;
}

export interface ApiSuccess<T> {
    success: true;
    data: T;
    message?: string;
}

export type ApiResponse<T = any> = ApiSuccess<T> | ApiError;

class ApiService {
    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        try {
            const url = `${API_BASE_URL}${endpoint}`;
            console.log('🌐 Making API request to:', url);

            // Get access token from localStorage
            const token = localStorage.getItem('accessToken');
            const authHeaders: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};

            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    ...authHeaders,
                    ...(options.headers as Record<string, string>),
                },
                ...options,
            });

            console.log('📡 API Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API Error Response:', errorText);

                // Handle 401 Unauthorized - redirect to login
                if (response.status === 401) {
                    localStorage.removeItem('user');
                    localStorage.removeItem('accessToken');
                    window.location.href = '/login';
                    return {
                        success: false,
                        error: 'Authentication required',
                    };
                }

                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ API Success:', data.success);
            return convertDates(data);
        } catch (error) {
            console.error('❌ API request failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    // Authentication
    async login(email: string, password: string): Promise<ApiResponse<{ user: any; accessToken: string }>> {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    }

    async refreshToken(): Promise<ApiResponse<{ accessToken: string }>> {
        return this.request('/auth/refresh', {
            method: 'POST',
        });
    }

    async getCurrentUser(): Promise<ApiResponse<any>> {
        return this.request('/auth/me');
    }

    async changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<ApiResponse<any>> {
        return this.request('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({
                currentPassword,
                newPassword,
                confirmPassword
            }),
        });
    }

    async resetUserPassword(userId: string, newPassword: string): Promise<ApiResponse<any>> {
        return this.request('/admin/reset-password', {
            method: 'POST',
            body: JSON.stringify({
                userId,
                newPassword
            }),
        });
    }

    // Clients
    async getClients(workerId?: string, status?: string): Promise<ApiResponse<any[]>> {
        const params = new URLSearchParams();
        if (workerId) {
            params.append('workerId', workerId);
        }
        if (status && status !== 'all') {
            params.append('status', status);
        }
        const queryString = params.toString();
        return this.request(`/clients${queryString ? `?${queryString}` : ''}`);
    }

    async getClient(id: string): Promise<ApiResponse<any>> {
        return this.request(`/clients/${id}`);
    }

    async createClient(clientData: any): Promise<ApiResponse<any>> {
        return this.request('/clients', {
            method: 'POST',
            body: JSON.stringify(clientData),
        });
    }

    async updateClient(id: string, clientData: any): Promise<ApiResponse<any>> {
        return this.request(`/clients/${id}`, {
            method: 'PUT',
            body: JSON.stringify(clientData),
        });
    }

    async deleteClient(id: string): Promise<ApiResponse<void>> {
        return this.request(`/clients/${id}`, {
            method: 'DELETE',
        });
    }

    // Dashboard Stats - DEPRECATED: Use client-side calculation instead
    async getDashboardStats(workerId?: string): Promise<ApiResponse<any>> {
        // This function is deprecated - stats should be calculated client-side from clients data
        console.error('🚨 DEPRECATED: getDashboardStats called - this should not happen!');
        console.trace('Stack trace for deprecated getDashboardStats call:');
        return {
            success: false,
            error: 'getDashboardStats is deprecated - use client-side calculation instead'
        };
    }

    // Interviews
    async getInterviews(clientId?: string): Promise<ApiResponse<any[]>> {
        const params = clientId ? `?clientId=${clientId}` : '';
        return this.request(`/interviews${params}`);
    }

    async getInterview(id: string): Promise<ApiResponse<any>> {
        return this.request(`/interviews/${id}`);
    }

    async scheduleInterview(interviewData: any): Promise<ApiResponse<any>> {
        return this.request('/interviews', {
            method: 'POST',
            body: JSON.stringify(interviewData),
        });
    }

    async respondToInterview(id: string, response: any): Promise<ApiResponse<any>> {
        return this.request(`/interviews/${id}/respond`, {
            method: 'POST',
            body: JSON.stringify(response),
        });
    }

    async payForInterview(id: string, paymentData: any): Promise<ApiResponse<any>> {
        return this.request(`/interviews/${id}/pay`, {
            method: 'POST',
            body: JSON.stringify(paymentData),
        });
    }

    // Auto-assignment
    async autoAssignClient(clientData: any): Promise<ApiResponse<any>> {
        return this.request('/clients/auto-assign', {
            method: 'POST',
            body: JSON.stringify(clientData),
        });
    }

    // Resumes
    async getResumes(clientId: string): Promise<ApiResponse<any[]>> {
        return this.request(`/resumes?clientId=${clientId}`);
    }

    async getResume(id: string): Promise<ApiResponse<any>> {
        return this.request(`/resumes/${id}`);
    }

    // Admin API methods
    async getAdminOverview(): Promise<ApiResponse<any>> {
        return this.request('/admin/overview');
    }

    async getAdminActivity(limit: number = 20): Promise<ApiResponse<any[]>> {
        return this.request(`/admin/activity?limit=${limit}`);
    }

    async getAdminHealth(): Promise<ApiResponse<any>> {
        return this.request('/admin/health');
    }

    async getWorkerPerformance(): Promise<ApiResponse<any[]>> {
        return this.request('/admin/workers/performance');
    }

    // Worker Management API methods
    async getWorkers(page: number = 1, limit: number = 10, search: string = '', status: string = 'all'): Promise<ApiResponse<any>> {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            search,
            status
        });
        return this.request(`/admin/workers?${params}`);
    }

    async getWorker(id: string): Promise<ApiResponse<any>> {
        return this.request(`/admin/workers/${id}`);
    }

    async createWorker(workerData: {
        name: string;
        email: string;
        password: string;
        role?: 'WORKER' | 'MANAGER';
        isActive?: boolean;
        twoFactorEnabled?: boolean;
    }): Promise<ApiResponse<any>> {
        return this.request('/admin/workers', {
            method: 'POST',
            body: JSON.stringify(workerData),
        });
    }

    async updateWorker(id: string, workerData: {
        name?: string;
        email?: string;
        role?: 'WORKER' | 'MANAGER';
        isActive?: boolean;
        twoFactorEnabled?: boolean;
    }): Promise<ApiResponse<any>> {
        return this.request(`/admin/workers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(workerData),
        });
    }

    async deleteWorker(id: string): Promise<ApiResponse<any>> {
        return this.request(`/admin/workers/${id}`, {
            method: 'DELETE',
        });
    }

    async reactivateWorker(id: string): Promise<ApiResponse<any>> {
        return this.request(`/admin/workers/${id}/reactivate`, {
            method: 'POST',
        });
    }

    async uploadResume(formData: FormData): Promise<ApiResponse<any>> {
        try {
            const url = `${API_BASE_URL}/resumes`;

            // Get access token from localStorage
            const token = localStorage.getItem('accessToken');
            const authHeaders: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};

            const response = await fetch(url, {
                method: 'POST',
                body: formData, // Don't set Content-Type for FormData
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    ...authHeaders,
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: Failed to upload resume`);
            }

            const data = await response.json();
            return {
                success: true,
                data: data.data,
                message: data.message,
            };
        } catch (error) {
            console.error('Upload resume error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to upload resume',
            };
        }
    }

    async updateResume(id: string, resumeData: any): Promise<ApiResponse<any>> {
        return this.request(`/resumes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(resumeData),
        });
    }

    async deleteResume(id: string): Promise<ApiResponse<void>> {
        return this.request(`/resumes/${id}`, {
            method: 'DELETE',
        });
    }

    async downloadResume(id: string): Promise<Blob> {
        const url = `${API_BASE_URL}/resumes/${id}/download`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Failed to download resume`);
        }
        return response.blob();
    }

    // Job Preferences
    async getJobPreferences(clientId: string): Promise<ApiResponse<any[]>> {
        return this.request(`/job-preferences?clientId=${clientId}`);
    }

    async getJobPreference(id: string): Promise<ApiResponse<any>> {
        return this.request(`/job-preferences/${id}`);
    }

    async createJobPreference(jobPreferenceData: any): Promise<ApiResponse<any>> {
        return this.request('/job-preferences', {
            method: 'POST',
            body: JSON.stringify(jobPreferenceData),
        });
    }

    async updateJobPreference(id: string, jobPreferenceData: any): Promise<ApiResponse<any>> {
        return this.request(`/job-preferences/${id}`, {
            method: 'PUT',
            body: JSON.stringify(jobPreferenceData),
        });
    }

    async deleteJobPreference(id: string): Promise<ApiResponse<void>> {
        return this.request(`/job-preferences/${id}`, {
            method: 'DELETE',
        });
    }

    // Applications
    async getApplications(clientId: string): Promise<ApiResponse<any[]>> {
        return this.request(`/applications?clientId=${clientId}`);
    }

    async getApplication(id: string): Promise<ApiResponse<any>> {
        return this.request(`/applications/${id}`);
    }

    async createApplication(applicationData: any): Promise<ApiResponse<any>> {
        return this.request('/applications', {
            method: 'POST',
            body: JSON.stringify(applicationData),
        });
    }

    async updateApplication(id: string, applicationData: any): Promise<ApiResponse<any>> {
        return this.request(`/applications/${id}`, {
            method: 'PUT',
            body: JSON.stringify(applicationData),
        });
    }

    async deleteApplication(id: string): Promise<ApiResponse<void>> {
        return this.request(`/applications/${id}`, {
            method: 'DELETE',
        });
    }

    // Analytics API methods
    async getAnalyticsOverview(period: string = '30d'): Promise<ApiResponse<any>> {
        return this.request(`/admin/analytics/overview?period=${period}`);
    }

    async getRevenueAnalytics(period: string = '30d', groupBy: string = 'day'): Promise<ApiResponse<any>> {
        return this.request(`/admin/analytics/revenue?period=${period}&groupBy=${groupBy}`);
    }

    async getEngagementAnalytics(period: string = '30d'): Promise<ApiResponse<any>> {
        return this.request(`/admin/analytics/engagement?period=${period}`);
    }

    async getWorkerAnalytics(period: string = '30d', sortBy: string = 'revenue'): Promise<ApiResponse<any>> {
        return this.request(`/admin/analytics/workers?period=${period}&sortBy=${sortBy}`);
    }

    async exportAnalytics(type: string = 'overview', format: string = 'json', period: string = '30d'): Promise<ApiResponse<any>> {
        return this.request(`/admin/analytics/export?type=${type}&format=${format}&period=${period}`);
    }

    // Admin Client Management API methods
    async getAdminClients(page: number = 1, limit: number = 10, search: string = '', status: string = 'all', workerId: string = 'all', sortBy: string = 'created_at', sortOrder: string = 'desc'): Promise<ApiResponse<any>> {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            search,
            status,
            workerId,
            sortBy,
            sortOrder
        });
        return this.request(`/admin/clients?${params}`);
    }

    async getAdminClient(id: string): Promise<ApiResponse<any>> {
        return this.request(`/admin/clients/${id}`);
    }

    async createAdminClient(clientData: {
        workerId: string;
        name: string;
        email: string;
        phone?: string;
        linkedinUrl?: string;
        status?: string;
    }): Promise<ApiResponse<any>> {
        return this.request('/admin/clients', {
            method: 'POST',
            body: JSON.stringify(clientData),
        });
    }

    async updateAdminClient(id: string, clientData: {
        name?: string;
        email?: string;
        phone?: string;
        linkedinUrl?: string;
        status?: string;
        paymentStatus?: string;
        workerId?: string;
    }): Promise<ApiResponse<any>> {
        return this.request(`/admin/clients/${id}`, {
            method: 'PUT',
            body: JSON.stringify(clientData),
        });
    }

    async deleteAdminClient(id: string): Promise<ApiResponse<any>> {
        return this.request(`/admin/clients/${id}`, {
            method: 'DELETE',
        });
    }

    async getClientStats(period: string = '30d'): Promise<ApiResponse<any>> {
        return this.request(`/admin/clients/stats?period=${period}`);
    }

    async bulkAssignClients(clientIds: string[], workerId: string): Promise<ApiResponse<any>> {
        return this.request('/admin/clients/bulk-assign', {
            method: 'POST',
            body: JSON.stringify({ clientIds, workerId }),
        });
    }

    // Admin Interview Management API methods
    async getAdminInterviews(page: number = 1, limit: number = 10, search: string = '', status: string = 'all', clientId: string = 'all', workerId: string = 'all', sortBy: string = 'scheduled_date', sortOrder: string = 'desc', dateFrom: string = '', dateTo: string = ''): Promise<ApiResponse<any>> {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            search,
            status,
            clientId,
            workerId,
            sortBy,
            sortOrder,
            dateFrom,
            dateTo
        });
        return this.request(`/admin/interviews?${params}`);
    }

    async getAdminInterview(id: string): Promise<ApiResponse<any>> {
        return this.request(`/admin/interviews/${id}`);
    }

    async createInterview(interviewData: {
        clientId: string;
        title: string;
        companyName: string;
        jobTitle: string;
        scheduledDate: string;
        interviewType?: string;
        status?: string;
        paymentAmount?: number;
        paymentCurrency?: string;
    }): Promise<ApiResponse<any>> {
        return this.request('/admin/interviews', {
            method: 'POST',
            body: JSON.stringify(interviewData),
        });
    }

    async updateInterview(id: string, interviewData: {
        title?: string;
        companyName?: string;
        jobTitle?: string;
        scheduledDate?: string;
        interviewType?: string;
        status?: string;
        paymentStatus?: string;
        paymentAmount?: number;
        paymentCurrency?: string;
        clientResponseNotes?: string;
        workerNotes?: string;
        feedbackScore?: number;
        feedbackNotes?: string;
    }): Promise<ApiResponse<any>> {
        return this.request(`/admin/interviews/${id}`, {
            method: 'PUT',
            body: JSON.stringify(interviewData),
        });
    }

    async deleteInterview(id: string): Promise<ApiResponse<any>> {
        return this.request(`/admin/interviews/${id}`, {
            method: 'DELETE',
        });
    }

    async getInterviewStats(period: string = '30d'): Promise<ApiResponse<any>> {
        return this.request(`/admin/interviews/stats?period=${period}`);
    }

    async updateInterviewStatus(id: string, status: string, notes?: string): Promise<ApiResponse<any>> {
        return this.request(`/admin/interviews/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status, notes }),
        });
    }

    async addInterviewFeedback(id: string, feedbackScore: number, feedbackNotes?: string): Promise<ApiResponse<any>> {
        return this.request(`/admin/interviews/${id}/feedback`, {
            method: 'POST',
            body: JSON.stringify({ feedbackScore, feedbackNotes }),
        });
    }
}

export const apiService = new ApiService(); 