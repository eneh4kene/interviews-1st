// API service layer for frontend
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001') + '/api';

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

            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    ...options.headers,
                },
                ...options,
            });

            console.log('📡 API Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API Error Response:', errorText);
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

    async uploadResume(formData: FormData): Promise<ApiResponse<any>> {
        try {
            const url = `${API_BASE_URL}/resumes`;
            console.log('🌐 Making resume upload request to:', url);

            const response = await fetch(url, {
                method: 'POST',
                body: formData, // Don't set Content-Type for FormData
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                },
            });

            console.log('📡 Resume Upload Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Resume Upload Error Response:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ Resume Upload Success:', data.success);
            return convertDates(data);
        } catch (error) {
            console.error('❌ Resume upload failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
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
}

export const apiService = new ApiService(); 