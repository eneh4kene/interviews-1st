"use client";

import { useState, useEffect } from "react";
import { Button } from "@interview-me/ui";
import { Input } from "@interview-me/ui";
import { Label } from "@interview-me/ui";
import { Select } from "@interview-me/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@interview-me/ui";
import { X, Calendar, MapPin, Building, Clock, CheckCircle, XCircle, Save, Plus, FileText, Edit } from "lucide-react";
import { Application, Resume, JobPreference } from "@interview-me/types";
import { apiService } from "../lib/api";

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedApplication: Application) => void;
  application: Application | null;
  resumes: Resume[];
  jobPreferences: JobPreference[];
  mode: 'view' | 'edit' | 'add'; // view details, edit, or add new
  clientId: string; // Add clientId for API calls
}

export default function ApplicationModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  application, 
  resumes,
  jobPreferences,
  mode,
  clientId
}: ApplicationModalProps) {
  const [formData, setFormData] = useState({
    jobTitle: "",
    companyName: "",
    jobPreferenceId: "",
    resumeId: "",
    status: "applied" as "applied" | "interviewing" | "offered" | "rejected" | "accepted",
    applicationDate: "",
    interviewDate: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  const isAddMode = mode === 'add';

  // Initialize form data when application changes
  useEffect(() => {
    if (application) {
      setFormData({
        jobTitle: application.jobTitle || "",
        companyName: application.companyName || "",
        jobPreferenceId: application.jobPreferenceId || "",
        resumeId: application.resumeId || "",
        status: application.status || "applied",
        applicationDate: application.applicationDate ? application.applicationDate.toISOString().split('T')[0] : "",
        interviewDate: application.interviewDate ? application.interviewDate.toISOString().split('T')[0] : "",
        notes: application.notes || ""
      });
    } else if (isAddMode) {
      // Reset form for new application
      setFormData({
        jobTitle: "",
        companyName: "",
        jobPreferenceId: "",
        resumeId: "",
        status: "applied",
        applicationDate: new Date().toISOString().split('T')[0],
        interviewDate: "",
        notes: ""
      });
    }
  }, [application, isAddMode]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.jobTitle.trim()) {
      setError("Job title is required");
      return;
    }

    if (!formData.companyName.trim()) {
      setError("Company name is required");
      return;
    }

    if (!formData.jobPreferenceId) {
      setError("Job preference is required");
      return;
    }

    if (!formData.resumeId) {
      setError("Resume is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const applicationData = {
        clientId,
        jobPreferenceId: formData.jobPreferenceId,
        resumeId: formData.resumeId,
        companyName: formData.companyName.trim(),
        jobTitle: formData.jobTitle.trim(),
        applicationDate: formData.applicationDate,
        status: formData.status,
        interviewDate: formData.interviewDate || undefined,
        notes: formData.notes.trim() || undefined,
      };

      let response;
      if (isEditMode && application) {
        // Update existing application
        response = await apiService.updateApplication(application.id, applicationData);
      } else {
        // Create new application
        response = await apiService.createApplication(applicationData);
      }

      if (!response.success) {
        throw new Error(response.error);
      }

      onSuccess(response.data);
      onClose();
    } catch (err) {
      console.error('Failed to save application:', err);
      setError(err instanceof Error ? err.message : 'Failed to save application');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "applied": return <Clock className="h-4 w-4 text-blue-500" />;
      case "interviewing": return <Calendar className="h-4 w-4 text-yellow-500" />;
      case "offered": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "accepted": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "rejected": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "applied": return "text-blue-600 bg-blue-50";
      case "interviewing": return "text-yellow-600 bg-yellow-50";
      case "offered": return "text-green-600 bg-green-50";
      case "accepted": return "text-green-700 bg-green-100";
      case "rejected": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isViewMode ? 'Application Details' : 
               isEditMode ? 'Edit Application' : 'Add Application'}
            </h2>
            <p className="text-gray-600">
              {isViewMode ? 'View application information' :
               isEditMode ? 'Update application details' : 'Create new application'}
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

        {isViewMode ? (
          // View Mode - Read-only display
          <div className="p-6 space-y-6">
            {application && (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{application.jobTitle}</CardTitle>
                        <CardDescription>{application.companyName}</CardDescription>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(application.status)}`}>
                        {getStatusIcon(application.status)}
                        {application.status}
                      </span>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Application Date</Label>
                          <p className="text-sm">{new Date(application.applicationDate).toLocaleDateString()}</p>
                        </div>
                        {application.interviewDate && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <p className="text-sm">{new Date(application.interviewDate).toLocaleDateString()}</p>
                          </div>
                        )}
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Resume Used</Label>
                          <p className="text-sm">{resumes.find(r => r.id === application.resumeId)?.name || 'Unknown'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Job Preference</Label>
                          <p className="text-sm">{jobPreferences.find(p => p.id === application.jobPreferenceId)?.title || 'Unknown'}</p>
                        </div>
                      </div>
                      {application.notes && (
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Notes</Label>
                          <div className="mt-2 p-3 bg-gray-50 rounded-md">
                            <p className="text-sm text-gray-900">{application.notes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={onClose}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    // Switch to edit mode
                    onClose();
                    // You could implement a callback to switch modes
                  }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Application
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          // Edit/Add Mode - Form
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
                  <Building className="h-5 w-5" />
                  Job Information
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title *</Label>
                  <Input
                    id="jobTitle"
                    value={formData.jobTitle}
                    onChange={(e) => handleInputChange("jobTitle", e.target.value)}
                    placeholder="e.g., Senior Software Engineer"
                    required
                    disabled={isViewMode}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange("companyName", e.target.value)}
                    placeholder="e.g., TechCorp Inc."
                    required
                    disabled={isViewMode}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobPreferenceId">Job Preference</Label>
                  <Select 
                    value={formData.jobPreferenceId} 
                    onChange={(e) => handleInputChange("jobPreferenceId", e.target.value)}
                    disabled={isViewMode}
                  >
                    <option value="">Select a job preference</option>
                    {jobPreferences.map((pref) => (
                      <option key={pref.id} value={pref.id}>
                        {pref.title} - {pref.company || 'No company'}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resumeId">Resume Used</Label>
                  <Select 
                    value={formData.resumeId} 
                    onChange={(e) => handleInputChange("resumeId", e.target.value)}
                    disabled={isViewMode}
                  >
                    <option value="">Select a resume</option>
                    {resumes.map((resume) => (
                      <option key={resume.id} value={resume.id}>
                        {resume.name} {resume.isDefault && '(Default)'}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Status & Dates */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Status & Dates
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Application Status</Label>
                  <Select 
                    value={formData.status} 
                    onChange={(e) => handleInputChange("status", e.target.value)}
                    disabled={isViewMode}
                  >
                    <option value="applied">Applied</option>
                    <option value="interviewing">Interviewing</option>
                    <option value="offered">Offered</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="applicationDate">Application Date *</Label>
                  <Input
                    id="applicationDate"
                    type="date"
                    value={formData.applicationDate}
                    onChange={(e) => handleInputChange("applicationDate", e.target.value)}
                    required
                    disabled={isViewMode}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interviewDate">Interview Date</Label>
                  <Input
                    id="interviewDate"
                    type="date"
                    value={formData.interviewDate}
                    onChange={(e) => handleInputChange("interviewDate", e.target.value)}
                    disabled={isViewMode}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder="Add any notes about this application..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    disabled={isViewMode}
                  />
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
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {isEditMode ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {isEditMode ? 'Update Application' : 'Add Application'}
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 