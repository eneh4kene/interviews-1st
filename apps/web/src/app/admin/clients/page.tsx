"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@interview-me/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@interview-me/ui";
import { Input } from "@interview-me/ui";
import { Label } from "@interview-me/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@interview-me/ui";
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
  Clock,
  DollarSign,
  Phone,
  Mail,
  Linkedin,
  Search,
  Filter,
  RefreshCw,
  Download,
  UserPlus,
  ArrowUpDown
} from "lucide-react";
import { apiService } from '../../../lib/api';
import Logo from '../../../components/Logo';
import AdminClientForm from '../../../components/AdminClientForm';
import EditClientModal from '../../../components/EditClientModal';
import BulkAssignModal from '../../../components/BulkAssignModal';

interface Client {
  id: string;
  worker_id: string;
  name: string;
  email: string;
  phone?: string;
  linkedin_url?: string;
  status: 'active' | 'placed' | 'inactive';
  payment_status: 'pending' | 'paid' | 'overdue';
  total_interviews: number;
  total_paid: number;
  is_new: boolean;
  assigned_at: string;
  created_at: string;
  updated_at: string;
  worker_name?: string;
  worker_email?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface ClientStats {
  total_clients: number;
  active_clients: number;
  placed_clients: number;
  inactive_clients: number;
  new_clients: number;
  paid_clients: number;
  pending_payments: number;
  total_revenue: number;
  avg_revenue_per_client: number;
  total_interviews: number;
}

export default function ClientManagement() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [workerFilter, setWorkerFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [clientNames, setClientNames] = useState<{ [key: string]: string }>({});

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

  // Fetch workers for assignment
  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const response = await apiService.getWorkers(1, 100, '', 'all');
        if (response.success) {
          setWorkers(response.data.workers || []);
        }
      } catch (error) {
        console.error('Error fetching workers:', error);
      }
    };

    if (isAuthenticated) {
      fetchWorkers();
    }
  }, [isAuthenticated]);

  // Fetch clients - only when searchTerm, page, status, worker, sort, or refresh changes
  useEffect(() => {
    const fetchClients = async () => {
      if (!isAuthenticated) return;

      setLoading(true);
      setError(null);

      try {
        const response = await apiService.getAdminClients(
          currentPage,
          10,
          searchTerm,
          statusFilter,
          workerFilter,
          sortBy,
          sortOrder
        );

        if (response.success) {
          setClients(response.data.clients || []);
          setPagination(response.data.pagination || null);
          
          // Update client names for bulk assign modal
          const names: { [key: string]: string } = {};
          (response.data.clients || []).forEach((client: Client) => {
            names[client.id] = client.name;
          });
          setClientNames(names);
        } else {
          setError(response.error || 'Failed to fetch clients');
        }
      } catch (error) {
        console.error('Error fetching clients:', error);
        setError('Failed to fetch clients');
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [isAuthenticated, searchTerm, currentPage, statusFilter, workerFilter, sortBy, sortOrder, refreshTrigger]);

  // Fetch client stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!isAuthenticated) return;

      try {
        const response = await apiService.getClientStats('30d');
        if (response.success) {
          setStats(response.data);
        }
      } catch (error) {
        console.error('Error fetching client stats:', error);
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

  const handleCreateClient = async (clientData: any) => {
    try {
      const response = await apiService.createAdminClient(clientData);
      if (response.success) {
        setShowCreateModal(false);
        handleRefresh();
      } else {
        setError(response.error || 'Failed to create client');
      }
    } catch (error) {
      console.error('Error creating client:', error);
      setError('Failed to create client');
    }
  };

  const handleUpdateClient = async (id: string, clientData: any) => {
    try {
      const response = await apiService.updateAdminClient(id, clientData);
      if (response.success) {
        setEditingClient(null);
        handleRefresh();
      } else {
        setError(response.error || 'Failed to update client');
      }
    } catch (error) {
      console.error('Error updating client:', error);
      setError('Failed to update client');
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
      const response = await apiService.deleteAdminClient(id);
      if (response.success) {
        handleRefresh();
      } else {
        setError(response.error || 'Failed to delete client');
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      setError('Failed to delete client');
    }
  };

  const handleBulkAssign = async (workerId: string) => {
    if (selectedClients.length === 0) return;

    try {
      const response = await apiService.bulkAssignClients(selectedClients, workerId);
      if (response.success) {
        setSelectedClients([]);
        setShowBulkAssign(false);
        handleRefresh();
      } else {
        setError(response.error || 'Failed to assign clients');
      }
    } catch (error) {
      console.error('Error bulk assigning clients:', error);
      setError('Failed to assign clients');
    }
  };

  const handleSelectClient = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleSelectAll = () => {
    if (selectedClients.length === clients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(clients.map(client => client.id));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'placed':
        return <UserCheck className="h-4 w-4 text-blue-500" />;
      case 'inactive':
        return <UserX className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'placed':
        return 'bg-blue-100 text-blue-800';
      case 'inactive':
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
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
              <h1 className="ml-4 text-xl font-semibold text-gray-900">Talent Management</h1>
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
                Add Talent
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
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Talent</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.total_clients}</p>
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
                    <p className="text-sm font-medium text-gray-500">Active Talent</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.active_clients}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UserCheck className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Placed Talent</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.placed_clients}</p>
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
                      placeholder="Search talent..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={handleStatusFilter}>
                    <SelectTrigger className="w-32 bg-white border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="placed">Placed</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={workerFilter} onValueChange={handleWorkerFilter}>
                    <SelectTrigger className="w-40 bg-white border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg">
                      <SelectItem value="all">All Talent Managers</SelectItem>
                      {workers.map((worker) => (
                        <SelectItem key={worker.id} value={worker.id}>
                          {worker.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedClients.length > 0 && (
                  <Button
                    onClick={() => setShowBulkAssign(true)}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    Assign ({selectedClients.length})
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clients List */}
        <div className="grid gap-6">
          {loading ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading clients...</p>
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
          ) : clients.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || statusFilter !== 'all' || workerFilter !== 'all'
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Get started by adding your first client.'
                  }
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Talent
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
                              checked={selectedClients.length === clients.length && clients.length > 0}
                              onChange={handleSelectAll}
                              className="rounded border-gray-300"
                            />
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('name')}
                          >
                            <div className="flex items-center gap-1">
                              Talent
                              <ArrowUpDown className="h-4 w-4" />
                            </div>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact
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
                            Talent Manager
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('total_paid')}
                          >
                            <div className="flex items-center gap-1">
                              Revenue
                              <ArrowUpDown className="h-4 w-4" />
                            </div>
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('created_at')}
                          >
                            <div className="flex items-center gap-1">
                              Created
                              <ArrowUpDown className="h-4 w-4" />
                            </div>
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {clients.map((client) => (
                          <tr key={client.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedClients.includes(client.id)}
                                onChange={() => handleSelectClient(client.id)}
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Users className="h-5 w-5 text-blue-600" />
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {client.name}
                                    {client.is_new && (
                                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        New
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-500">{client.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {client.phone && (
                                  <div className="flex items-center gap-1 mb-1">
                                    <Phone className="h-3 w-3" />
                                    {client.phone}
                                  </div>
                                )}
                                {client.linkedin_url && (
                                  <div className="flex items-center gap-1">
                                    <Linkedin className="h-3 w-3" />
                                    <a 
                                      href={client.linkedin_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800"
                                    >
                                      LinkedIn
                                    </a>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
                                  {getStatusIcon(client.status)}
                                  <span className="ml-1 capitalize">{client.status}</span>
                                </span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(client.payment_status)}`}>
                                  {client.payment_status}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {client.worker_name || 'Unassigned'}
                              </div>
                              {client.worker_email && (
                                <div className="text-sm text-gray-500">{client.worker_email}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {formatCurrency(client.total_paid)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {client.total_interviews} interviews
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(client.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  onClick={() => setEditingClient(client)}
                                  variant="outline"
                                  size="sm"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => handleDeleteClient(client.id)}
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

      {/* Create Client Modal */}
      <AdminClientForm
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          handleRefresh();
        }}
      />

      {/* Edit Client Modal */}
      <EditClientModal
        isOpen={!!editingClient}
        onClose={() => setEditingClient(null)}
        onSuccess={() => {
          setEditingClient(null);
          handleRefresh();
        }}
        client={editingClient}
      />

      {/* Bulk Assign Modal */}
      <BulkAssignModal
        isOpen={showBulkAssign}
        onClose={() => setShowBulkAssign(false)}
        onSuccess={() => {
          setShowBulkAssign(false);
          setSelectedClients([]);
          handleRefresh();
        }}
        selectedClients={selectedClients}
        clientNames={clientNames}
      />
    </div>
  );
}
