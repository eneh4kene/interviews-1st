"use client";

import { useState, useEffect } from "react";
import { Button } from "@interview-me/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@interview-me/ui";
import { Input } from "@interview-me/ui";
import { Label } from "@interview-me/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@interview-me/ui";
import { X, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { apiService } from '../lib/api';

interface WorkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  worker?: {
    id: string;
    name: string;
    email: string;
    role: 'WORKER' | 'MANAGER';
    is_active: boolean;
    two_factor_enabled: boolean;
  } | null;
}

export default function WorkerModal({ isOpen, onClose, onSuccess, worker }: WorkerModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'WORKER' as 'WORKER' | 'MANAGER',
    isActive: true,
    twoFactorEnabled: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const isEdit = !!worker;

  useEffect(() => {
    if (isOpen) {
      if (worker) {
        setFormData({
          name: worker.name,
          email: worker.email,
          password: '', // Don't pre-fill password for security
          role: worker.role,
          isActive: worker.is_active,
          twoFactorEnabled: worker.two_factor_enabled
        });
      } else {
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'WORKER',
          isActive: true,
          twoFactorEnabled: false
        });
      }
      setError(null);
      setShowPassword(false);
    }
  }, [isOpen, worker]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        setError('Name is required');
        return;
      }

      if (!formData.email.trim()) {
        setError('Email is required');
        return;
      }

      if (!isEdit && !formData.password.trim()) {
        setError('Password is required');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address');
        return;
      }

      // Validate password strength (only for new workers or when changing password)
      if (!isEdit || formData.password.trim()) {
        if (formData.password.length < 8) {
          setError('Password must be at least 8 characters long');
          return;
        }
      }

      let response;
      if (isEdit) {
        // Update existing worker
        const updateData: any = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: formData.role,
          isActive: formData.isActive,
          twoFactorEnabled: formData.twoFactorEnabled
        };

        // Only include password if it's provided
        if (formData.password.trim()) {
          updateData.password = formData.password;
        }

        response = await apiService.updateWorker(worker!.id, updateData);
      } else {
        // Create new worker
        response = await apiService.createWorker({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
          isActive: formData.isActive,
          twoFactorEnabled: formData.twoFactorEnabled
        });
      }

      if (response.success) {
        onSuccess();
        onClose();
      } else {
        setError(response.error || `Failed to ${isEdit ? 'update' : 'create'} worker`);
      }
    } catch (err) {
      console.error('Error saving worker:', err);
      setError(err instanceof Error ? err.message : `Failed to ${isEdit ? 'update' : 'create'} worker`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>{isEdit ? 'Edit Worker' : 'Add New Worker'}</CardTitle>
            <CardDescription>
              {isEdit ? 'Update worker information' : 'Create a new worker account'}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
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
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex">
                  <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
                  <div className="ml-2">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter worker name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Password {isEdit ? '(leave blank to keep current)' : '*'}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder={isEdit ? 'Enter new password' : 'Enter password'}
                  required={!isEdit}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => handleInputChange('role', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent 
                  className="bg-white border border-gray-200 shadow-lg z-50 rounded-md"
                  style={{ backgroundColor: 'white' }}
                >
                  <SelectItem 
                    value="WORKER" 
                    className="bg-white hover:bg-gray-50 focus:bg-gray-50 cursor-pointer"
                    style={{ backgroundColor: 'white' }}
                  >
                    Worker
                  </SelectItem>
                  <SelectItem 
                    value="MANAGER" 
                    className="bg-white hover:bg-gray-50 focus:bg-gray-50 cursor-pointer"
                    style={{ backgroundColor: 'white' }}
                  >
                    Manager
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Label htmlFor="isActive" className="text-sm font-medium">
                  Active Account
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="twoFactorEnabled"
                  checked={formData.twoFactorEnabled}
                  onChange={(e) => handleInputChange('twoFactorEnabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Label htmlFor="twoFactorEnabled" className="text-sm font-medium">
                  Enable Two-Factor Authentication
                </Label>
              </div>
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
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {isEdit ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    {isEdit ? 'Update Worker' : 'Create Worker'}
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