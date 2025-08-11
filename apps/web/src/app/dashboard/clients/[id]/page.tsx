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
  TrendingUp
} from "lucide-react";
import { apiService } from '../../../../lib/api';
import EditClientForm from '../../../../components/EditClientForm';
import EditResumeModal from '../../../../components/EditResumeModal';
import JobPreferenceModal from '../../../../components/JobPreferenceModal';
import ViewApplicationsModal from '../../../../components/ViewApplicationsModal';
import ApplicationModal from '../../../../components/ApplicationModal';

export default function ClientProfile({ params }: { params: { id: string } }) {
  const [client, setClient] = useState<Client | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobPreferences, setJobPreferences] = useState<JobPreference[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'resumes' | 'preferences' | 'applications'>('overview');
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
          
          // TODO: Replace with actual API call when endpoint is available
          // const response = await apiService.uploadResume(formData);
          
          // For now, simulate upload success
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Add new resume to the list
          const newResume: Resume = {
            id: Date.now().toString(),
            clientId: params.id,
            name: file.name.replace(/\.[^/.]+$/, ''),
            fileUrl: URL.createObjectURL(file),
            isDefault: resumes.length === 0, // First resume becomes default
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          setResumes(prev => [...prev, newResume]);
          
          alert(`Resume "${newResume.name}" uploaded successfully!`);
          
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

  const handleDownloadResume = (resume: Resume) => {
    try {
      // Create a temporary link element
      const link = document.createElement('a');
      
      // For mock data, create a dummy file
      if (resume.fileUrl.startsWith('blob:')) {
        // If it's a blob URL (from upload), use it directly
        link.href = resume.fileUrl;
      } else {
        // For mock data, create a dummy PDF content
        const dummyContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Resume: ${resume.name}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
297
%%EOF`;
        
        const blob = new Blob([dummyContent], { type: 'application/pdf' });
        link.href = URL.createObjectURL(blob);
      }
      
      link.download = `${resume.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL if created
      if (!resume.fileUrl.startsWith('blob:')) {
        setTimeout(() => URL.revokeObjectURL(link.href), 100);
      }
      
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

  const handleSetDefaultResume = (resume: Resume) => {
    if (resume.isDefault) {
      alert('This resume is already set as default.');
      return;
    }
    
    // Update all resumes to set the selected one as default
    setResumes(prev => prev.map(r => ({
      ...r,
      isDefault: r.id === resume.id,
      updatedAt: r.id === resume.id ? new Date() : r.updatedAt,
    })));
    
    alert(`"${resume.name}" is now set as the default resume.`);
  };

  const handleDeleteResume = (resume: Resume) => {
    if (resume.isDefault && resumes.length > 1) {
      alert('Cannot delete the default resume. Please set another resume as default first.');
      return;
    }
    
    const confirmed = confirm(`Are you sure you want to delete "${resume.name}"? This action cannot be undone.`);
    
    if (confirmed) {
      setResumes(prev => prev.filter(r => r.id !== resume.id));
      alert(`Resume "${resume.name}" has been deleted.`);
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

        // For now, we'll use mock data for resumes, preferences, and applications
        // since these endpoints don't exist yet in the API
        // TODO: Replace with real API calls when endpoints are created
        
        // Mock resumes data
        const mockResumes: Resume[] = [
          {
            id: "1",
            clientId: params.id,
            name: "Software Engineer - Tech Companies",
            fileUrl: "/resumes/tech-software-engineer.pdf",
            isDefault: true,
            createdAt: new Date("2024-01-15"),
            updatedAt: new Date("2024-01-15"),
          },
          {
            id: "2",
            clientId: params.id,
            name: "UX Designer - Creative Agencies",
            fileUrl: "/resumes/ux-designer.pdf",
            isDefault: false,
            createdAt: new Date("2024-01-20"),
            updatedAt: new Date("2024-01-20"),
          },
        ];

        // Mock job preferences data
        const mockJobPreferences: JobPreference[] = [
          {
            id: "1",
            clientId: params.id,
            title: "Senior Software Engineer",
            company: "TechCorp Inc.",
            location: "London, UK",
            workType: "hybrid",
            visaSponsorship: false,
            salaryRange: {
              min: 60000,
              max: 80000,
              currency: "GBP",
            },
            status: "active",
            createdAt: new Date("2024-01-15"),
            updatedAt: new Date("2024-01-15"),
          },
          {
            id: "2",
            clientId: params.id,
            title: "UX Designer",
            company: "Design Studio Pro",
            location: "Remote",
            workType: "remote",
            visaSponsorship: true,
            salaryRange: {
              min: 45000,
              max: 65000,
              currency: "GBP",
            },
            status: "active",
            createdAt: new Date("2024-01-20"),
            updatedAt: new Date("2024-01-20"),
          },
        ];

        // Mock applications data
        const mockApplications: Application[] = [
          {
            id: "1",
            clientId: params.id,
            jobPreferenceId: "1",
            resumeId: "1",
            companyName: "TechCorp Inc.",
            jobTitle: "Senior Software Engineer",
            applicationDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            status: "applied",
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          },
          {
            id: "2",
            clientId: params.id,
            jobPreferenceId: "2",
            resumeId: "2",
            companyName: "Design Studio Pro",
            jobTitle: "UX Designer",
            applicationDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            status: "interviewing",
            interviewDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          },
        ];

        setResumes(mockResumes);
        setJobPreferences(mockJobPreferences);
        setApplications(mockApplications);

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
                { id: 'applications', label: 'Applications', icon: TrendingUp },
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
                        <span className="font-medium">{client.assignedAt.toLocaleDateString()}</span>
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
                        <span className="text-sm text-gray-500">{client.createdAt.toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm">Assigned to worker</span>
                        </div>
                        <span className="text-sm text-gray-500">{client.assignedAt.toLocaleDateString()}</span>
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
                            <span>{resume.createdAt.toLocaleDateString()}</span>
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
                          {pref.salaryRange && (
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

            {/* Applications Tab */}
            {activeTab === 'applications' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Job Applications</h3>
                  <Button onClick={handleAddApplication}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Application
                  </Button>
                </div>

                <div className="space-y-4">
                  {applications.map((app) => (
                    <Card key={app.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{app.jobTitle}</CardTitle>
                            <CardDescription>{app.companyName}</CardDescription>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(app.status)}`}>
                            {getStatusIcon(app.status)}
                            {app.status}
                          </span>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Application Date</p>
                            <p className="text-sm">{app.applicationDate.toLocaleDateString()}</p>
                          </div>
                          {app.interviewDate && (
                            <div>
                              <p className="text-sm font-medium text-gray-600">Interview Date</p>
                              <p className="text-sm">{app.interviewDate.toLocaleDateString()}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-600">Resume Used</p>
                            <p className="text-sm">{resumes.find(r => r.id === app.resumeId)?.name || 'Unknown'}</p>
                          </div>
                        </div>
                        {app.notes && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-600">Notes</p>
                            <p className="text-sm text-gray-900">{app.notes}</p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(app)}>Update Status</Button>
                          <Button size="sm" variant="outline" onClick={() => handleAddNotes(app)}>Add Notes</Button>
                          <Button size="sm" variant="outline" onClick={() => handleViewDetails(app)}>View Details</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {applications.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">📝</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
                    <p className="text-gray-600 mb-4">Start applying to jobs to track your progress</p>
                    <Button onClick={handleAddApplication}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Application
                    </Button>
                  </div>
                )}
              </div>
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
        />
      )}
    </div>
  );
} 