"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@interview-me/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@interview-me/ui";
import { Input } from "@interview-me/ui";
import { Label } from "@interview-me/ui";
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  UserCheck, 
  UserX,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { apiService } from '../../../lib/api';
import Logo from '../../../components/Logo';
import WorkerModal from '../../../components/WorkerModal';
import SearchInput from '../../../components/SearchInput';

interface Worker {
  id: string;
  name: string;
  email: string;
  role: 'WORKER' | 'MANAGER';
  is_active: boolean;
  two_factor_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  total_clients: number;
  active_clients: number;
  placed_clients: number;
  total_interviews: number;
  total_revenue: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function WorkerManagement() {
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchInput, setSearchInput] = useState('');

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

  // Fetch workers - only when searchTerm, page, status, or refresh changes
  useEffect(() => {
    const fetchWorkers = async () => {
      if (!isAuthenticated) return;

      try {
        setLoading(true);
        setError(null);

        const response = await apiService.getWorkers(currentPage, 10, searchTerm, statusFilter);

        if (response.success) {
          setWorkers(response.data.workers);
          setPagination(response.data.pagination);
        } else {
          setError(response.error || 'Failed to fetch workers');
        }
      } catch (err) {
        console.error('Failed to fetch workers:', err);
        setError(err instanceof Error ? err.message : 'Failed to load workers');
      } finally {
        setLoading(false);
      } 
    };

    fetchWorkers();
  }, [isAuthenticated, currentPage, searchTerm, statusFilter, refreshTrigger]);

  // Handle search input changes - only updates local state
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };


  const handleStatusFilter = useCallback((status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  }, []);

  const handleDeleteWorker = useCallback(async (worker: Worker) => {
    if (!confirm(`Are you sure you want to deactivate ${worker.name}?`)) {
      return;
    }

    try {
      const response = await apiService.deleteWorker(worker.id);
      if (response.success) {
        setRefreshTrigger(prev => prev + 1);
      } else {
        alert(response.error || 'Failed to deactivate worker');
      }
    } catch (err) {
      console.error('Error deleting worker:', err);
      alert('Failed to deactivate worker');
    }
  }, []);

  const handleReactivateWorker = useCallback(async (worker: Worker) => {
    try {
      const response = await apiService.reactivateWorker(worker.id);
      if (response.success) {
        setRefreshTrigger(prev => prev + 1);
      } else {
        alert(response.error || 'Failed to reactivate worker');
      }
    } catch (err) {
      console.error('Error reactivating worker:', err);
      alert('Failed to reactivate worker');
    }
  }, []);

  const handleModalSuccess = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  }, []);

  const getStatusIcon = useCallback((isActive: boolean) => {
    return isActive ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <UserX className="h-4 w-4 text-red-500" />
    );
  }, []);

  const getLastLoginIcon = useCallback((lastLoginAt: string | null) => {
    if (!lastLoginAt) return <Clock className="h-4 w-4 text-gray-400" />;
    
    const lastLogin = new Date(lastLoginAt);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 7) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (daysDiff <= 30) return <Clock className="h-4 w-4 text-yellow-500" />;
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  }, []);

  // Remove full-page authentication loading - show header and sidebar

  // Remove the full-page loading block - keep search bar visible

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Logo />
              <h1 className="ml-4 text-xl font-semibold text-gray-900">Worker Management</h1>
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
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Worker
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {(!isAuthenticated) ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking authentication...</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <p className="mt-1 text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Search and Filters */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <SearchInput
                    value={searchInput}
                    onChange={handleSearchChange}
                    placeholder="Search workers by name or email..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={statusFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => handleStatusFilter('all')}
                    size="sm"
                  >
                    All
                  </Button>
                  <Button
                    variant={statusFilter === 'active' ? 'default' : 'outline'}
                    onClick={() => handleStatusFilter('active')}
                    size="sm"
                  >
                    Active
                  </Button>
                  <Button
                    variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                    onClick={() => handleStatusFilter('inactive')}
                    size="sm"
                  >
                    Inactive
                  </Button>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Worker
                </Button>
              </div>
            </div>

        {/* Workers List */}
        <div className="grid gap-6">
          {loading ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading workers...</p>
              </CardContent>
            </Card>
          ) : workers.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No workers found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Get started by adding your first worker.'
                  }
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Worker
                </Button>
              </CardContent>
            </Card>
          ) : (
            workers.map((worker) => (
              <Card key={worker.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{worker.name}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          worker.role === 'MANAGER' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {worker.role}
                        </span>
                        {getStatusIcon(worker.is_active)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="font-medium">{worker.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Last Login</p>
                          <div className="flex items-center gap-1">
                            {getLastLoginIcon(worker.last_login_at)}
                            <p className="font-medium">
                              {worker.last_login_at ? formatDate(worker.last_login_at) : 'Never'}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Clients</p>
                          <p className="font-medium">
                            {worker.active_clients} active / {worker.total_clients} total
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Revenue</p>
                          <p className="font-medium">{formatCurrency(worker.total_revenue)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Placed Clients</p>
                          <p className="font-medium">{worker.placed_clients}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Total Interviews</p>
                          <p className="font-medium">{worker.total_interviews}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">2FA Enabled</p>
                          <p className="font-medium">{worker.two_factor_enabled ? 'Yes' : 'No'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingWorker(worker)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {worker.is_active ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteWorker(worker)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReactivateWorker(worker)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} workers
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-gray-700">
                Page {pagination.page} of {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === pagination.pages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
          </>
        )}

        {/* Worker Modal */}
        <WorkerModal
          isOpen={showCreateModal || !!editingWorker}
          onClose={() => {
            setShowCreateModal(false);
            setEditingWorker(null);
          }}
          onSuccess={handleModalSuccess}
          worker={editingWorker}
        />
      </div>
    </div>
  );
}
