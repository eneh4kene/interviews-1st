"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@interview-me/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@interview-me/ui";
import { Input } from "@interview-me/ui";
import { Label } from "@interview-me/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@interview-me/ui";
import { 
  Calendar, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Star,
  DollarSign,
  Phone,
  Mail,
  Building,
  Search,
  Filter,
  RefreshCw,
  Download,
  Video,
  PhoneCall,
  User,
  ArrowUpDown,
  CalendarDays,
  MessageSquare
} from "lucide-react";
import { apiService } from '../../../lib/api';
import Logo from '../../../components/Logo';

interface Interview {
  id: string;
  client_id: string;
  title: string;
  company_name: string;
  job_title: string;
  scheduled_date: string;
  interview_type: 'video' | 'phone' | 'in-person';
  status: 'scheduled' | 'completed' | 'client_accepted' | 'client_declined' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'overdue';
  payment_amount: number;
  payment_currency: string;
  client_response_date?: string;
  client_response_notes?: string;
  worker_notes?: string;
  feedback_score?: number;
  feedback_notes?: string;
  created_at: string;
  updated_at: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  worker_name?: string;
  worker_email?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface InterviewStats {
  total_interviews: number;
  scheduled_interviews: number;
  completed_interviews: number;
  accepted_interviews: number;
  declined_interviews: number;
  cancelled_interviews: number;
  paid_interviews: number;
  pending_payments: number;
  total_revenue: number;
  avg_payment_amount: number;
  avg_feedback_score: number;
  acceptance_rate: number;
}

export default function InterviewManagement() {
  const router = useRouter();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [stats, setStats] = useState<InterviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [workerFilter, setWorkerFilter] = useState('all');
  const [sortBy, setSortBy] = useState('scheduled_date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedInterviews, setSelectedInterviews] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Authentication check
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      const token = localStorage.getItem('accessToken');

      if (!stored || !token) {
        router.push('/login');
        return;
      }

      const user = JSON.parse(stored);
      if (user && user.role === 'ADMIN') {
        setIsAuthenticated(true);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
    }
  }, [router]);

