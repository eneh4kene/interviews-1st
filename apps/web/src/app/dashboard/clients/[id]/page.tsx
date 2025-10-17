"use client";

import { useState, useEffect } from "react";
import { Button } from "@interview-me/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@interview-me/ui";
import { Client, Resume, JobPreference, Application } from "@interview-me/types";
import { 
  ArrowLeft, 
  Download, 
  Edit, 
  Plus, 
  ExternalLink, 
  Calendar, 
  MapPin, 
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Briefcase,
  Users,
  TrendingUp,
  Mail,
  Bot
} from "lucide-react";
import { apiService } from '../../../../lib/api';
import EditClientForm from '../../../../components/EditClientForm';
import EditResumeModal from '../../../../components/EditResumeModal';
import JobPreferenceModal from '../../../../components/JobPreferenceModal';
import ViewApplicationsModal from '../../../../components/ViewApplicationsModal';
import ApplicationModal from '../../../../components/ApplicationModal';
import JobDiscoveryTab from '../../../../components/JobDiscoveryTab';
import AiApplicationsTab from '../../../../components/AiApplicationsTab';
import UnifiedApplicationsTab from '../../../../components/UnifiedApplicationsTab';
import EmailManagementTab from '../../../../components/EmailManagementTab';

export default function ClientProfile({ params }: { params: { id: string } }) {
  const [client, setClient] = useState<Client | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobPreferences, setJobPreferences] = useState<JobPreference[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'resumes' | 'preferences' | 'job-discovery' | 'applications' | 'ai-applications' | 'emails'>('overview');
  const [showEditForm, setShowEditForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showEditResumeModal, setShowEditResumeModal] = useState(false);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [showJobPreferenceModal, setShowJobPreferenceModal] = useState(false);
  const [selectedJobPreference, setSelectedJobPreference] = useState<JobPreference | null>(null);
  const [showViewApplicationsModal, setShowViewApplicationsModal] = useState(false);
  const [selectedJobPreferenceForView, setSelectedJobPreferenceForView] = useState<JobPreference | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [applicationModalMode, setApplicationModalMode] = useState<'view' | 'edit' | 'add'>('view');

  // Button click handlers
  const handleBackToDashboard = () => {
    window.location.href = '/dashboard';
  };

  const handleLinkedInClick = () => {
    if (client?.linkedinUrl) {
      window.open(client.linkedinUrl, '_blank');
    }
  };

  const handleEditProfile = () => {
    setShowEditForm(true);
  };

  const handleEditFormClose = () => {
    setShowEditForm(false);
  };

  const handleEditFormSuccess = () => {
    // Refresh the client data
    const fetchClientData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch client data
        const clientResponse = await apiService.getClient(params.id);
        if (!clientResponse.success) {
          throw new Error(clientResponse.error);
        }

        setClient(clientResponse.data);
      } catch (err) {
        console.error('Failed to fetch client data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load client data');
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
  };

  const handleUploadResume = () => {
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.doc,.docx';
    fileInput.multiple = false;
    
    fileInput.onchange = async (event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      
      if (file) {
        try {
          setIsUploading(true);
          
          // Create FormData for file upload
          const formData = new FormData();
          formData.append('file', file);
          formData.append('clientId', params.id);
          formData.append('name', file.name.replace(/\.[^/.]+$/, '')); // Remove file extension for name
          formData.append('isDefault', (resumes.length === 0).toString()); // First resume becomes default
          
          // Call the real API
          const response = await apiService.uploadResume(formData);
          
          if (!response.success) {
            throw new Error(response.error);
          }
          
          // Add new resume to the list
          setResumes(prev => [...prev, response.data]);
          
          alert(`Resume "${response.data.name}" uploaded successfully!`);
          
        } catch (error) {
          console.error('Upload failed:', error);
          alert('Failed to upload resume. Please try again.');
        } finally {
          setIsUploading(false);
        }
      }
    };
    
    fileInput.click();
  };

  const handleDownloadResume = async (resume: Resume) => {
    try {
      // Download the resume from the API
      const blob = await apiService.downloadResume(resume.id);
      
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${resume.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      setTimeout(() => URL.revokeObjectURL(link.href), 100);
      
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download resume. Please try again.');
    }
  };

  const handleEditResume = (resume: Resume) => {
    setSelectedResume(resume);
    setShowEditResumeModal(true);
  };

  const handleEditResumeModalClose = () => {
    setShowEditResumeModal(false);
    setSelectedResume(null);
  };

  const handleEditResumeSuccess = (updatedResume: Resume) => {
    setResumes(prev => prev.map(r => r.id === updatedResume.id ? updatedResume : r));
    setShowEditResumeModal(false);
    setSelectedResume(null);
  };

  const handleSetDefaultResume = async (resume: Resume) => {
    try {
      const response = await apiService.updateResume(resume.id, {
        name: resume.name,
        isDefault: true,
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      // Update the resumes list
      setResumes(prev => prev.map(r => ({
        ...r,
        isDefault: r.id === resume.id
      })));

      alert(`Resume "${resume.name}" set as default successfully!`);
    } catch (error) {
      console.error('Failed to set default resume:', error);
      alert('Failed to set default resume. Please try again.');
    }
  };

  const handleDeleteResume = async (resume: Resume) => {
    // Prevent deleting the default resume if it's the only one
    if (resume.isDefault && resumes.length === 1) {
      alert('Cannot delete the only resume. Please upload another resume first.');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${resume.name}"?`)) {
      return;
    }

    try {
      const response = await apiService.deleteResume(resume.id);

      if (!response.success) {
        throw new Error(response.error);
      }

      // Remove the resume from the list
      setResumes(prev => prev.filter(r => r.id !== resume.id));

      alert(`Resume "${resume.name}" deleted successfully!`);
    } catch (error) {
      console.error('Failed to delete resume:', error);
      alert('Failed to delete resume. Please try again.');
    }
  };

  const handleAddJobPreference = () => {
    setSelectedJobPreference(null); // null means we're adding new
    setShowJobPreferenceModal(true);
  };

  const handleEditJobPreference = (pref: JobPreference) => {
    setSelectedJobPreference(pref);
    setShowJobPreferenceModal(true);
  };

  const handleJobPreferenceModalClose = () => {
    setShowJobPreferenceModal(false);
    setSelectedJobPreference(null);
  };

  const handleJobPreferenceSuccess = (jobPreference: JobPreference) => {
    if (selectedJobPreference) {
      // Editing existing preference
      setJobPreferences(prev => prev.map(p => p.id === jobPreference.id ? jobPreference : p));
    } else {
      // Adding new preference
      setJobPreferences(prev => [...prev, jobPreference]);
    }
    setShowJobPreferenceModal(false);
    setSelectedJobPreference(null);
  };

  const handleViewApplications = (pref: JobPreference) => {
    setSelectedJobPreferenceForView(pref);
    setShowViewApplicationsModal(true);
  };

  const handleAddApplication = () => {
    setSelectedApplication(null);
    setApplicationModalMode('add');
    setShowApplicationModal(true);
  };

  const handleUpdateStatus = (app: Application) => {
    setSelectedApplication(app);
    setApplicationModalMode('edit');
    setShowApplicationModal(true);
  };

  const handleAddNotes = (app: Application) => {
    setSelectedApplication(app);
    setApplicationModalMode('edit');
    setShowApplicationModal(true);
  };

  const handleViewDetails = (app: Application) => {
    setSelectedApplication(app);
    setApplicationModalMode('view');
    setShowApplicationModal(true);
  };

  const handleApplicationModalClose = () => {
    setShowApplicationModal(false);
    setSelectedApplication(null);
    setApplicationModalMode('view');
  };

  const handleApplicationSuccess = (application: Application) => {
    if (selectedApplication) {
      // Editing existing application
      setApplications(prev => prev.map(a => a.id === application.id ? application : a));
    } else {
      // Adding new application
      setApplications(prev => [...prev, application]);
    }
    setShowApplicationModal(false);
    setSelectedApplication(null);
    setApplicationModalMode('view');
  };

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch client data
        const clientResponse = await apiService.getClient(params.id);
        if (!clientResponse.success) {
          throw new Error(clientResponse.error);
        }

        setClient(clientResponse.data);

        // Fetch resumes from API
        const resumesResponse = await apiService.getResumes(params.id);
        if (resumesResponse.success) {
          setResumes(resumesResponse.data);
        } else {
          console.error('Failed to fetch resumes:', resumesResponse.error);
        }

        // Fetch job preferences from API
        const jobPreferencesResponse = await apiService.getJobPreferences(params.id);
        if (jobPreferencesResponse.success) {
          setJobPreferences(jobPreferencesResponse.data);
        } else {
          console.error('Failed to fetch job preferences:', jobPreferencesResponse.error);
        }

        // Fetch applications from API
        const applicationsResponse = await apiService.getApplications(params.id);
        if (applicationsResponse.success) {
          setApplications(applicationsResponse.data);
        } else {
          console.error('Failed to fetch applications:', applicationsResponse.error);
        }

      } catch (err) {
        console.error('Failed to fetch client data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load client data');
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
  }, [params.id]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading client profile...</p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error Loading Client</div>
          <p className="text-gray-600 mb-4">{error || 'Client not found'}</p>
          <Button onClick={handleBackToDashboard}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={handleBackToDashboard}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
                <p className="text-gray-600">{client.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {client.linkedinUrl && (
                <Button variant="outline" onClick={handleLinkedInClick}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  LinkedIn
                </Button>
              )}
              <Button onClick={handleEditProfile}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Client Overview Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Client Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{client.totalInterviews}</div>
                <div className="text-sm text-gray-600">Total Interviews</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">£{client.totalPaid}</div>
                <div className="text-sm text-gray-600">Total Paid</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{client.status}</div>
                <div className="text-sm text-gray-600">Status</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{client.paymentStatus}</div>
                <div className="text-sm text-gray-600">Payment Status</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: Users },
                { id: 'resumes', label: 'Resumes', icon: FileText },
                { id: 'preferences', label: 'Job Preferences', icon: Briefcase },
                { id: 'job-discovery', label: 'Job Discovery', icon: TrendingUp },
                { id: 'applications', label: 'All Applications', icon: CheckCircle },
                { id: 'ai-applications', label: 'AI Applications', icon: Bot },
                { id: 'emails', label: 'Emails', icon: Mail },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center">
                        <span className="text-gray-600 w-24">Email:</span>
                        <span className="font-medium">{client.email}</span>
                      </div>
                      {client.phone && (
                        <div className="flex items-center">
                          <span className="text-gray-600 w-24">Phone:</span>
                          <span className="font-medium">{client.phone}</span>
                        </div>
                      )}
                      {client.linkedinUrl && (
                        <div className="flex items-center">
                          <span className="text-gray-600 w-24">LinkedIn:</span>
                          <a
                            href={client.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View Profile
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Account Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center">
                        <span className="text-gray-600 w-24">Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
                          {client.status}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-600 w-24">Payment:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          client.paymentStatus === 'paid' ? 'text-green-600 bg-green-50' : 
                          client.paymentStatus === 'pending' ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50'
                        }`}>
                          {client.paymentStatus}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-600 w-24">Assigned:</span>
                        <span className="font-medium">{new Date(client.assignedAt).toLocaleDateString()}</span>
                      </div>
                      {client.isNew && (
                        <div className="flex items-center">
                          <span className="text-gray-600 w-24">New Client:</span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                            🆕 Within 72 hours
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm">Client profile created</span>
                        </div>
                        <span className="text-sm text-gray-500">{new Date(client.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm">Assigned to worker</span>
                        </div>
                        <span className="text-sm text-gray-500">{new Date(client.assignedAt).toLocaleDateString()}</span>
                      </div>
                      {client.totalInterviews > 0 && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span className="text-sm">{client.totalInterviews} interview(s) scheduled</span>
                          </div>
                          <span className="text-sm text-gray-500">Recently</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Resumes Tab */}
            {activeTab === 'resumes' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Resumes & CVs</h3>
                  <Button onClick={handleUploadResume} disabled={isUploading}>
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Upload Resume
                      </>
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {resumes.map((resume) => (
                    <Card key={resume.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{resume.name}</CardTitle>
                          {resume.isDefault && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              Default
                            </span>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Uploaded:</span>
                            <span>{new Date(resume.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => handleDownloadResume(resume)}>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEditResume(resume)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            {!resume.isDefault && (
                              <Button size="sm" variant="outline" onClick={() => handleSetDefaultResume(resume)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Set Default
                              </Button>
                            )}
                            {!resume.isDefault && (
                              <Button size="sm" variant="outline" onClick={() => handleDeleteResume(resume)}>
                                <XCircle className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {resumes.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">📄</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No resumes uploaded</h3>
                    <p className="text-gray-600 mb-4">Upload a resume to get started with job applications</p>
                    <Button onClick={handleUploadResume}>
                      <Plus className="h-4 w-4 mr-2" />
                      Upload First Resume
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Job Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Job Preferences</h3>
                  <Button onClick={handleAddJobPreference}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Preference
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {jobPreferences.map((pref) => (
                    <Card key={pref.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{pref.title}</CardTitle>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            pref.status === 'active' ? 'bg-green-100 text-green-700' :
                            pref.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {pref.status}
                          </span>
                        </div>
                        {pref.company && (
                          <CardDescription>{pref.company}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span>{pref.location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Briefcase className="h-4 w-4 text-gray-400" />
                            <span className="capitalize">{pref.workType}</span>
                          </div>
                          {pref.visaSponsorship && (
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span>Visa sponsorship required</span>
                            </div>
                          )}
                          {pref.salaryRange && pref.salaryRange.min && pref.salaryRange.max && (
                            <div className="flex items-center gap-2 text-sm">
                              <DollarSign className="h-4 w-4 text-gray-400" />
                              <span>£{pref.salaryRange.min.toLocaleString()} - £{pref.salaryRange.max.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex gap-2 pt-2">
                            <Button size="sm" variant="outline" onClick={() => handleEditJobPreference(pref)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleViewApplications(pref)}>
                              <TrendingUp className="h-4 w-4 mr-2" />
                              View Applications
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {jobPreferences.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">🎯</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No job preferences set</h3>
                    <p className="text-gray-600 mb-4">Add job preferences to start receiving targeted applications</p>
                    <Button onClick={handleAddJobPreference}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Preference
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Job Discovery Tab */}
            {activeTab === 'job-discovery' && (
              <JobDiscoveryTab 
                clientId={params.id}
                onJobApply={(job, applicationType) => {
                  // Optional: Handle additional post-application logic
                  console.log('Job application completed:', { job, applicationType });
                }}
              />
            )}

            {/* Unified Applications Tab */}
            {activeTab === 'applications' && (
              <UnifiedApplicationsTab 
                clientId={params.id}
              />
            )}

            {/* AI Applications Tab */}
            {activeTab === 'ai-applications' && (
              <AiApplicationsTab 
                clientId={params.id}
                onApplicationUpdate={(application) => {
                  // Optional: Handle additional post-application logic
                  console.log('AI application updated:', application);
                }}
              />
            )}

            {/* Emails Tab */}
            {activeTab === 'emails' && (
              <EmailManagementTab 
                clientId={params.id}
                clientName={client?.name || 'Unknown Client'}
              />
            )}
          </div>
        </div>
      </div>

      {/* Edit Client Form Modal */}
      <EditClientForm
        isOpen={showEditForm}
        onClose={handleEditFormClose}
        onSuccess={handleEditFormSuccess}
        client={client}
      />

      {/* Edit Resume Modal */}
      {selectedResume && (
        <EditResumeModal
          isOpen={showEditResumeModal}
          onClose={handleEditResumeModalClose}
          onSuccess={handleEditResumeSuccess}
          resume={selectedResume}
        />
      )}

      {/* Job Preference Modal */}
      {showJobPreferenceModal && (
        <JobPreferenceModal
          isOpen={showJobPreferenceModal}
          onClose={handleJobPreferenceModalClose}
          onSuccess={handleJobPreferenceSuccess}
          jobPreference={selectedJobPreference}
          clientId={params.id}
        />
      )}

      {/* View Applications Modal */}
      {showViewApplicationsModal && selectedJobPreferenceForView && (
        <ViewApplicationsModal
          isOpen={showViewApplicationsModal}
          onClose={() => setShowViewApplicationsModal(false)}
          jobPreference={selectedJobPreferenceForView}
          applications={applications}
        />
      )}

      {/* Application Modal */}
      {showApplicationModal && (
        <ApplicationModal
          isOpen={showApplicationModal}
          onClose={handleApplicationModalClose}
          onSuccess={handleApplicationSuccess}
          application={selectedApplication}
          resumes={resumes}
          jobPreferences={jobPreferences}
          mode={applicationModalMode}
          clientId={params.id}
        />
      )}
    </div>
  );
} 