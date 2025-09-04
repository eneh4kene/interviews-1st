// API service layer for frontend
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002') + '/api';

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
            const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    ...authHeaders,
                    ...options.headers,
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

    // Clients
    async getClients(workerId: string, status?: string): Promise<ApiResponse<any[]>> {
        const params = new URLSearchParams({ workerId });
        if (status && status !== 'all') {
            params.append('status', status);
        }
        return this.request(`/clients?${params.toString()}`);
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

    // Dashboard Stats
    async getDashboardStats(workerId: string): Promise<ApiResponse<any>> {
        return this.request(`/clients/stats/dashboard?workerId=${workerId}`);
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
            const response = await fetch(url, {
                method: 'POST',
                body: formData, // Don't set Content-Type for FormData
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
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
}

export const apiService = new ApiService(); 