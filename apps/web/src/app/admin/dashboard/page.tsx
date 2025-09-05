"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@interview-me/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@interview-me/ui";
import { 
  Users, 
  UserCheck, 
  DollarSign, 
  TrendingUp, 
  Activity, 
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Calendar
} from "lucide-react";
import { apiService } from '../../../lib/api';
import Logo from '../../../components/Logo';

interface PlatformOverview {
  users: {
    total_users: number;
    total_workers: number;
    total_managers: number;
    total_admins: number;
    total_clients: number;
    active_users: number;
    active_last_week: number;
  };
  clients: {
    total_clients: number;
    active_clients: number;
    placed_clients: number;
    new_clients: number;
    clients_this_month: number;
    pending_payments: number;
  };
  workers: {
    active_workers: number;
    avg_clients_per_worker: number;
    max_clients_per_worker: number;
    min_clients_per_worker: number;
  };
  revenue: {
    total_revenue: number;
    revenue_this_month: number;
    revenue_this_week: number;
    avg_revenue_per_client: number;
  };
  interviews: {
    total_interviews: number;
    accepted_interviews: number;
    declined_interviews: number;
    interviews_this_month: number;
    interviews_this_week: number;
  };
  timestamp: string;
}

interface ActivityItem {
  type: string;
  name: string;
  email?: string;
  worker_name?: string;
  title?: string;
  client_name?: string;
  timestamp: string;
}

interface SystemHealth {
  database: string;
  redis: string;
  api: string;
  overall: string;
  timestamp: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!isAuthenticated) return;

      try {
        setLoading(true);
        setError(null);

        const [overviewResponse, activityResponse, healthResponse] = await Promise.all([
          apiService.getAdminOverview(),
          apiService.getAdminActivity(10),
          apiService.getAdminHealth()
        ]);

        if (overviewResponse.success) {
          setOverview(overviewResponse.data);
        }

        if (activityResponse.success) {
          setActivities(activityResponse.data);
        }

        if (healthResponse.success) {
          setHealth(healthResponse.data);
        }

      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isAuthenticated]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    router.push('/login');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'client_registration':
        return <UserCheck className="h-4 w-4 text-green-500" />;
      case 'interview_scheduled':
        return <Calendar className="h-4 w-4 text-purple-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getHealthStatus = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'unhealthy':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <Logo />
              <h1 className="ml-4 text-xl font-semibold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block w-64 bg-white shadow-sm min-h-screen`}>
          <nav className="mt-8 px-4">
            <div className="space-y-2">
              <a href="#" className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md">
                <BarChart3 className="h-5 w-5 mr-3" />
                Dashboard Overview
              </a>
              <a href="/admin/workers" className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">
                <Users className="h-5 w-5 mr-3" />
                Worker Management
              </a>
              <a href="#" className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">
                <UserCheck className="h-5 w-5 mr-3" />
                Client Management
              </a>
              <a href="#" className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">
                <TrendingUp className="h-5 w-5 mr-3" />
                Analytics & Reports
              </a>
              <a href="#" className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">
                <Settings className="h-5 w-5 mr-3" />
                System Settings
              </a>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {(!isAuthenticated || loading) ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">{!isAuthenticated ? 'Checking authentication...' : 'Loading dashboard...'}</p>
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

              {/* Overview Cards */}
              {overview && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {/* Total Users */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{overview.users.total_users}</div>
                      <p className="text-xs text-muted-foreground">
                        {overview.users.active_users} active users
                      </p>
                    </CardContent>
                  </Card>

                  {/* Total Clients */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{overview.clients.total_clients}</div>
                      <p className="text-xs text-muted-foreground">
                        {overview.clients.active_clients} active
                      </p>
                    </CardContent>
                  </Card>

                  {/* Total Revenue */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(overview.revenue.total_revenue)}</div>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(overview.revenue.revenue_this_month)} this month
                      </p>
                    </CardContent>
                  </Card>

                  {/* Total Interviews */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Interviews</CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{overview.interviews.total_interviews}</div>
                      <p className="text-xs text-muted-foreground">
                        {overview.interviews.accepted_interviews} accepted
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* System Health */}
                {health && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        System Health
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Database</span>
                          <div className="flex items-center gap-2">
                            {getHealthStatus(health.database)}
                            <span className="text-sm capitalize">{health.database}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Redis</span>
                          <div className="flex items-center gap-2">
                            {getHealthStatus(health.redis)}
                            <span className="text-sm capitalize">{health.redis}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">API</span>
                          <div className="flex items-center gap-2">
                            {getHealthStatus(health.api)}
                            <span className="text-sm capitalize">{health.api}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-t pt-2">
                          <span className="text-sm font-medium">Overall</span>
                          <div className="flex items-center gap-2">
                            {getHealthStatus(health.overall)}
                            <span className="text-sm capitalize font-medium">{health.overall}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {activities.length > 0 ? (
                        activities.map((activity, index) => (
                          <div key={index} className="flex items-start gap-3">
                            {getActivityIcon(activity.type)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {activity.type === 'user_registration' && `${activity.name} registered as ${activity.role}`}
                                {activity.type === 'client_registration' && `${activity.name} registered as client`}
                                {activity.type === 'interview_scheduled' && `Interview scheduled for ${activity.client_name}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(activity.timestamp)}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No recent activity</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
