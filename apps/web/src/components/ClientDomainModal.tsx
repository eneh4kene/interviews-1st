'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@interview-me/ui/button';
import { Input } from '@interview-me/ui/input';
import { Label } from '@interview-me/ui/label';
import { Card } from '@interview-me/ui/card';

interface ClientDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  currentDomain?: string;
  currentSenderEmail?: string;
  isVerified?: boolean;
  onSave: (domain: string, senderEmail: string) => Promise<void>;
}

export const ClientDomainModal: React.FC<ClientDomainModalProps> = ({
  isOpen,
  onClose,
  clientId,
  clientName,
  currentDomain = '',
  currentSenderEmail = '',
  isVerified = false,
  onSave
}) => {
  const [domain, setDomain] = useState(currentDomain);
  const [senderEmail, setSenderEmail] = useState(currentSenderEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDomain(currentDomain);
      setSenderEmail(currentSenderEmail);
      setError('');
    }
  }, [isOpen, currentDomain, currentSenderEmail]);

  const handleSave = async () => {
    if (!domain.trim()) {
      setError('Domain is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onSave(domain.trim(), senderEmail.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save domain configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDomainChange = (value: string) => {
    setDomain(value);
    // Auto-generate sender email if not provided
    if (!senderEmail && value && !value.includes('@')) {
      setSenderEmail(`careers@${value}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-xl font-semibold mb-4">Configure Domain for {clientName}</h2>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="domain">Custom Domain</Label>
            <Input
              id="domain"
              type="text"
              placeholder="example.com"
              value={domain}
              onChange={(e) => handleDomainChange(e.target.value)}
              className="mt-1"
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter the domain (e.g., techcorp.com) without @ or email prefix
            </p>
          </div>

          <div>
            <Label htmlFor="senderEmail">Sender Email</Label>
            <Input
              id="senderEmail"
              type="email"
              placeholder="careers@example.com"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              className="mt-1"
            />
            <p className="text-sm text-gray-500 mt-1">
              Email address to send from (e.g., careers@techcorp.com)
            </p>
          </div>

          {isVerified && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                ✅ Domain is verified and ready to use
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || !domain.trim()}
            >
              {isLoading ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ClientDomainModal;
