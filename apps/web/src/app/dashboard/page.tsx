"use client";

import { useState, useEffect } from "react";
import { Button } from "@interview-me/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@interview-me/ui";
import { Client, DashboardStats, ApiResponse } from "@interview-me/types";
import { Search, Plus, Filter, TrendingUp, Users, Calendar, Target, CreditCard, DollarSign, CheckCircle, ChevronDown } from "lucide-react";
import Logo from '../../components/Logo';
import ClientForm from '../../components/ClientForm';
import { apiService } from '../../lib/api';

export default function Dashboard() {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showClientForm, setShowClientForm] = useState(false);

  // Mock worker ID for now - in real app, this would come from auth context
  const workerId = "worker1";

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch clients and stats in parallel
        const [clientsResponse, statsResponse] = await Promise.all([
          apiService.getClients(workerId),
          apiService.getDashboardStats(workerId)
        ]);

        if (!clientsResponse.success) {
          throw new Error(clientsResponse.error);
        }

        if (!statsResponse.success) {
          throw new Error(statsResponse.error);
        }

        setClients(clientsResponse.data);
        setStats(statsResponse.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [workerId]);

  const filteredClients = clients.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter !== "all") {
      if (statusFilter === "new") {
        // Filter for clients assigned within the last 72 hours
        const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
        matchesStatus = client.assignedAt > seventyTwoHoursAgo;
      } else {
        matchesStatus = client.status === statusFilter;
      }
    }
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-green-600 bg-green-50";
      case "placed": return "text-blue-600 bg-blue-50";
      case "inactive": return "text-gray-600 bg-gray-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return "🟢";
      case "placed": return "✅";
      case "inactive": return "⚪";
      default: return "⚪";
    }
  };

  // Button click handlers
  const handleAddNewClient = () => {
    setShowClientForm(true);
  };

  const handleClientFormClose = () => {
    setShowClientForm(false);
  };

  const handleClientFormSuccess = () => {
    // Refresh the dashboard data
    window.location.reload();
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
  };

  const handleMoreFilters = () => {
    alert('More Filters functionality would open advanced filter options');
  };

  const handleViewProfile = (client: Client) => {
    window.location.href = `/dashboard/clients/${client.id}`;
  };

  const handleManageClient = (client: Client) => {
    window.location.href = `/dashboard/clients/${client.id}`;
  };

  const handleLinkedInClick = (client: Client) => {
    if (client.linkedinUrl) {
      window.open(client.linkedinUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error Loading Dashboard</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-4">
              <Logo size="md" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Client Portfolio Dashboard</h1>
                <p className="text-gray-600">Manage your clients' job search journeys</p>
              </div>
            </div>
            <Button className="flex items-center gap-2" onClick={handleAddNewClient}>
              <Plus className="h-4 w-4" />
              Add New Client
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Clients</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Target className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Clients</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeClients}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Interviews This Month</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.interviewsThisMonth}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">£{stats.totalRevenue}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <CreditCard className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending Payments</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pendingPayments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.successRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Interviews Accepted</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.interviewsAccepted}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* NEW: New Clients Stats Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Users className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">New Clients (72h)</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.newClients}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex border border-gray-300 rounded-lg">
                <button
                  onClick={() => handleStatusFilterChange("all")}
                  className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                    statusFilter === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => handleStatusFilterChange("new")}
                  className={`px-4 py-2 text-sm font-medium ${
                    statusFilter === "new"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  New
                </button>
                <button
                  onClick={() => handleStatusFilterChange("active")}
                  className={`px-4 py-2 text-sm font-medium ${
                    statusFilter === "active"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => handleStatusFilterChange("placed")}
                  className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                    statusFilter === "placed"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Placed
                </button>
              </div>
              
              <Button variant="outline" onClick={handleMoreFilters}>
                <Filter className="h-4 w-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <Card 
              key={client.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
              onClick={() => window.location.href = `/dashboard/clients/${client.id}`}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {client.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                      <CardDescription className="text-sm">{client.email}</CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
                      {getStatusIcon(client.status)} {client.status}
                    </span>
                    {client.isNew && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        🆕 NEW
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Interviews:</span>
                    <span className="font-medium">{client.totalInterviews}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Paid:</span>
                    <span className="font-medium">£{client.totalPaid}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment Status:</span>
                    <span className={`font-medium ${
                      client.paymentStatus === 'paid' ? 'text-green-600' : 
                      client.paymentStatus === 'pending' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {client.paymentStatus}
                    </span>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLinkedInClick(client);
                      }}
                    >
                      LinkedIn
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleManageClient(client);
                      }}
                    >
                      Manage
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first client'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button onClick={handleAddNewClient}>
                <Plus className="h-4 w-4 mr-2" />
                Add New Client
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Client Form Modal */}
      <ClientForm
        isOpen={showClientForm}
        onClose={handleClientFormClose}
        onSuccess={handleClientFormSuccess}
      />
    </div>
  );
} 