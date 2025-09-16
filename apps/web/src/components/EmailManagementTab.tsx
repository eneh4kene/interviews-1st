import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, RefreshCw, Mail, Send, Archive, Trash2, Eye, Edit } from 'lucide-react';
import EmailModal from './EmailModal';

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
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [modalMode, setModalMode] = useState<'compose' | 'reply' | 'forward' | 'review'>('compose');

  // Mock data - replace with actual API calls
  useEffect(() => {
    const mockEmails: Email[] = [
      {
        id: '1',
        subject: 'Application for Senior Software Engineer Position',
        from: 'john.smith.123456@interviewsfirst.com',
        to: 'hiring@google.com',
        body: 'Dear Hiring Manager,\n\nI am writing to express my strong interest in the Senior Software Engineer position at Google...',
        status: 'sent',
        createdAt: '2025-01-15T10:30:00Z',
        attachments: [{
          id: 'att1',
          name: 'John_Smith_Resume_Google.pdf',
          url: 'https://blob.vercel-storage.com/resume-google.pdf',
          size: 245760,
          type: 'application/pdf'
        }],
        isRead: true
      },
      {
        id: '2',
        subject: 'Thank you for your application',
        from: 'hiring@google.com',
        to: 'john.smith.123456@interviewsfirst.com',
        body: 'Thank you for your interest in Google. We have received your application and will review it...',
        status: 'received',
        createdAt: '2025-01-15T14:20:00Z',
        isRead: false
      },
      {
        id: '3',
        subject: 'Follow-up on Application',
        from: 'worker@interviewsfirst.com',
        to: 'hiring@microsoft.com',
        body: 'Dear Hiring Team,\n\nI wanted to follow up on the application submitted last week...',
        status: 'draft',
        createdAt: '2025-01-16T09:15:00Z',
        isRead: true
      }
    ];
    
    setEmails(mockEmails);
    setFilteredEmails(mockEmails);
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
    setSelectedEmail(null);
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
    setSelectedEmail(email);
    setModalMode('review');
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = async (emailData: any) => {
    // TODO: Implement actual email sending
    console.log('Sending email:', emailData);
    
    // Mock sending
    const newEmail: Email = {
      id: Math.random().toString(36).substr(2, 9),
      subject: emailData.subject,
      from: emailData.from,
      to: emailData.to,
      body: emailData.body,
      status: 'sent',
      createdAt: new Date().toISOString(),
      attachments: emailData.attachments || [],
      isRead: true
    };

    setEmails(prev => [newEmail, ...prev]);
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

  const handleDeleteEmails = (emailIds: string[]) => {
    setEmails(prev => prev.filter(email => !emailIds.includes(email.id)));
    setSelectedEmails([]);
  };

  const handleMarkAsRead = (emailIds: string[]) => {
    setEmails(prev => prev.map(email => 
      emailIds.includes(email.id) ? { ...email, isRead: true } : email
    ));
    setSelectedEmails([]);
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
            onClick={() => setIsLoading(true)}
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
