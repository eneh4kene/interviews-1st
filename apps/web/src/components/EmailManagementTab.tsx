import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, RefreshCw, Mail, Send, Archive, Trash2, Eye, Edit } from 'lucide-react';
import EmailModal from './EmailModal';

interface EmailData {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  attachments: Attachment[];
  from?: string;
}

interface Email {
  id: string;
  subject: string;
  from: string;
  to: string;
  body: string;
  status: 'sent' | 'received' | 'draft' | 'failed';
  createdAt: string;
  attachments?: Attachment[];
  isRead?: boolean;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

interface EmailManagementTabProps {
  clientId: string;
  clientName: string;
}

export default function EmailManagementTab({ clientId, clientName }: EmailManagementTabProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [filteredEmails, setFilteredEmails] = useState<Email[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'received' | 'draft' | 'failed'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailData | null>(null);
  const [modalMode, setModalMode] = useState<'compose' | 'reply' | 'forward' | 'review'>('compose');

  // Fetch emails from database
  useEffect(() => {
    const fetchEmails = async () => {
      try {
        setIsLoading(true);
        
        // Get auth token
        const token = localStorage.getItem('accessToken');
        if (!token) {
          console.error('No authentication token found');
          return;
        }

        // Fetch emails from API (both sent and received)
        const response = await fetch(`/api/emails/client-inbox?clientId=${clientId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // The API already returns emails in the correct format
            setEmails(result.data);
            setFilteredEmails(result.data);
          }
        } else {
          console.error('Failed to fetch emails:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching emails:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmails();
  }, [clientId]);

  // Filter emails based on search and status
  useEffect(() => {
    let filtered = emails;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(email => email.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(email => 
        email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.body.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredEmails(filtered);
  }, [emails, searchTerm, statusFilter]);

  const handleComposeEmail = () => {
    setSelectedEmail({
      to: '',
      cc: '',
      bcc: '',
      subject: '',
      body: '',
      attachments: [],
      from: 'worker@interviewsfirst.com'
    });
    setModalMode('compose');
    setIsEmailModalOpen(true);
  };

  const handleReplyEmail = (emailData: any) => {
    setSelectedEmail({
      ...emailData,
      to: emailData.from,
      from: emailData.to,
      subject: `Re: ${emailData.subject}`,
      body: `\n\n--- Original Message ---\nFrom: ${emailData.from}\nTo: ${emailData.to}\nSubject: ${emailData.subject}\n\n${emailData.body}`
    });
    setModalMode('compose');
    setIsEmailModalOpen(true);
  };

  const handleForwardEmail = (emailData: any) => {
    setSelectedEmail({
      ...emailData,
      to: '',
      subject: `Fwd: ${emailData.subject}`,
      body: `\n\n--- Forwarded Message ---\nFrom: ${emailData.from}\nTo: ${emailData.to}\nSubject: ${emailData.subject}\n\n${emailData.body}`
    });
    setModalMode('compose');
    setIsEmailModalOpen(true);
  };

  const handleViewEmail = (email: Email) => {
    // Transform Email to EmailData format
    const emailData = {
      to: email.to,
      cc: '',
      bcc: '',
      subject: email.subject,
      body: email.body,
      attachments: email.attachments || [],
      from: email.from
    };
    setSelectedEmail(emailData);
    setModalMode('review');
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = async (emailData: any) => {
    try {
      console.log('Sending email:', emailData);
      
      // Get auth token
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Send email via API
      const response = await fetch('/api/emails/send-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          to: emailData.to,
          cc: emailData.cc,
          bcc: emailData.bcc,
          subject: emailData.subject,
          body: emailData.body,
          from: emailData.from,
          attachments: emailData.attachments || [],
          clientId: clientId
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      console.log('Email sent successfully:', result.data);
      
      // Refresh emails list to show the new email
      const fetchEmails = async () => {
        try {
          const token = localStorage.getItem('accessToken');
          if (!token) return;

          const response = await fetch(`/api/emails/client-inbox?clientId=${clientId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              setEmails(result.data);
              setFilteredEmails(result.data);
            }
          }
        } catch (error) {
          console.error('Error refreshing emails:', error);
        }
      };

      await fetchEmails();
      
      // Show success message
      alert('Email sent successfully!');
      
    } catch (error) {
      console.error('Failed to send email:', error);
      alert(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSaveDraft = async (emailData: any) => {
    // TODO: Implement actual draft saving
    console.log('Saving draft:', emailData);
    
    const draftEmail: Email = {
      id: Math.random().toString(36).substr(2, 9),
      subject: emailData.subject || 'No Subject',
      from: emailData.from,
      to: emailData.to,
      body: emailData.body,
      status: 'draft',
      createdAt: new Date().toISOString(),
      attachments: emailData.attachments || [],
      isRead: true
    };

    setEmails(prev => [draftEmail, ...prev]);
  };

  const handleDeleteEmails = async (emailIds: string[]) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      // Delete emails from database
      for (const emailId of emailIds) {
        // Check if it's a sent email (from email_queue) or received email (from email_inbox)
        const email = emails.find(e => e.id === emailId);
        if (email) {
          if (email.status === 'sent' || email.status === 'failed' || email.status === 'draft') {
            // Delete from email_queue
            await fetch(`/api/emails/queue/${emailId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
          } else if (email.status === 'received') {
            // Delete from email_inbox
            await fetch(`/api/emails/inbox/${emailId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
          }
        }
      }

      // Update local state
      setEmails(prev => prev.filter(email => !emailIds.includes(email.id)));
      setFilteredEmails(prev => prev.filter(email => !emailIds.includes(email.id)));
      setSelectedEmails([]);
    } catch (error) {
      console.error('Error deleting emails:', error);
      alert('Failed to delete emails');
    }
  };

  const handleMarkAsRead = async (emailIds: string[]) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      // Update emails in database
      for (const emailId of emailIds) {
        const email = emails.find(e => e.id === emailId);
        if (email) {
          if (email.status === 'received') {
            // Update in email_inbox
            await fetch(`/api/emails/inbox/${emailId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ is_read: true })
            });
          }
          // Note: Sent emails are already marked as read by default
        }
      }

      // Update local state
      setEmails(prev => prev.map(email => 
        emailIds.includes(email.id) ? { ...email, isRead: true } : email
      ));
      setFilteredEmails(prev => prev.map(email => 
        emailIds.includes(email.id) ? { ...email, isRead: true } : email
      ));
      setSelectedEmails([]);
    } catch (error) {
      console.error('Error marking emails as read:', error);
      alert('Failed to mark emails as read');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800';
      case 'received': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Send size={16} />;
      case 'received': return <Mail size={16} />;
      case 'draft': return <Edit size={16} />;
      case 'failed': return <Trash2 size={16} />;
      default: return <Mail size={16} />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold">Email Management</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              setIsLoading(true);
              // Refresh emails using the same endpoint as initial load
              const token = localStorage.getItem('accessToken');
              if (!token) return;

              try {
                const response = await fetch(`/api/emails/client-inbox?clientId=${clientId}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });

                if (response.ok) {
                  const result = await response.json();
                  if (result.success && result.data) {
                    setEmails(result.data);
                    setFilteredEmails(result.data);
                  }
                }
              } catch (error) {
                console.error('Error refreshing emails:', error);
              } finally {
                setIsLoading(false);
              }
            }}
            className="p-2 hover:bg-gray-100 rounded"
            title="Refresh"
          >
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleComposeEmail}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus size={20} />
            Compose
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={20} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All</option>
              <option value="sent">Sent</option>
              <option value="received">Received</option>
              <option value="draft">Drafts</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedEmails.length > 0 && (
        <div className="p-4 border-b bg-blue-50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{selectedEmails.length} selected</span>
            <button
              onClick={() => handleMarkAsRead(selectedEmails)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Mark as Read
            </button>
            <button
              onClick={() => handleDeleteEmails(selectedEmails)}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Email List */}
      <div className="flex-1 overflow-auto">
        {filteredEmails.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <Mail size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No emails found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {filteredEmails.map((email) => (
              <div
                key={email.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer ${
                  !email.isRead ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
                onClick={() => handleViewEmail(email)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="checkbox"
                        checked={selectedEmails.includes(email.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (e.target.checked) {
                            setSelectedEmails(prev => [...prev, email.id]);
                          } else {
                            setSelectedEmails(prev => prev.filter(id => id !== email.id));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(email.status)}`}>
                        {getStatusIcon(email.status)}
                        {email.status}
                      </span>
                      {!email.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                    </div>
                    <h3 className="font-medium text-gray-900 truncate">{email.subject}</h3>
                    <p className="text-sm text-gray-600 truncate">
                      {email.status === 'received' ? `From: ${email.from}` : `To: ${email.to}`}
                    </p>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{email.body}</p>
                    {email.attachments && email.attachments.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                        <span>📎 {email.attachments.length} attachment(s)</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <span className="text-xs text-gray-500">
                      {new Date(email.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-1">
                      {email.status === 'received' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReplyEmail(email);
                          }}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="Reply"
                        >
                          <Edit size={16} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleForwardEmail(email);
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                        title="Forward"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Email Modal */}
      <EmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onSend={handleSendEmail}
        onSaveDraft={handleSaveDraft}
        onReply={handleReplyEmail}
        onForward={handleForwardEmail}
        initialData={selectedEmail || undefined}
        mode={modalMode}
        readOnly={modalMode === 'review'}
      />
    </div>
  );
}
