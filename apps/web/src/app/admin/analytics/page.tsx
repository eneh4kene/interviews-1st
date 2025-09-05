"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@interview-me/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@interview-me/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@interview-me/ui";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target, 
  Activity,
  Download,
  RefreshCw,
  Calendar,
  UserCheck,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronLeft
} from "lucide-react";
import { apiService } from '../../../lib/api';
import Logo from '../../../components/Logo';

interface AnalyticsOverview {
  period: string;
  userGrowth: Array<{
    date: string;
    new_users: number;
    new_clients: number;
    new_workers: number;
  }>;
  revenue: {
    total_revenue: number;
    revenue_30d: number;
    revenue_7d: number;
    active_clients: number;
    placed_clients: number;
  };
  interviews: {
    total_interviews: number;
    accepted_interviews: number;
    declined_interviews: number;
    pending_interviews: number;
    success_rate: number;
  };
  workerPerformance: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    total_clients: number;
    active_clients: number;
    placed_clients: number;
    total_revenue: number;
    total_interviews: number;
    successful_interviews: number;
    success_rate: number;
  }>;
  platformHealth: {
    active_users: number;
    active_last_7d: number;
    active_last_30d: number;
    users_with_2fa: number;
  };
  generatedAt: string;
}

export default function AnalyticsDashboard() {
  const router = useRouter();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

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

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!isAuthenticated) return;

      try {
        setLoading(true);
        setError(null);

        const response = await apiService.getAnalyticsOverview(selectedPeriod);

        if (response.success) {
          setOverview(response.data);
        } else {
          setError(response.error || 'Failed to fetch analytics data');
        }
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [isAuthenticated, selectedPeriod]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await apiService.getAnalyticsOverview(selectedPeriod);
      if (response.success) {
        setOverview(response.data);
      }
    } catch (err) {
      console.error('Failed to refresh analytics:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await apiService.exportAnalytics('overview', 'json', selectedPeriod);
      if (response.success) {
        // For now, just show a message. In a real implementation, this would download a file
        alert('Export functionality will be implemented with file download');
      }
    } catch (err) {
      console.error('Failed to export analytics:', err);
      alert('Failed to export analytics data');
    }
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
      year: 'numeric'
    });
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (current < previous) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = (current: number, previous: number) => {
    if (current > previous) return 'text-green-600';
    if (current < previous) return 'text-red-600';
    return 'text-gray-600';
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
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Logo />
              <h1 className="ml-4 text-xl font-semibold text-gray-900">Platform Analytics</h1>
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
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={handleExport}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading analytics...</p>
            </div>
          </div>
        ) : error ? (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        ) : overview ? (
          <>
            {/* Key Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Revenue */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(overview.revenue.total_revenue)}</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    {getTrendIcon(overview.revenue.revenue_30d, 0)}
                    <span className="ml-1">Last 30 days: {formatCurrency(overview.revenue.revenue_30d)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Active Users */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overview.platformHealth.active_users}</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                    <span>{overview.platformHealth.active_last_7d} active in last 7 days</span>
                  </div>
                </CardContent>
              </Card>

              {/* Interview Success Rate */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overview.interviews.success_rate}%</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <span>{overview.interviews.accepted_interviews} of {overview.interviews.total_interviews} interviews accepted</span>
                  </div>
                </CardContent>
              </Card>

              {/* Active Clients */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overview.revenue.active_clients}</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <span>{overview.revenue.placed_clients} placed successfully</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Analytics Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Revenue Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Revenue Trends
                  </CardTitle>
                  <CardDescription>
                    Revenue breakdown for the selected period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Revenue</span>
                      <span className="text-lg font-bold">{formatCurrency(overview.revenue.total_revenue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Last 30 Days</span>
                      <span className="text-sm">{formatCurrency(overview.revenue.revenue_30d)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Last 7 Days</span>
                      <span className="text-sm">{formatCurrency(overview.revenue.revenue_7d)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Average per Client</span>
                      <span className="text-sm">
                        {formatCurrency(overview.revenue.total_revenue / Math.max(overview.revenue.active_clients, 1))}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Platform Health */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Platform Health
                  </CardTitle>
                  <CardDescription>
                    User engagement and security metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Active Users</span>
                      <span className="text-lg font-bold">{overview.platformHealth.active_users}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Active Last 7 Days</span>
                      <span className="text-sm">{overview.platformHealth.active_last_7d}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Active Last 30 Days</span>
                      <span className="text-sm">{overview.platformHealth.active_last_30d}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">2FA Enabled</span>
                      <span className="text-sm">{overview.platformHealth.users_with_2fa}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Worker Performance Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Worker Performance
                </CardTitle>
                <CardDescription>
                  Top performing workers by revenue and success metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Worker</th>
                        <th className="text-left py-2">Role</th>
                        <th className="text-right py-2">Clients</th>
                        <th className="text-right py-2">Revenue</th>
                        <th className="text-right py-2">Interviews</th>
                        <th className="text-right py-2">Success Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.workerPerformance.slice(0, 10).map((worker) => (
                        <tr key={worker.id} className="border-b hover:bg-gray-50">
                          <td className="py-2">
                            <div>
                              <div className="font-medium">{worker.name}</div>
                              <div className="text-xs text-gray-500">{worker.email}</div>
                            </div>
                          </td>
                          <td className="py-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              worker.role === 'MANAGER' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {worker.role}
                            </span>
                          </td>
                          <td className="text-right py-2">
                            <div className="font-medium">{worker.total_clients}</div>
                            <div className="text-xs text-gray-500">
                              {worker.active_clients} active, {worker.placed_clients} placed
                            </div>
                          </td>
                          <td className="text-right py-2 font-medium">
                            {formatCurrency(worker.total_revenue)}
                          </td>
                          <td className="text-right py-2">
                            <div className="font-medium">{worker.total_interviews}</div>
                            <div className="text-xs text-gray-500">
                              {worker.successful_interviews} successful
                            </div>
                          </td>
                          <td className="text-right py-2">
                            <span className={`font-medium ${
                              worker.success_rate >= 80 ? 'text-green-600' :
                              worker.success_rate >= 60 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {worker.success_rate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Data Generated Info */}
            <div className="mt-6 text-center text-sm text-gray-500">
              Data generated at {formatDate(overview.generatedAt)} for {selectedPeriod} period
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