  // Debounced search - only update searchTerm after user stops typing
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Fetch clients and workers for filters
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsResponse, workersResponse] = await Promise.all([
          apiService.getClients(1, 100, '', 'all'),
          apiService.getWorkers(1, 100, '', 'all')
        ]);

        if (clientsResponse.success) {
          setClients(clientsResponse.data.clients || []);
        }
        if (workersResponse.success) {
          setWorkers(workersResponse.data.workers || []);
        }
      } catch (error) {
        console.error('Error fetching filter data:', error);
      }
    };

    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  // Fetch interviews - only when searchTerm, page, status, client, worker, sort, or refresh changes
  useEffect(() => {
    const fetchInterviews = async () => {
      if (!isAuthenticated) return;

      setLoading(true);
      setError(null);

      try {
        const response = await apiService.getInterviews(
          currentPage,
          10,
          searchTerm,
          statusFilter,
          clientFilter,
          workerFilter,
          sortBy,
          sortOrder,
          dateFrom,
          dateTo
        );

        if (response.success) {
          setInterviews(response.data.interviews || []);
          setPagination(response.data.pagination || null);
        } else {
          setError(response.error || 'Failed to fetch interviews');
        }
      } catch (error) {
        console.error('Error fetching interviews:', error);
        setError('Failed to fetch interviews');
      } finally {
        setLoading(false);
      }
    };

    fetchInterviews();
  }, [isAuthenticated, searchTerm, currentPage, statusFilter, clientFilter, workerFilter, sortBy, sortOrder, dateFrom, dateTo, refreshTrigger]);

  // Fetch interview stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!isAuthenticated) return;

      try {
        const response = await apiService.getInterviewStats('30d');
        if (response.success) {
          setStats(response.data);
        }
      } catch (error) {
        console.error('Error fetching interview stats:', error);
      }
    };

    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated, refreshTrigger]);

  const handleRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleClientFilter = (clientId: string) => {
    setClientFilter(clientId);
    setCurrentPage(1);
  };

  const handleWorkerFilter = (workerId: string) => {
    setWorkerFilter(workerId);
    setCurrentPage(1);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleCreateInterview = async (interviewData: any) => {
    try {
      const response = await apiService.createInterview(interviewData);
      if (response.success) {
        setShowCreateModal(false);
        handleRefresh();
      } else {
        setError(response.error || 'Failed to create interview');
      }
    } catch (error) {
      console.error('Error creating interview:', error);
      setError('Failed to create interview');
    }
  };

  const handleUpdateInterview = async (id: string, interviewData: any) => {
    try {
      const response = await apiService.updateInterview(id, interviewData);
      if (response.success) {
        setEditingInterview(null);
        handleRefresh();
      } else {
        setError(response.error || 'Failed to update interview');
      }
    } catch (error) {
      console.error('Error updating interview:', error);
      setError('Failed to update interview');
    }
  };

  const handleDeleteInterview = async (id: string) => {
    if (!confirm('Are you sure you want to delete this interview?')) return;

    try {
      const response = await apiService.deleteInterview(id);
      if (response.success) {
        handleRefresh();
      } else {
        setError(response.error || 'Failed to delete interview');
      }
    } catch (error) {
      console.error('Error deleting interview:', error);
      setError('Failed to delete interview');
    }
  };

  const handleUpdateStatus = async (id: string, status: string, notes?: string) => {
    try {
      const response = await apiService.updateInterviewStatus(id, status, notes);
      if (response.success) {
        handleRefresh();
      } else {
        setError(response.error || 'Failed to update interview status');
      }
    } catch (error) {
      console.error('Error updating interview status:', error);
      setError('Failed to update interview status');
    }
  };

  const handleAddFeedback = async (id: string, feedbackScore: number, feedbackNotes?: string) => {
    try {
      const response = await apiService.addInterviewFeedback(id, feedbackScore, feedbackNotes);
      if (response.success) {
        handleRefresh();
      } else {
        setError(response.error || 'Failed to add feedback');
      }
    } catch (error) {
      console.error('Error adding feedback:', error);
      setError('Failed to add feedback');
    }
  };

  const handleSelectInterview = (interviewId: string) => {
    setSelectedInterviews(prev => 
      prev.includes(interviewId) 
        ? prev.filter(id => id !== interviewId)
        : [...prev, interviewId]
    );
  };

  const handleSelectAll = () => {
    if (selectedInterviews.length === interviews.length) {
      setSelectedInterviews([]);
    } else {
      setSelectedInterviews(interviews.map(interview => interview.id));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'client_accepted':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'client_declined':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'client_accepted':
        return 'bg-green-100 text-green-800';
      case 'client_declined':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getInterviewTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'phone':
        return <PhoneCall className="h-4 w-4" />;
      case 'in-person':
        return <User className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Logo />
              <h1 className="ml-4 text-xl font-semibold text-gray-900">Interview Management</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => router.push('/admin/dashboard')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Schedule Interview
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Calendar className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Interviews</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.total_interviews}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Accepted</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.accepted_interviews}</p>
                    <p className="text-xs text-gray-500">{stats.acceptance_rate}% rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                    <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.total_revenue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Star className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Avg Rating</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.avg_feedback_score.toFixed(1)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search interviews..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <Select value={statusFilter} onValueChange={handleStatusFilter}>
                    <SelectTrigger className="w-32 bg-white border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="client_accepted">Accepted</SelectItem>
                      <SelectItem value="client_declined">Declined</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={clientFilter} onValueChange={handleClientFilter}>
                    <SelectTrigger className="w-40 bg-white border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg">
                      <SelectItem value="all">All Clients</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={workerFilter} onValueChange={handleWorkerFilter}>
                    <SelectTrigger className="w-40 bg-white border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg">
                      <SelectItem value="all">All Workers</SelectItem>
                      {workers.map((worker) => (
                        <SelectItem key={worker.id} value={worker.id}>
                          {worker.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Input
                      type="date"
                      placeholder="From"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-32"
                    />
                    <Input
                      type="date"
                      placeholder="To"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-32"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interviews List */}
        <div className="grid gap-6">
          {loading ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading interviews...</p>
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={handleRefresh} variant="outline">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : interviews.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No interviews found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || statusFilter !== 'all' || clientFilter !== 'all' || workerFilter !== 'all'
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Get started by scheduling your first interview.'
                  }
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Interview
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Table Header */}
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={selectedInterviews.length === interviews.length && interviews.length > 0}
                              onChange={handleSelectAll}
                              className="rounded border-gray-300"
                            />
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('title')}
                          >
                            <div className="flex items-center gap-1">
                              Interview
                              <ArrowUpDown className="h-4 w-4" />
                            </div>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Client
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('scheduled_date')}
                          >
                            <div className="flex items-center gap-1">
                              Scheduled
                              <ArrowUpDown className="h-4 w-4" />
                            </div>
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('status')}
                          >
                            <div className="flex items-center gap-1">
                              Status
                              <ArrowUpDown className="h-4 w-4" />
                            </div>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Payment
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Worker
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {interviews.map((interview) => (
                          <tr key={interview.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedInterviews.includes(interview.id)}
                                onChange={() => handleSelectInterview(interview.id)}
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    {getInterviewTypeIcon(interview.interview_type)}
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {interview.title}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {interview.company_name} - {interview.job_title}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {interview.client_name || 'Unknown Client'}
                              </div>
                              {interview.client_email && (
                                <div className="text-sm text-gray-500">{interview.client_email}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {formatDate(interview.scheduled_date)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(interview.status)}`}>
                                  {getStatusIcon(interview.status)}
                                  <span className="ml-1 capitalize">{interview.status.replace('_', ' ')}</span>
                                </span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(interview.payment_status)}`}>
                                  {interview.payment_status}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {formatCurrency(interview.payment_amount, interview.payment_currency)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {interview.worker_name || 'Unassigned'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  onClick={() => setEditingInterview(interview)}
                                  variant="outline"
                                  size="sm"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => handleDeleteInterview(interview.id)}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} results
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-700">
                      Page {pagination.page} of {pagination.pages}
                    </span>
                    <Button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create/Edit Interview Modal - Placeholder for now */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Schedule Interview</h3>
            <p className="text-gray-600 mb-4">Interview scheduling form will be implemented here.</p>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setShowCreateModal(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button onClick={() => setShowCreateModal(false)}>
                Schedule
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Interview Modal - Placeholder for now */}
      {editingInterview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Edit Interview</h3>
            <p className="text-gray-600 mb-4">Interview editing form will be implemented here.</p>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setEditingInterview(null)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button onClick={() => setEditingInterview(null)}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
