"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@interview-me/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@interview-me/ui";
import { Input } from "@interview-me/ui";
import { Label } from "@interview-me/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@interview-me/ui";
import { 
  Mail, 
  Plus, 
  Edit, 
  Trash2, 
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  Settings,
  Eye,
  Play
} from "lucide-react";
import { apiService } from '../../../lib/api';
import Logo from '../../../components/Logo';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EmailQueueItem {
  id: string;
  to_email: string;
  to_name?: string;
  subject: string;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'bounced' | 'delivered';
  priority: number;
  scheduled_at: string;
  sent_at?: string;
  error_message?: string;
  retry_count: number;
  created_at: string;
}

export default function EmailManagement() {
  const router = useRouter();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [queueItems, setQueueItems] = useState<EmailQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

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

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) return;

      setLoading(true);
      setError(null);

      try {
        const [templatesResponse, queueResponse] = await Promise.all([
          apiService.getEmailTemplates(categoryFilter, searchTerm),
          apiService.getEmailQueue(statusFilter, 1, 10)
        ]);

        if (templatesResponse.success) {
          setTemplates(templatesResponse.data || []);
        } else {
          setError(templatesResponse.error || 'Failed to fetch templates');
        }

        if (queueResponse.success) {
          setQueueItems(queueResponse.data.emails || []);
        }
      } catch (error) {
        console.error('Error fetching email data:', error);
        setError('Failed to fetch email data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, categoryFilter, searchTerm, statusFilter]);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleProcessQueue = async () => {
    try {
      const response = await apiService.processEmailQueue();
      if (response.success) {
        alert('Email queue processing initiated');
        handleRefresh();
      } else {
        alert('Failed to process email queue');
      }
    } catch (error) {
      console.error('Error processing email queue:', error);
      alert('Failed to process email queue');
    }
  };

  const handleSendTestEmail = async (templateName: string) => {
    const toEmail = prompt('Enter test email address:');
    if (!toEmail) return;

    try {
      const response = await apiService.sendTestEmail(toEmail, 'Test User', templateName);
      if (response.success) {
        alert('Test email sent successfully');
      } else {
        alert('Failed to send test email');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      alert('Failed to send test email');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'bounced':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'sending':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'failed':
      case 'bounced':
        return 'bg-red-100 text-red-800';
      case 'sending':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
              <h1 className="ml-4 text-xl font-semibold text-gray-900">Email Management</h1>
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
                New Template
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('templates')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'templates'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Mail className="h-4 w-4 inline mr-2" />
                Templates
              </button>
              <button
                onClick={() => setActiveTab('queue')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'queue'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Clock className="h-4 w-4 inline mr-2" />
                Email Queue
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'analytics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BarChart3 className="h-4 w-4 inline mr-2" />
                Analytics
              </button>
            </nav>
          </div>
        </div>

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <>
            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search templates..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-40 bg-white border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg">
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="welcome">Welcome</SelectItem>
                        <SelectItem value="interview">Interview</SelectItem>
                        <SelectItem value="notification">Notification</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Templates List */}
            <div className="grid gap-6">
              {loading ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading templates...</p>
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
              ) : templates.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
                    <p className="text-gray-500 mb-4">
                      {searchTerm || categoryFilter !== 'all'
                        ? 'Try adjusting your search or filter criteria.'
                        : 'Get started by creating your first email template.'
                      }
                    </p>
                    <Button onClick={() => setShowCreateModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Template
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {templates.map((template) => (
                    <Card key={template.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">{template.subject}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {template.is_active ? 'Active' : 'Inactive'}
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {template.category}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handleSendTestEmail(template.name)}
                              variant="outline"
                              size="sm"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => setEditingTemplate(template)}
                              variant="outline"
                              size="sm"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Queue Tab */}
        {activeTab === 'queue' && (
          <>
            {/* Queue Controls */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40 bg-white border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg">
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="sending">Sending</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="bounced">Bounced</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleProcessQueue} className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Process Queue
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Queue Items */}
            <div className="grid gap-4">
              {queueItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{item.subject}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          To: {item.to_name} &lt;{item.to_email}&gt;
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                            {getStatusIcon(item.status)}
                            <span className="ml-1 capitalize">{item.status}</span>
                          </span>
                          <span className="text-xs text-gray-500">
                            Priority: {item.priority}
                          </span>
                          {item.retry_count > 0 && (
                            <span className="text-xs text-yellow-600">
                              Retries: {item.retry_count}
                            </span>
                          )}
                        </div>
                        {item.error_message && (
                          <p className="text-sm text-red-600 mt-2">{item.error_message}</p>
                        )}
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <p>Scheduled: {new Date(item.scheduled_at).toLocaleString()}</p>
                        {item.sent_at && (
                          <p>Sent: {new Date(item.sent_at).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Email Analytics</h3>
              <p className="text-gray-500">Analytics dashboard will be implemented here.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Template Modal - Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-medium mb-4">Create Email Template</h3>
            <p className="text-gray-600 mb-4">Template creation form will be implemented here.</p>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setShowCreateModal(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button onClick={() => setShowCreateModal(false)}>
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Template Modal - Placeholder */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-medium mb-4">Edit Email Template</h3>
            <p className="text-gray-600 mb-4">Template editing form will be implemented here.</p>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setEditingTemplate(null)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button onClick={() => setEditingTemplate(null)}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
