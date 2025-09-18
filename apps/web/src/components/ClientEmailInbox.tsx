'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@interview-me/ui/button';
import { Card } from '@interview-me/ui/card';
import { Input } from '@interview-me/ui/input';
import { Label } from '@interview-me/ui/label';

interface Email {
  id: string;
  from_email: string;
  from_name: string;
  subject: string;
  content: string;
  html_content?: string;
  received_at: string;
  is_read: boolean;
  thread_id: string;
}

interface ClientEmailInboxProps {
  clientId: string;
  clientName: string;
  clientEmail: string;
}

export const ClientEmailInbox: React.FC<ClientEmailInboxProps> = ({
  clientId,
  clientName,
  clientEmail
}) => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [isSettingCustom, setIsSettingCustom] = useState(false);

  // Fetch emails from inbox
  const fetchEmails = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`/api/clients/${clientId}/inbox`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setEmails(result.data.emails);
        }
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Set custom email address
  const handleSetCustomEmail = async () => {
    if (!customEmail.trim()) return;

    try {
      setIsSettingCustom(true);
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`/api/clients/${clientId}/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ customEmail: customEmail.trim() })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert('Custom email address set successfully!');
          setCustomEmail('');
          // Refresh the page to show the new email
          window.location.reload();
        }
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error setting custom email:', error);
      alert('Failed to set custom email address');
    } finally {
      setIsSettingCustom(false);
    }
  };

  // Reset to auto-generated email
  const handleResetEmail = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`/api/clients/${clientId}/email`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert('Email address reset to auto-generated!');
          // Refresh the page to show the new email
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Error resetting email:', error);
      alert('Failed to reset email address');
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [clientId]);

  return (
    <div className="space-y-6">
      {/* Client Email Address Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Email Address for {clientName}</h3>
        
        <div className="space-y-4">
          <div>
            <Label>Current Email Address</Label>
            <div className="flex items-center space-x-2 mt-1">
              <Input
                value={clientEmail}
                readOnly
                className="bg-gray-50"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetEmail}
              >
                Reset to Auto
              </Button>
            </div>
          </div>

          <div>
            <Label>Set Custom Email Address</Label>
            <div className="flex items-center space-x-2 mt-1">
              <Input
                placeholder="custom@interviewsfirst.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
              />
              <Button
                onClick={handleSetCustomEmail}
                disabled={!customEmail.trim() || isSettingCustom}
                size="sm"
              >
                {isSettingCustom ? 'Setting...' : 'Set Custom'}
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Emails sent to this client will appear to come from this address
            </p>
          </div>
        </div>
      </Card>

      {/* Email Inbox Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Inbox for {clientName}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchEmails}
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {emails.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No emails in inbox yet</p>
            <p className="text-sm mt-1">
              When someone replies to {clientEmail}, it will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {emails.map((email) => (
              <div
                key={email.id}
                className={`p-4 border rounded-lg ${
                  email.is_read ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        {email.from_name || email.from_email}
                      </span>
                      {!email.is_read && (
                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{email.subject}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(email.received_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-700">
                  {email.content.substring(0, 200)}
                  {email.content.length > 200 && '...'}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ClientEmailInbox;
