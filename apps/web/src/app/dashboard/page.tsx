"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@interview-me/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@interview-me/ui";
import { Client, DashboardStats, ApiResponse } from "@interview-me/types";
import { Search, Plus, Filter, TrendingUp, Users, Calendar, Target, CreditCard, DollarSign, CheckCircle, ChevronDown, Briefcase, LogOut, Lock, User, Menu, X } from "lucide-react";
import Logo from '../../components/Logo';
import ClientForm from '../../components/ClientForm';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import { apiService } from '../../lib/api';

export default function Dashboard() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showClientForm, setShowClientForm] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [isStatsAnimating, setIsStatsAnimating] = useState(false);
  const [filters, setFilters] = useState({
    paymentStatus: '',
    interviewCount: '',
    sortBy: 'assignedAt'
  });

  // Determine workerId from logged-in user (stored at login)
  const [workerId, setWorkerId] = useState<string | null>(null);

  // Calculate stats from clients data
  const calculateStatsFromClients = (clientsData: Client[]) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

    const totalClients = clientsData.length;
    const activeClients = clientsData.filter(c => c.status === 'active').length;
    const completedClients = clientsData.filter(c => c.status === 'placed').length;
    const newClients = clientsData.filter(c => c.isNew).length;
    const totalInterviews = clientsData.reduce((sum, c) => sum + (c.totalInterviews || 0), 0);
    const totalRevenue = clientsData.reduce((sum, c) => sum + (c.totalPaid || 0), 0);
    const pendingPayments = clientsData.filter(c => c.paymentStatus === 'pending').length;
    
    // Calculate interviews this month (simplified - using total interviews as proxy)
    const interviewsThisMonth = Math.floor(totalInterviews * 0.3); // Rough estimate
    
    // Calculate success rate (simplified)
    const successRate = totalClients > 0 ? Math.round((completedClients / totalClients) * 100) : 0;
    
    // Calculate interviews accepted (simplified - using total interviews as proxy)
    const interviewsAccepted = Math.floor(totalInterviews * 0.8); // Rough estimate

    return {
      totalClients,
      activeClients,
      newClients,
      interviewsThisMonth,
      placementsThisMonth: completedClients, // Use completed clients as placements
      successRate,
      pendingPayments,
      totalRevenue,
      interviewsScheduled: totalInterviews, // Use total interviews as scheduled
      interviewsAccepted,
      interviewsDeclined: Math.floor(totalInterviews * 0.2) // Rough estimate
    };
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      const token = localStorage.getItem('accessToken');
      
      if (!stored || !token) {
        // No user data or token found, redirect to login
        router.push('/login');
        return;
      }
      
      const user = JSON.parse(stored);
      if (user && (user.role === 'WORKER' || user.role === 'MANAGER')) {
        setWorkerId(user.id);
        setIsAuthenticated(true);
      } else {
        // User doesn't have the right role, redirect to login
        router.push('/login');
      }
    } catch (error) {
      // Invalid user data, redirect to login
      console.error('Error parsing user data:', error);
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔧 Dashboard: Fetching data with client-side stats calculation');
        
        // Fetch clients data
        if (!workerId) {
          throw new Error('Missing worker ID');
        }
        const clientsResponse = await apiService.getClients();

        if (!clientsResponse.success) {
          throw new Error(clientsResponse.error);
        }

        const clientsData = clientsResponse.data;
        setClients(clientsData);

        // Calculate stats from clients data
        const calculatedStats = calculateStatsFromClients(clientsData);
        setStats(calculatedStats);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [workerId]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobileMenuOpen) {
        const target = event.target as Element;
        if (!target.closest('[data-mobile-menu]')) {
          setIsMobileMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  const filteredClients = clients.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter !== "all") {
      if (statusFilter === "new") {
        // Filter for clients assigned within the last 72 hours
        const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
        matchesStatus = client.assignedAt && client.assignedAt > seventyTwoHoursAgo;
      } else {
        matchesStatus = client.status === statusFilter;
      }
    }
    
    // Apply additional filters
    let matchesPaymentStatus = true;
    if (filters.paymentStatus) {
      matchesPaymentStatus = client.paymentStatus === filters.paymentStatus;
    }
    
    let matchesInterviewCount = true;
    if (filters.interviewCount) {
      const count = client.totalInterviews || 0;
      switch (filters.interviewCount) {
        case '0':
          matchesInterviewCount = count === 0;
          break;
        case '1-5':
          matchesInterviewCount = count >= 1 && count <= 5;
          break;
        case '5+':
          matchesInterviewCount = count >= 5;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesPaymentStatus && matchesInterviewCount;
  }).sort((a, b) => {
    // Apply sorting
    switch (filters.sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'totalInterviews':
        return (b.totalInterviews || 0) - (a.totalInterviews || 0);
      case 'totalPaid':
        return (b.totalPaid || 0) - (a.totalPaid || 0);
      case 'assignedAt':
      default:
        if (!a.assignedAt || !b.assignedAt) return 0;
        return new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime();
    }
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

  const handleFindJobs = () => {
    setIsNavigating(true);
    router.push('/jobs');
  };

  const handleLogout = async () => {
    try {
      // Call the logout API to clear server-side session
      await apiService.post('/auth/logout');
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Continue with client-side cleanup even if API fails
    }
    
    // Clear user data from localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    
    // Redirect to login page
    router.push('/login');
  };

  const handleClientFormClose = () => {
    setShowClientForm(false);
  };

  const handleClientFormSuccess = () => {
    // Refresh the dashboard data by refetching
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch clients data
        if (!workerId) {
          throw new Error('Missing worker ID');
        }
        const clientsResponse = await apiService.getClients();

        if (!clientsResponse.success) {
          throw new Error(clientsResponse.error);
        }

        const clientsData = clientsResponse.data;
        setClients(clientsData);

        // Calculate stats from clients data
        const calculatedStats = calculateStatsFromClients(clientsData);
        setStats(calculatedStats);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
  };

  const handleMoreFilters = () => {
    // Toggle additional filter options
    setShowFilters(!showFilters);
  };

  const handleToggleStats = () => {
    if (showStats) {
      // Hide stats with animation
      setIsStatsAnimating(true);
      setTimeout(() => {
        setShowStats(false);
        setIsStatsAnimating(false);
      }, 500); // Match animation duration
    } else {
      // Show stats with animation
      setShowStats(true);
      setIsStatsAnimating(true);
      setTimeout(() => {
        setIsStatsAnimating(false);
      }, 600);
    }
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

  if (loading || !workerId) {
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

  // Don't render dashboard content if not authenticated
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
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4 lg:py-6">
            <div className="flex items-center gap-3 lg:gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200 hover:scale-110 active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Toggle mobile menu"
                data-mobile-menu
              >
                <div className="transition-transform duration-300 ease-out">
                  {isMobileMenuOpen ? <X size={24} className="rotate-180" /> : <Menu size={24} className="rotate-0" />}
                </div>
              </button>
              
              <Logo size="md" />
              <div className="min-w-0 flex-1">
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900 truncate">Talent Portfolio Dashboard</h1>
                <p className="text-sm lg:text-base text-gray-600 hidden sm:block">Manage your talents' job search journeys</p>
              </div>
            </div>
            
            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-3">
              <Button 
                variant="outline" 
                className="flex items-center justify-center gap-2 min-h-[44px]" 
                onClick={handleFindJobs}
                disabled={isNavigating}
              >
                {isNavigating ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Loading...</span>
                  </div>
                ) : (
                  <>
                    <Briefcase className="h-4 w-4" />
                    <span>Find Jobs</span>
                  </>
                )}
              </Button>
              <Button className="flex items-center justify-center gap-2 min-h-[44px]" onClick={handleAddNewClient}>
                <Plus className="h-4 w-4" />
                <span>Add New Talent</span>
              </Button>
              
              {/* User Menu */}
              <div className="relative">
                <Button 
                  variant="outline" 
                  className="flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 min-h-[44px]" 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <User className="h-4 w-4" />
                  <span>Account</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                    <button
                      onClick={() => {
                        setShowChangePasswordModal(true);
                        setShowUserMenu(false);
                      }}
                      className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 w-full text-left min-h-[44px]"
                    >
                      <Lock className="h-4 w-4 mr-3" />
                      Change Password
                    </button>
                    <button
                      onClick={() => {
                        handleLogout();
                        setShowUserMenu(false);
                      }}
                      className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 w-full text-left min-h-[44px]"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-0 transition-all duration-300 ease-out data-[state=open]:bg-opacity-50" 
          data-mobile-menu
          style={{ 
            animation: 'fadeIn 300ms ease-out',
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}
        >
          <div 
            className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-xl transform -translate-x-full transition-transform duration-300 ease-out"
            style={{ 
              animation: 'slideInLeft 300ms ease-out',
              transform: 'translateX(0)'
            }}
          >
            <div className="flex flex-col h-full">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <Logo size="sm" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
                    <p className="text-sm text-gray-600">Quick Actions</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200 hover:scale-110 active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X size={24} className="transition-transform duration-200 hover:rotate-90" />
                </button>
              </div>

              {/* Sidebar Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Quick Actions */}
                <div className="animate-slide-in-up" style={{ animationDelay: '100ms' }}>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    <Button 
                      className="w-full justify-start min-h-[44px] transition-all duration-200 hover:scale-[1.02] hover:shadow-md" 
                      onClick={() => {
                        handleAddNewClient();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-3 transition-transform duration-200 group-hover:rotate-90" />
                      Add New Talent
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start min-h-[44px] transition-all duration-200 hover:scale-[1.02] hover:shadow-md" 
                      onClick={() => {
                        handleFindJobs();
                        setIsMobileMenuOpen(false);
                      }}
                      disabled={isNavigating}
                    >
                      <Briefcase className="h-4 w-4 mr-3 transition-transform duration-200 group-hover:scale-110" />
                      {isNavigating ? 'Loading...' : 'Find Jobs'}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start min-h-[44px] transition-all duration-200 hover:scale-[1.02] hover:shadow-md" 
                      onClick={() => {
                        handleToggleStats();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <TrendingUp className="h-4 w-4 mr-3 transition-transform duration-200 group-hover:scale-110" />
                      {showStats ? 'Hide Stats' : 'View Stats'}
                    </Button>
                  </div>
                </div>

                {/* Account Actions */}
                <div className="animate-slide-in-up" style={{ animationDelay: '200ms' }}>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Account</h3>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start min-h-[44px] transition-all duration-200 hover:scale-[1.02] hover:shadow-md" 
                      onClick={() => {
                        setShowChangePasswordModal(true);
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <Lock className="h-4 w-4 mr-3 transition-transform duration-200 group-hover:rotate-12" />
                      Change Password
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start min-h-[44px] text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200 hover:scale-[1.02] hover:shadow-md" 
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-3 transition-transform duration-200 group-hover:translate-x-1" />
                      Logout
                    </Button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 w-full overflow-x-hidden">
        {/* Stats Cards */}
        {stats && showStats && (
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8 ${
            isStatsAnimating ? 'animate-slide-in-up-stats' : 'opacity-100'
          }`}>
            <Card className={`transition-all duration-600 ease-out ${isStatsAnimating ? 'animate-slide-in-up-stats' : ''}`} style={{ animationDelay: isStatsAnimating ? '100ms' : '0ms' }}>
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600" />
                  </div>
                  <div className="ml-3 lg:ml-4 min-w-0 flex-1">
                    <p className="text-xs lg:text-sm font-medium text-gray-600 truncate">Total Talents</p>
                    <p className="text-xl lg:text-2xl font-bold text-gray-900">{stats.totalClients}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`transition-all duration-600 ease-out ${isStatsAnimating ? 'animate-slide-in-up-stats' : ''}`} style={{ animationDelay: isStatsAnimating ? '200ms' : '0ms' }}>
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Target className="h-5 w-5 lg:h-6 lg:w-6 text-green-600" />
                  </div>
                  <div className="ml-3 lg:ml-4 min-w-0 flex-1">
                    <p className="text-xs lg:text-sm font-medium text-gray-600 truncate">Active Talents</p>
                    <p className="text-xl lg:text-2xl font-bold text-gray-900">{stats.activeClients}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`transition-all duration-600 ease-out ${isStatsAnimating ? 'animate-slide-in-up-stats' : ''}`} style={{ animationDelay: isStatsAnimating ? '300ms' : '0ms' }}>
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Calendar className="h-5 w-5 lg:h-6 lg:w-6 text-purple-600" />
                  </div>
                  <div className="ml-3 lg:ml-4 min-w-0 flex-1">
                    <p className="text-xs lg:text-sm font-medium text-gray-600 truncate">Interviews This Month</p>
                    <p className="text-xl lg:text-2xl font-bold text-gray-900">{stats.interviewsThisMonth}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`transition-all duration-600 ease-out ${isStatsAnimating ? 'animate-slide-in-up-stats' : ''}`} style={{ animationDelay: isStatsAnimating ? '400ms' : '0ms' }}>
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <DollarSign className="h-5 w-5 lg:h-6 lg:w-6 text-yellow-600" />
                  </div>
                  <div className="ml-3 lg:ml-4 min-w-0 flex-1">
                    <p className="text-xs lg:text-sm font-medium text-gray-600 truncate">Total Revenue</p>
                    <p className="text-xl lg:text-2xl font-bold text-gray-900">£{stats.totalRevenue}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`transition-all duration-600 ease-out ${isStatsAnimating ? 'animate-slide-in-up-stats' : ''}`} style={{ animationDelay: isStatsAnimating ? '500ms' : '0ms' }}>
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <CreditCard className="h-5 w-5 lg:h-6 lg:w-6 text-red-600" />
                  </div>
                  <div className="ml-3 lg:ml-4 min-w-0 flex-1">
                    <p className="text-xs lg:text-sm font-medium text-gray-600 truncate">Pending Payments</p>
                    <p className="text-xl lg:text-2xl font-bold text-gray-900">{stats.pendingPayments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`transition-all duration-600 ease-out ${isStatsAnimating ? 'animate-slide-in-up-stats' : ''}`} style={{ animationDelay: isStatsAnimating ? '600ms' : '0ms' }}>
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 lg:h-6 lg:w-6 text-indigo-600" />
                  </div>
                  <div className="ml-3 lg:ml-4 min-w-0 flex-1">
                    <p className="text-xs lg:text-sm font-medium text-gray-600 truncate">Success Rate</p>
                    <p className="text-xl lg:text-2xl font-bold text-gray-900">{stats.successRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`transition-all duration-600 ease-out ${isStatsAnimating ? 'animate-slide-in-up-stats' : ''}`} style={{ animationDelay: isStatsAnimating ? '700ms' : '0ms' }}>
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CheckCircle className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600" />
                  </div>
                  <div className="ml-3 lg:ml-4 min-w-0 flex-1">
                    <p className="text-xs lg:text-sm font-medium text-gray-600 truncate">Interviews Accepted</p>
                    <p className="text-xl lg:text-2xl font-bold text-gray-900">{stats.interviewsAccepted}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* NEW: New Clients Stats Card */}
            <Card className={`transition-all duration-600 ease-out ${isStatsAnimating ? 'animate-slide-in-up-stats' : ''}`} style={{ animationDelay: isStatsAnimating ? '800ms' : '0ms' }}>
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Users className="h-5 w-5 lg:h-6 lg:w-6 text-orange-600" />
                  </div>
                  <div className="ml-3 lg:ml-4 min-w-0 flex-1">
                    <p className="text-xs lg:text-sm font-medium text-gray-600 truncate">New Talents (72h)</p>
                    <p className="text-xl lg:text-2xl font-bold text-gray-900">{stats.newClients}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-4 lg:p-6 mb-6 lg:mb-8 w-full overflow-x-hidden">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search talents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => handleStatusFilterChange("all")}
                    className={`px-3 lg:px-4 py-2 text-sm font-medium min-h-[44px] ${
                      statusFilter === "all"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => handleStatusFilterChange("new")}
                    className={`px-3 lg:px-4 py-2 text-sm font-medium min-h-[44px] ${
                      statusFilter === "new"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    New
                  </button>
                  <button
                    onClick={() => handleStatusFilterChange("active")}
                    className={`px-3 lg:px-4 py-2 text-sm font-medium min-h-[44px] ${
                      statusFilter === "active"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => handleStatusFilterChange("placed")}
                    className={`px-3 lg:px-4 py-2 text-sm font-medium min-h-[44px] ${
                      statusFilter === "placed"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Placed
                  </button>
                </div>
                
                <Button variant="outline" onClick={handleMoreFilters} className="min-h-[44px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{showFilters ? 'Hide Filters' : 'More Filters'}</span>
                  <span className="sm:hidden">Filters</span>
                </Button>
              </div>
            </div>
          </div>
          
          {/* Additional Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                    onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
                    value={filters.paymentStatus}
                  >
                    <option value="">All payment statuses</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Interviews</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                    onChange={(e) => setFilters({ ...filters, interviewCount: e.target.value })}
                    value={filters.interviewCount}
                  >
                    <option value="">Any number</option>
                    <option value="0">0 interviews</option>
                    <option value="1-5">1-5 interviews</option>
                    <option value="5+">5+ interviews</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                    onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                    value={filters.sortBy}
                  >
                    <option value="assignedAt">Date Assigned</option>
                    <option value="name">Name</option>
                    <option value="totalInterviews">Total Interviews</option>
                    <option value="totalPaid">Total Paid</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setFilters({ paymentStatus: '', interviewCount: '', sortBy: 'assignedAt' })}
                  className="min-h-[44px]"
                >
                  Clear Filters
                </Button>
                <Button onClick={() => setShowFilters(false)} className="min-h-[44px]">
                  Apply Filters
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Talents Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 w-full overflow-x-hidden">
          {filteredClients.map((client) => (
            <Card 
              key={client.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
              onClick={() => window.location.href = `/dashboard/clients/${client.id}`}
            >
              <CardHeader className="pb-3 lg:pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm lg:text-base flex-shrink-0">
                      {client.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base lg:text-lg truncate">{client.name}</CardTitle>
                      <CardDescription className="text-xs lg:text-sm truncate">{client.email}</CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
                      {getStatusIcon(client.status)} <span className="hidden sm:inline">{client.status}</span>
                    </span>
                    {client.isNew && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        🆕 <span className="hidden sm:inline">NEW</span>
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
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
                  
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 min-h-[44px]"
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
                      className="flex-1 min-h-[44px]"
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
          <div className="text-center py-12 lg:py-16">
            <div className="text-gray-400 text-6xl lg:text-7xl mb-4">👥</div>
            <h3 className="text-lg lg:text-xl font-medium text-gray-900 mb-2">No talents found</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first talent'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button onClick={handleAddNewClient} className="min-h-[44px]">
                <Plus className="h-4 w-4 mr-2" />
                Add New Talent
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

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSuccess={() => {
          // You could add a success notification here
          console.log('Password changed successfully');
        }}
      />

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  );
} 