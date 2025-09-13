// AI Applications Tab Component
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@interview-me/ui';
import { Button } from '@interview-me/ui';
import { Badge } from '@interview-me/ui';
import { 
  RefreshCw, 
  Settings, 
  Search, 
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Check,
  X,
  Loader2
} from 'lucide-react';
import { AiApplicationStatus } from '@/lib/services/AiApplyService';
import { apiService } from '@/lib/api';

interface AiApplicationsTabProps {
  clientId: string;
  onApplicationUpdate?: (application: AiApplicationStatus) => void;
}

interface ApplicationStats {
  total: number;
  pending: number;
  processing: number;
  successful: number;
  failed: number;
  awaiting_approval: number;
}

export default function AiApplicationsTab({ clientId, onApplicationUpdate }: AiApplicationsTabProps) {
  const [applications, setApplications] = useState<AiApplicationStatus[]>([]);
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });
  const [selectedApplication, setSelectedApplication] = useState<AiApplicationStatus | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Fetch applications and stats
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching AI applications for client:', clientId);
      console.log('🔍 API service token:', localStorage.getItem('accessToken'));

      // Fetch applications
      const response = await apiService.get(`/ai-apply/applications/${clientId}`);
      
      console.log('🔍 AI applications response:', response);
      
      if (!response.success) {
        throw new Error(response.error);
      }

      const fetchedApplications = (response.data as any)?.applications || [];
      setApplications(fetchedApplications);

      // Calculate stats
      const calculatedStats = calculateStats(fetchedApplications);
      setStats(calculatedStats);

    } catch (err) {
      console.error('❌ Failed to fetch AI applications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (apps: AiApplicationStatus[]): ApplicationStats => {
    return {
      total: apps.length,
      pending: apps.filter(app => app.status === 'queued').length,
      processing: apps.filter(app => ['processing', 'email_discovery', 'generating_content'].includes(app.status)).length,
      successful: apps.filter(app => app.status === 'successful').length,
      failed: apps.filter(app => app.status === 'failed').length,
      awaiting_approval: apps.filter(app => app.status === 'awaiting_approval').length
    };
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Filter applications
  const filteredApplications = applications.filter(app => {
    if (filters.status !== 'all' && app.status !== filters.status) {
      return false;
    }
    if (filters.search && !app.job_title.toLowerCase().includes(filters.search.toLowerCase()) &&
        !app.company_name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Handle application actions
  const handleApprove = async (application: AiApplicationStatus) => {
    try {
      const response = await apiService.post(`/ai-apply/approve`, {
        application_id: application.id
      });

      if (response.success) {
        await fetchData();
        if (onApplicationUpdate) {
          onApplicationUpdate(application);
        }
      } else {
        alert(`Failed to approve: ${response.error}`);
      }
    } catch (error) {
      console.error('Error approving application:', error);
      alert('Failed to approve application');
    }
  };

  const handleReject = async (application: AiApplicationStatus) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      const response = await apiService.post(`/ai-apply/reject`, {
        application_id: application.id,
        reason
      });

      if (response.success) {
        await fetchData();
        if (onApplicationUpdate) {
          onApplicationUpdate(application);
        }
      } else {
        alert(`Failed to reject: ${response.error}`);
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      alert('Failed to reject application');
    }
  };

  const handleReview = (application: AiApplicationStatus) => {
    setSelectedApplication(application);
    setShowReviewModal(true);
  };

  // Get status badge
  const getStatusBadge = (status: string, progress: number) => {
    const statusConfig = {
      queued: { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Queued' },
      processing: { color: 'bg-blue-100 text-blue-800', icon: Loader2, label: 'Processing' },
      email_discovery: { color: 'bg-yellow-100 text-yellow-800', icon: Search, label: 'Finding Email' },
      generating_content: { color: 'bg-purple-100 text-purple-800', icon: Loader2, label: 'Generating Content' },
      awaiting_approval: { color: 'bg-orange-100 text-orange-800', icon: AlertCircle, label: 'Awaiting Approval' },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Approved' },
      submitted: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, label: 'Submitted' },
      successful: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Successful' },
      failed: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Failed' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.queued;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
        {progress > 0 && progress < 100 && (
          <span className="ml-1">({progress}%)</span>
        )}
      </Badge>
    );
  };

  // Get action buttons for application
  const getActionButtons = (application: AiApplicationStatus) => {
    switch (application.status) {
      case 'awaiting_approval':
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleReview(application)}
              className="flex items-center gap-1"
            >
              <Eye className="h-3 w-3" />
              Review
            </Button>
            <Button
              size="sm"
              onClick={() => handleApprove(application)}
              className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
            >
              <Check className="h-3 w-3" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleReject(application)}
              className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
            >
              <X className="h-3 w-3" />
              Reject
            </Button>
          </div>
        );
      case 'successful':
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleReview(application)}
            className="flex items-center gap-1"
          >
            <Eye className="h-3 w-3" />
            View Details
          </Button>
        );
      case 'failed':
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleReview(application)}
            className="flex items-center gap-1"
          >
            <Eye className="h-3 w-3" />
            View Error
          </Button>
        );
      default:
        return null;
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchData();
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading AI applications...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">AI Applications</h3>
          <p className="text-sm text-gray-600">
            Manage AI-powered job applications for this client
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
              <div className="text-sm text-gray-600">Processing</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{stats.awaiting_approval}</div>
              <div className="text-sm text-gray-600">Pending Review</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
              <div className="text-sm text-gray-600">Successful</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange({ status: e.target.value })}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="queued">Queued</option>
            <option value="processing">Processing</option>
            <option value="email_discovery">Email Discovery</option>
            <option value="generating_content">Generating Content</option>
            <option value="awaiting_approval">Awaiting Approval</option>
            <option value="approved">Approved</option>
            <option value="submitted">Submitted</option>
            <option value="successful">Successful</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className="flex items-center gap-2 flex-1">
          <Search className="h-4 w-4" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={filters.search}
            onChange={(e) => handleFilterChange({ search: e.target.value })}
            className="flex-1 px-3 py-1 border border-gray-300 rounded-md text-sm"
          />
        </div>
      </div>

      {/* Applications List */}
      {error ? (
        <Card>
          <CardContent className="p-6 text-center">
            <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchData} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : filteredApplications.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-gray-500">
              {applications.length === 0 
                ? 'No AI applications found for this client'
                : 'No applications match the current filters'
              }
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((application) => (
            <Card key={application.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium">{application.job_title}</h4>
                      {getStatusBadge(application.status, application.progress)}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {application.company_name}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Created: {new Date(application.created_at).toLocaleDateString()}</span>
                      {application.target_email && (
                        <span>Target: {application.target_email}</span>
                      )}
                      {application.email_confidence_score && (
                        <span>Confidence: {(application.email_confidence_score * 100).toFixed(0)}%</span>
                      )}
                    </div>
                    {application.error_message && (
                      <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                        Error: {application.error_message}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getActionButtons(application)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Modal Placeholder */}
      {showReviewModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Review AI Application</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReviewModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">{selectedApplication.job_title}</h4>
                <p className="text-sm text-gray-600">{selectedApplication.company_name}</p>
              </div>
              <div className="text-sm text-gray-500">
                Review modal content will be implemented here
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowReviewModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    handleApprove(selectedApplication);
                    setShowReviewModal(false);
                  }}
                >
                  Approve & Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
