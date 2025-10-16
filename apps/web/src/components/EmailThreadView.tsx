'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@interview-me/ui';
import { Badge } from '@interview-me/ui';
import { 
  Mail, 
  Reply, 
  Forward, 
  Clock,
  CheckCircle,
  User,
  Calendar,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { processEmailContent } from '@/lib/utils/htmlSanitizer';
import { extractMainContent } from '@/lib/utils/emailCleaner';

interface Email {
  id: string;
  from_email: string;
  from_name: string;
  subject: string;
  content: string;
  html_content?: string;
  received_at: string;
  status: string;
  is_read: boolean;
  thread_id: string;
  type?: 'sent' | 'received';
}

interface EmailThread {
  thread_id: string;
  emails: Email[];
}

interface EmailThreadViewProps {
  thread: EmailThread | null;
  onReply?: (email: Email) => void;
  onForward?: (email: Email) => void;
  onMarkAsRead?: (emailId: string) => void;
}

export default function EmailThreadView({ 
  thread, 
  onReply, 
  onForward, 
  onMarkAsRead 
}: EmailThreadViewProps) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [showAllMessages, setShowAllMessages] = useState(false);

  if (!thread || !thread.emails.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Select an email to view conversation</p>
        </CardContent>
      </Card>
    );
  }

  const toggleMessageExpansion = (emailId: string) => {
    const newExpanded = new Set(expandedMessages);
    if (newExpanded.has(emailId)) {
      newExpanded.delete(emailId);
    } else {
      newExpanded.add(emailId);
    }
    setExpandedMessages(newExpanded);
  };

  // Group consecutive messages from the same sender
  const groupedMessages = thread.emails.reduce((groups: any[], email, index) => {
    const isOutgoingEmail = isOutgoing(email);
    const prevEmail = index > 0 ? thread.emails[index - 1] : null;
    const prevIsOutgoing = prevEmail ? isOutgoing(prevEmail) : null;
    
    if (index === 0 || isOutgoingEmail !== prevIsOutgoing) {
      groups.push({
        id: `group-${index}`,
        sender: email.from_name || email.from_email,
        isOutgoing: isOutgoingEmail,
        emails: [email],
        startIndex: index
      });
    } else {
      groups[groups.length - 1].emails.push(email);
    }
    
    return groups;
  }, []);

  const isOutgoing = (email: Email) => {
    return email.type === 'sent' || email.from_email.includes('@interviewsfirst.com');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'unread': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'read': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'replied': return <Reply className="h-4 w-4 text-purple-500" />;
      case 'sent': return <Mail className="h-4 w-4 text-blue-500" />;
      default: return <Mail className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      unread: 'bg-blue-100 text-blue-800',
      read: 'bg-green-100 text-green-800',
      replied: 'bg-purple-100 text-purple-800',
      sent: 'bg-blue-100 text-blue-800',
      archived: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const formatEmailContent = (content: string) => {
    // Extract main content and clean up quoted text
    const mainContent = extractMainContent(content);
    const processed = processEmailContent(mainContent);
    return processed.textContent;
  };

  const isOutgoing = (email: Email) => {
    return email.type === 'sent' || email.from_email.includes('@interviewsfirst.com');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Thread Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {thread.emails[0]?.subject || 'Conversation'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {thread.emails.length} message{thread.emails.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              Thread
            </Badge>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="divide-y divide-gray-100">
        {groupedMessages.map((group, groupIndex) => {
          const isFirstGroup = groupIndex === 0;
          const isLastGroup = groupIndex === groupedMessages.length - 1;
          const showGroupCount = group.emails.length > 1;
          
          return (
            <div key={group.id} className="relative">
              {/* Group Header */}
              <div className={`px-6 py-4 hover:bg-gray-50 transition-colors ${
                isFirstGroup ? 'bg-blue-50/30' : ''
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      group.isOutgoing 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {group.sender.charAt(0).toUpperCase()}
                    </div>
                    
                    {/* Sender Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {group.sender}
                        </span>
                        {showGroupCount && (
                          <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                            {group.emails.length}
                          </span>
                        )}
                        {!group.emails[0].is_read && !group.isOutgoing && (
                          <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                            New
                          </span>
                        )}
                        {group.isOutgoing && (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                            Sent
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span>{new Date(group.emails[0].received_at).toLocaleString()}</span>
                        {group.isOutgoing && (
                          <>
                            <span>•</span>
                            <span>to {group.emails[0].to || 'recipient'}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Status */}
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(group.emails[0].status)}
                  </div>
                </div>

                {/* Message Content */}
                <div className="ml-11 mt-3">
                  <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {formatEmailContent(group.emails[0].content)}
                  </div>
                </div>

                {/* Preview of additional messages when collapsed */}
                {showGroupCount && !expandedMessages.has(group.id) && (
                  <div className="ml-11 mt-2">
                    <div className="text-xs text-gray-500 italic">
                      {group.emails.length - 1} more message{group.emails.length - 1 !== 1 ? 's' : ''} from {group.sender}
                    </div>
                  </div>
                )}

                {/* Show additional messages if collapsed */}
                {showGroupCount && (
                  <div className="ml-11 mt-3">
                    <button
                      onClick={() => toggleMessageExpansion(group.id)}
                      className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800"
                    >
                      {expandedMessages.has(group.id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      <span>
                        {expandedMessages.has(group.id) 
                          ? 'Hide' 
                          : `Show ${group.emails.length - 1} more message${group.emails.length - 1 !== 1 ? 's' : ''}`
                        }
                      </span>
                    </button>
                  </div>
                )}

                {/* Expanded additional messages */}
                {showGroupCount && expandedMessages.has(group.id) && (
                  <div className="ml-11 mt-3 space-y-3">
                    {group.emails.slice(1).map((email: Email, index: number) => (
                      <div key={email.id} className="border-l-2 border-gray-200 pl-4">
                        <div className="text-xs text-gray-500 mb-2">
                          {new Date(email.received_at).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {formatEmailContent(email.content)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Message Actions */}
                {isLastGroup && (
                  <div className="ml-11 mt-4 flex items-center space-x-4">
                    {!group.isOutgoing && onReply && (
                      <button
                        onClick={() => onReply(group.emails[0])}
                        className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <Reply className="h-4 w-4" />
                        <span>Reply</span>
                      </button>
                    )}
                    
                    {onForward && (
                      <button
                        onClick={() => onForward(group.emails[0])}
                        className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
                      >
                        <Forward className="h-4 w-4" />
                        <span>Forward</span>
                      </button>
                    )}
                    
                    {!group.emails[0].is_read && !group.isOutgoing && onMarkAsRead && (
                      <button
                        onClick={() => onMarkAsRead(group.emails[0].id)}
                        className="flex items-center space-x-2 text-sm text-green-600 hover:text-green-800 font-medium"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Mark as Read</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
