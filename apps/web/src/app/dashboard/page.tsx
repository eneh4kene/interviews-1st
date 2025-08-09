"use client";

import { useState, useEffect } from "react";
import { Button } from "@interview-me/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@interview-me/ui";
import { Client, DashboardStats, ApiResponse } from "@interview-me/types";
import { Search, Plus, Filter, TrendingUp, Users, Calendar, Target, CreditCard, DollarSign, CheckCircle, ChevronDown } from "lucide-react";

export default function Dashboard() {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    // Mock data for demonstration
    const mockClients: Client[] = [
      {
        id: "1",
        workerId: "worker1",
        name: "Sarah Johnson",
        email: "sarah.johnson@email.com",
        linkedinUrl: "https://linkedin.com/in/sarahjohnson",
        status: "active",
        paymentStatus: "pending",
        totalInterviews: 2,
        totalPaid: 20,
        isNew: false,
        assignedAt: new Date("2024-01-15"),
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15"),
      },
      {
        id: "2",
        workerId: "worker1",
        name: "Michael Chen",
        email: "michael.chen@email.com",
        linkedinUrl: "https://linkedin.com/in/michaelchen",
        status: "active",
        paymentStatus: "paid",
        totalInterviews: 1,
        totalPaid: 10,
        isNew: false,
        assignedAt: new Date("2024-01-10"),
        createdAt: new Date("2024-01-10"),
        updatedAt: new Date("2024-01-10"),
      },
      {
        id: "3",
        workerId: "worker1",
        name: "Emily Rodriguez",
        email: "emily.rodriguez@email.com",
        linkedinUrl: "https://linkedin.com/in/emilyrodriguez",
        status: "placed",
        paymentStatus: "paid",
        totalInterviews: 3,
        totalPaid: 30,
        isNew: false,
        assignedAt: new Date("2023-12-20"),
        createdAt: new Date("2023-12-20"),
        updatedAt: new Date("2024-01-05"),
      },
      // NEW: Recently assigned clients (within 72 hours)
      {
        id: "4",
        workerId: "worker1",
        name: "Alex Thompson",
        email: "alex.thompson@email.com",
        linkedinUrl: "https://linkedin.com/in/alexthompson",
        status: "active",
        paymentStatus: "pending",
        totalInterviews: 0,
        totalPaid: 0,
        isNew: true,
        assignedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
      {
        id: "5",
        workerId: "worker1",
        name: "Jessica Kim",
        email: "jessica.kim@email.com",
        linkedinUrl: "https://linkedin.com/in/jessicakim",
        status: "active",
        paymentStatus: "pending",
        totalInterviews: 0,
        totalPaid: 0,
        isNew: true,
        assignedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      },
    ];

      const mockStats: DashboardStats = {
    totalClients: 12,
    activeClients: 8,
    newClients: 2, // NEW: Number of clients assigned in the last 72 hours
    interviewsThisMonth: 15,
    placementsThisMonth: 3,
    successRate: 85.5,
    pendingPayments: 3,
    totalRevenue: 120,
    interviewsScheduled: 8,
    interviewsAccepted: 5,
    interviewsDeclined: 2,
  };

    setClients(mockClients);
    setStats(mockStats);
    setLoading(false);
  }, []);

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
    alert('Add New Client functionality would open a form modal');
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
    alert(`Manage client: ${client.name}`);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Client Portfolio Dashboard</h1>
              <p className="text-gray-600">Manage your clients' job search journeys</p>
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
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.successRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Payment & Revenue Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <CreditCard className="h-6 w-6 text-yellow-600" />
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
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-600" />
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
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clients by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="new">New (72h)</option>
                <option value="active">Active</option>
                <option value="placed">Placed</option>
                <option value="inactive">Inactive</option>
              </select>
              <Button variant="outline" className="flex items-center gap-2" onClick={handleMoreFilters}>
                <Filter className="h-4 w-4" />
                More Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Client Portfolio Grid */}
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
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Client since:</span>
                    <span className="font-medium">
                      {client.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                  
                  {client.linkedinUrl && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">LinkedIn:</span>
                      <a
                        href={client.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLinkedInClick(client);
                        }}
                      >
                        View Profile
                      </a>
                    </div>
                  )}

                  <div className="pt-3 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Quick Actions:</span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={(e) => {
                          e.stopPropagation();
                          handleViewProfile(client);
                        }}>
                          View Profile
                        </Button>
                        <Button size="sm" onClick={(e) => {
                          e.stopPropagation();
                          handleManageClient(client);
                        }}>
                          Manage
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Users className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== "all" 
                ? "Try adjusting your search or filters"
                : "Get started by adding your first client"
              }
            </p>
            <Button>Add New Client</Button>
          </div>
        )}
      </div>
    </div>
  );
} 