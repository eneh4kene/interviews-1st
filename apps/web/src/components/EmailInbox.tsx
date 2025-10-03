'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@interview-me/ui';
import { Button } from '@interview-me/ui';
import { Input } from '@interview-me/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@interview-me/ui';
import { Badge } from '@interview-me/ui';
import { 
  Mail, 
  Search, 
  Filter, 
  Reply, 
  Archive, 
  Trash2, 
  Eye,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { processEmailContent } from '@/lib/utils/htmlSanitizer';

interface Email {
  id: string;
  from_email: string;
  from_name: string;
  subject: string;
  content: string;
  received_at: string;
  status: string;
  is_read: boolean;
  thread_id: string;
  reply_to_email: string;
  client_id: string;
  application_email_id: string;
}

interface EmailThread {
  thread_id: string;
  emails: Email[];
}

export default function EmailInbox() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch emails
  const fetchEmails = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/emails/inbox?page=${page}&status=${statusFilter}&search=${searchTerm}`
      );
      const data = await response.json();
      
      if (data.success) {
        setEmails(data.data.emails);
        setTotalPages(data.data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch email thread
  const fetchThread = async (threadId: string) => {
    try {
      const response = await fetch(`/api/emails/threads/${threadId}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedThread(data.data);
      }
    } catch (error) {
      console.error('Error fetching thread:', error);
    }
  };

  // Mark as read
  const markAsRead = async (emailId: string) => {
    try {
      await fetch(`/api/emails/inbox/${emailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true })
      });
      fetchEmails();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Reply to email
  const replyToEmail = async (threadId: string, content: string, subject: string) => {
    try {
      const response = await fetch(`/api/emails/threads/${threadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, subject })
      });
      
      if (response.ok) {
        fetchThread(threadId);
        fetchEmails();
      }
    } catch (error) {
      console.error('Error replying to email:', error);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [page, statusFilter, searchTerm]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'unread': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'read': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'replied': return <Reply className="h-4 w-4 text-purple-500" />;
      case 'archived': return <Archive className="h-4 w-4 text-gray-500" />;
      default: return <Mail className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      unread: 'bg-blue-100 text-blue-800',
      read: 'bg-green-100 text-green-800',
      replied: 'bg-purple-100 text-purple-800',
      archived: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Email Inbox</h2>
        <div className="flex items-center space-x-4">
          <Button onClick={fetchEmails} variant="outline">
            <Mail className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <Input
            placeholder="Search emails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Emails</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
            <SelectItem value="replied">Replied</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Email List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Inbox ({emails.length})</h3>
          {emails.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No emails found</p>
              </CardContent>
            </Card>
          ) : (
            emails.map((email) => (
              <Card 
                key={email.id} 
                className={`cursor-pointer transition-colors ${
                  !email.is_read ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                }`}
                onClick={() => fetchThread(email.thread_id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusIcon(email.status)}
                        <span className="font-medium text-gray-900 truncate">
                          {email.from_name || email.from_email}
                        </span>
                        {!email.is_read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {email.subject}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {processEmailContent(email.content).textContent.substring(0, 100)}...
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">
                          {new Date(email.received_at).toLocaleString()}
                        </span>
                        {getStatusBadge(email.status)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Email Thread */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Conversation</h3>
          {selectedThread ? (
            <div className="space-y-4">
              {selectedThread.emails.map((email, index) => (
                <Card key={email.id} className={index === 0 ? 'bg-blue-50' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-medium text-gray-900">
                          {email.from_name || email.from_email}
                        </span>
                        <span className="text-sm text-gray-500 ml-2">
                          {new Date(email.received_at).toLocaleString()}
                        </span>
                      </div>
                      {getStatusBadge(email.status)}
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-2">
                      {email.subject}
                    </p>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {processEmailContent(email.content).textContent}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Select an email to view conversation</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
