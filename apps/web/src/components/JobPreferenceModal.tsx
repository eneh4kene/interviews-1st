"use client";

import { useState, useEffect } from "react";
import { Button } from "@interview-me/ui";
import { Input } from "@interview-me/ui";
import { Label } from "@interview-me/ui";
import { Select } from "@interview-me/ui";
import { X, Briefcase, MapPin, Building, DollarSign, Save, Plus } from "lucide-react";
import { JobPreference } from "@interview-me/types";
import { apiService } from "../lib/api";

interface JobPreferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (jobPreference: JobPreference) => void;
  jobPreference?: JobPreference | null; // null for add, JobPreference for edit
  clientId: string;
}

export default function JobPreferenceModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  jobPreference, 
  clientId 
}: JobPreferenceModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    company: "",
    location: "",
    workType: "remote" as "remote" | "hybrid" | "onsite",
    visaSponsorship: false,
    salaryMin: "",
    salaryMax: "",
    currency: "GBP",
    status: "active" as "active" | "paused" | "achieved"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!jobPreference;

  // Initialize form data when jobPreference changes
  useEffect(() => {
    if (jobPreference) {
      setFormData({
        title: jobPreference.title || "",
        company: jobPreference.company || "",
        location: jobPreference.location || "",
        workType: jobPreference.workType || "remote",
        visaSponsorship: jobPreference.visaSponsorship || false,
        salaryMin: jobPreference.salaryRange?.min?.toString() || "",
        salaryMax: jobPreference.salaryRange?.max?.toString() || "",
        currency: jobPreference.salaryRange?.currency || "GBP",
        status: jobPreference.status || "active"
      });
    } else {
      // Reset form for new preference
      setFormData({
        title: "",
        company: "",
        location: "",
        workType: "remote",
        visaSponsorship: false,
        salaryMin: "",
        salaryMax: "",
        currency: "GBP",
        status: "active"
      });
    }
  }, [jobPreference]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError("Job title is required");
      return;
    }

    if (!formData.location.trim()) {
      setError("Location is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const jobPreferenceData = {
        clientId,
        title: formData.title.trim(),
        company: formData.company.trim() || undefined,
        location: formData.location.trim(),
        workType: formData.workType,
        visaSponsorship: formData.visaSponsorship,
        salaryMin: formData.salaryMin || undefined,
        salaryMax: formData.salaryMax || undefined,
        currency: formData.currency,
        status: formData.status,
      };

      let response;
      if (isEditing && jobPreference) {
        // Update existing job preference
        response = await apiService.updateJobPreference(jobPreference.id, jobPreferenceData);
      } else {
        // Create new job preference
        response = await apiService.createJobPreference(jobPreferenceData);
      }

      if (!response.success) {
        throw new Error(response.error);
      }

      onSuccess(response.data);
      onClose();
    } catch (err) {
      console.error('Failed to save job preference:', err);
      setError(err instanceof Error ? err.message : 'Failed to save job preference');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Job Preference' : 'Add Job Preference'}
            </h2>
            <p className="text-gray-600">
              {isEditing ? 'Update job preference details' : 'Add a new job preference'}
            </p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Job Details
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="e.g., Senior Software Engineer"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => handleInputChange("company", e.target.value)}
                  placeholder="e.g., TechCorp Inc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  placeholder="e.g., London, UK or Remote"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workType">Work Type</Label>
                <Select 
                  value={formData.workType} 
                  onChange={(e) => handleInputChange("workType", e.target.value)}
                >
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">On-site</option>
                </Select>
              </div>
            </div>

            {/* Requirements & Salary */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Requirements & Salary
              </h3>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="visaSponsorship"
                  checked={formData.visaSponsorship}
                  onChange={(e) => handleInputChange("visaSponsorship", e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="visaSponsorship" className="text-sm font-medium text-gray-700">
                  Visa sponsorship required
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salaryMin">Min Salary</Label>
                  <Input
                    id="salaryMin"
                    type="number"
                    value={formData.salaryMin}
                    onChange={(e) => handleInputChange("salaryMin", e.target.value)}
                    placeholder="45000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salaryMax">Max Salary</Label>
                  <Input
                    id="salaryMax"
                    type="number"
                    value={formData.salaryMax}
                    onChange={(e) => handleInputChange("salaryMax", e.target.value)}
                    placeholder="65000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select 
                  value={formData.currency} 
                  onChange={(e) => handleInputChange("currency", e.target.value)}
                >
                  <option value="GBP">GBP (£)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onChange={(e) => handleInputChange("status", e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="achieved">Achieved</option>
                </Select>
              </div>
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
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  {isEditing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {isEditing ? 'Update Preference' : 'Add Preference'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 