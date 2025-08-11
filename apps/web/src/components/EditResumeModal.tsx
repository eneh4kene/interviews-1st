"use client";

import { useState, useEffect } from "react";
import { Button } from "@interview-me/ui";
import { Input } from "@interview-me/ui";
import { Label } from "@interview-me/ui";
import { X, Save } from "lucide-react";
import { Resume } from "@interview-me/types";
import { apiService } from "../lib/api";

interface EditResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedResume: Resume) => void;
  resume: Resume | null;
}

export default function EditResumeModal({ isOpen, onClose, onSuccess, resume }: EditResumeModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    isDefault: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form data when resume changes
  useEffect(() => {
    if (resume) {
      setFormData({
        name: resume.name || "",
        isDefault: resume.isDefault || false
      });
    }
  }, [resume]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resume) return;

    setLoading(true);
    setError(null);

    try {
      // Call the real API
      const response = await apiService.updateResume(resume.id, {
        name: formData.name.trim(),
        isDefault: formData.isDefault,
      });

      if (!response.success) {
        throw new Error(response.error);
      }
      
      const updatedResume: Resume = {
        ...resume,
        name: formData.name.trim(),
        isDefault: formData.isDefault,
        updatedAt: new Date(),
      };

      onSuccess(updatedResume);
      onClose();
    } catch (err) {
      console.error('Failed to update resume:', err);
      setError(err instanceof Error ? err.message : 'Failed to update resume');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !resume) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Resume</h2>
            <p className="text-gray-600">Update resume details</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Resume Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g., Software Engineer - Tech Companies"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => handleInputChange("isDefault", e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="isDefault" className="text-sm font-medium text-gray-700">
                Set as default resume
              </Label>
            </div>

            <div className="bg-gray-50 rounded-md p-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Uploaded: {resume.createdAt.toLocaleDateString()}</span>
              </div>
              {resume.isDefault && (
                <div className="flex items-center gap-2 text-sm text-blue-600 mt-1">
                  <span>Currently set as default</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
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
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Update Resume
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 