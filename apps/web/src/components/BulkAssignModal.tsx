"use client";

import { useState, useEffect } from "react";
import { Button } from "@interview-me/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@interview-me/ui";
import { Label } from "@interview-me/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@interview-me/ui";
import { X, UserPlus, Users } from "lucide-react";
import { apiService } from '../lib/api';

interface BulkAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedClients: string[];
  clientNames: { [key: string]: string };
}

interface Worker {
  id: string;
  name: string;
  email: string;
}

export default function BulkAssignModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  selectedClients, 
  clientNames 
}: BulkAssignModalProps) {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch workers when component mounts
  useEffect(() => {
    if (isOpen) {
      fetchWorkers();
    }
  }, [isOpen]);

  const fetchWorkers = async () => {
    try {
      const response = await apiService.getWorkers(1, 100);
      if (response.success) {
        setWorkers(response.data.workers || []);
      }
    } catch (error) {
      console.error('Error fetching workers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedWorkerId) {
      setError('Please select a worker');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.bulkAssignClients(selectedClients, selectedWorkerId);
      
      if (response.success) {
        onSuccess();
      } else {
        setError(response.error || 'Failed to assign talent');
      }
    } catch (error) {
      console.error('Error assigning talent:', error);
      setError('Failed to assign talent');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto modal">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Assign Talent to Worker</CardTitle>
            <CardDescription>
              Assign {selectedClients.length} selected talent to a worker
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label>Selected Clients ({selectedClients.length})</Label>
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-3 bg-gray-50">
                {selectedClients.map((clientId) => (
                  <div key={clientId} className="text-sm text-gray-700 py-1">
                    • {clientNames[clientId] || `Client ${clientId}`}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="worker">Assign to Worker *</Label>
              <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                <SelectTrigger className="bg-white border-gray-300">
                  <SelectValue placeholder="Select a worker" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  {workers.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.name} ({worker.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !selectedWorkerId}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Assigning...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Assign Talent
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
