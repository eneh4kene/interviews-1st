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

export default function ClientProfile({ params }: { params: { id: string } }) {
  const [client, setClient] = useState<Client | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobPreferences, setJobPreferences] = useState<JobPreference[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'resumes' | 'preferences' | 'applications'>('overview');

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
    alert('Edit Profile functionality would open a modal or navigate to edit page');
  };

  const handleUploadResume = () => {
    alert('Upload Resume functionality would open file upload dialog');
  };

  const handleDownloadResume = (resume: Resume) => {
    alert(`Downloading resume: ${resume.name}`);
    // In real app, this would trigger file download
  };

  const handleEditResume = (resume: Resume) => {
    alert(`Edit resume: ${resume.name}`);
  };

  const handleAddJobPreference = () => {
    alert('Add Job Preference functionality would open a form modal');
  };

  const handleEditJobPreference = (pref: JobPreference) => {
    alert(`Edit job preference: ${pref.title}`);
  };

  const handleViewApplications = (pref: JobPreference) => {
    alert(`View applications for: ${pref.title}`);
    setActiveTab('applications');
  };

  const handleAddApplication = () => {
    alert('Add Application functionality would open a form modal');
  };

  const handleUpdateStatus = (app: Application) => {
    alert(`Update status for application: ${app.jobTitle} at ${app.companyName}`);
  };

  const handleAddNotes = (app: Application) => {
    alert(`Add notes for application: ${app.jobTitle} at ${app.companyName}`);
  };

  const handleViewDetails = (app: Application) => {
    alert(`View details for application: ${app.jobTitle} at ${app.companyName}`);
  };

  useEffect(() => {
    // Mock data for demonstration - different data for each client
    const getMockClient = (id: string): Client => {
      const clients = {
        "1": {
          id: "1",
          workerId: "worker1",
          name: "Sarah Johnson",
          email: "sarah.johnson@email.com",
          phone: "+1 (555) 123-4567",
          linkedinUrl: "https://linkedin.com/in/sarahjohnson",
          status: "active" as const,
          paymentStatus: "pending" as const,
          totalInterviews: 2,
          totalPaid: 20,
          isNew: false,
          assignedAt: new Date("2024-01-15"),
          createdAt: new Date("2024-01-15"),
          updatedAt: new Date("2024-01-15"),
        },
        "2": {
          id: "2",
          workerId: "worker1",
          name: "Michael Chen",
          email: "michael.chen@email.com",
          phone: "+1 (555) 234-5678",
          linkedinUrl: "https://linkedin.com/in/michaelchen",
          status: "active" as const,
          paymentStatus: "paid" as const,
          totalInterviews: 1,
          totalPaid: 10,
          isNew: false,
          assignedAt: new Date("2024-01-10"),
          createdAt: new Date("2024-01-10"),
          updatedAt: new Date("2024-01-10"),
        },
        "3": {
          id: "3",
          workerId: "worker1",
          name: "Emily Rodriguez",
          email: "emily.rodriguez@email.com",
          phone: "+1 (555) 345-6789",
          linkedinUrl: "https://linkedin.com/in/emilyrodriguez",
          status: "placed" as const,
          paymentStatus: "paid" as const,
          totalInterviews: 3,
          totalPaid: 30,
          isNew: false,
          assignedAt: new Date("2023-12-20"),
          createdAt: new Date("2023-12-20"),
          updatedAt: new Date("2024-01-05"),
        },
        // NEW: Recently assigned clients (within 72 hours)
        "4": {
          id: "4",
          workerId: "worker1",
          name: "Alex Thompson",
          email: "alex.thompson@email.com",
          phone: "+1 (555) 456-7890",
          linkedinUrl: "https://linkedin.com/in/alexthompson",
          status: "active" as const,
          paymentStatus: "pending" as const,
          totalInterviews: 0,
          totalPaid: 0,
          isNew: true,
          assignedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
        "5": {
          id: "5",
          workerId: "worker1",
          name: "Jessica Kim",
          email: "jessica.kim@email.com",
          phone: "+1 (555) 567-8901",
          linkedinUrl: "https://linkedin.com/in/jessicakim",
          status: "active" as const,
          paymentStatus: "pending" as const,
          totalInterviews: 0,
          totalPaid: 0,
          isNew: true,
          assignedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        },
      };
      
      return clients[id as keyof typeof clients] || clients["1"];
    };

    const mockClient: Client = getMockClient(params.id);

    const getMockResumes = (clientId: string): Resume[] => {
      const resumeTemplates = {
        "1": [
          {
            id: "1",
            clientId: clientId,
            name: "Default CV - Software Engineer",
            fileUrl: "/resumes/sarah-default.pdf",
            isDefault: true,
            createdAt: new Date("2024-01-15"),
            updatedAt: new Date("2024-01-15"),
          },
          {
            id: "2",
            clientId: clientId,
            name: "Senior Software Engineer - Tech Companies",
            fileUrl: "/resumes/sarah-senior-tech.pdf",
            isDefault: false,
            createdAt: new Date("2024-01-20"),
            updatedAt: new Date("2024-01-20"),
          },
          {
            id: "3",
            clientId: clientId,
            name: "Full Stack Developer - Startups",
            fileUrl: "/resumes/sarah-fullstack-startup.pdf",
            isDefault: false,
            createdAt: new Date("2024-01-25"),
            updatedAt: new Date("2024-01-25"),
          },
        ],
        "2": [
          {
            id: "1",
            clientId: clientId,
            name: "Default CV - Data Scientist",
            fileUrl: "/resumes/michael-default.pdf",
            isDefault: true,
            createdAt: new Date("2024-01-10"),
            updatedAt: new Date("2024-01-10"),
          },
          {
            id: "2",
            clientId: clientId,
            name: "Machine Learning Engineer - AI Companies",
            fileUrl: "/resumes/michael-ml-engineer.pdf",
            isDefault: false,
            createdAt: new Date("2024-01-18"),
            updatedAt: new Date("2024-01-18"),
          },
        ],
        "3": [
          {
            id: "1",
            clientId: clientId,
            name: "Default CV - Product Manager",
            fileUrl: "/resumes/emily-default.pdf",
            isDefault: true,
            createdAt: new Date("2023-12-20"),
            updatedAt: new Date("2023-12-20"),
          },
          {
            id: "2",
            clientId: clientId,
            name: "Senior Product Manager - FinTech",
            fileUrl: "/resumes/emily-senior-pm.pdf",
            isDefault: false,
            createdAt: new Date("2023-12-28"),
            updatedAt: new Date("2023-12-28"),
          },
          {
            id: "3",
            clientId: clientId,
            name: "Product Manager - SaaS Companies",
            fileUrl: "/resumes/emily-pm-saas.pdf",
            isDefault: false,
            createdAt: new Date("2024-01-02"),
            updatedAt: new Date("2024-01-02"),
          },
        ],
        "4": [
          {
            id: "1",
            clientId: clientId,
            name: "Default CV - Marketing Specialist",
            fileUrl: "/resumes/alex-default.pdf",
            isDefault: true,
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
          {
            id: "2",
            clientId: clientId,
            name: "Digital Marketing Manager - Tech Companies",
            fileUrl: "/resumes/alex-digital-marketing.pdf",
            isDefault: false,
            createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
          },
        ],
        "5": [
          {
            id: "1",
            clientId: clientId,
            name: "Default CV - UX Designer",
            fileUrl: "/resumes/jessica-default.pdf",
            isDefault: true,
            createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
          },
          {
            id: "2",
            clientId: clientId,
            name: "Senior UX Designer - E-commerce",
            fileUrl: "/resumes/jessica-ux-ecommerce.pdf",
            isDefault: false,
            createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
          },
          {
            id: "3",
            clientId: clientId,
            name: "Product Designer - Mobile Apps",
            fileUrl: "/resumes/jessica-product-designer.pdf",
            isDefault: false,
            createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
          },
        ],
      };
      
      return resumeTemplates[clientId as keyof typeof resumeTemplates] || resumeTemplates["1"];
    };

    const mockResumes: Resume[] = getMockResumes(params.id);

    const getMockJobPreferences = (clientId: string): JobPreference[] => {
      const preferenceTemplates = {
        "1": [
          {
            id: "1",
            clientId: clientId,
            title: "Senior Software Engineer",
            location: "San Francisco, CA",
            workType: "hybrid" as const,
            visaSponsorship: true,
            salaryRange: { min: 120000, max: 180000, currency: "USD" },
            status: "active" as const,
            createdAt: new Date("2024-01-15"),
            updatedAt: new Date("2024-01-15"),
          },
          {
            id: "2",
            clientId: clientId,
            title: "Full Stack Developer",
            location: "Remote",
            workType: "remote" as const,
            visaSponsorship: false,
            salaryRange: { min: 90000, max: 140000, currency: "USD" },
            status: "active" as const,
            createdAt: new Date("2024-01-20"),
            updatedAt: new Date("2024-01-20"),
          },
        ],
        "2": [
          {
            id: "1",
            clientId: clientId,
            title: "Data Scientist",
            location: "New York, NY",
            workType: "hybrid" as const,
            visaSponsorship: true,
            salaryRange: { min: 100000, max: 160000, currency: "USD" },
            status: "active" as const,
            createdAt: new Date("2024-01-10"),
            updatedAt: new Date("2024-01-10"),
          },
          {
            id: "2",
            clientId: clientId,
            title: "Machine Learning Engineer",
            location: "Remote",
            workType: "remote" as const,
            visaSponsorship: false,
            salaryRange: { min: 110000, max: 170000, currency: "USD" },
            status: "active" as const,
            createdAt: new Date("2024-01-18"),
            updatedAt: new Date("2024-01-18"),
          },
        ],
        "3": [
          {
            id: "1",
            clientId: clientId,
            title: "Senior Product Manager",
            location: "San Francisco, CA",
            workType: "hybrid" as const,
            visaSponsorship: true,
            salaryRange: { min: 130000, max: 200000, currency: "USD" },
            status: "active" as const,
            createdAt: new Date("2023-12-20"),
            updatedAt: new Date("2023-12-20"),
          },
          {
            id: "2",
            clientId: clientId,
            title: "Product Manager - FinTech",
            location: "Remote",
            workType: "remote" as const,
            visaSponsorship: false,
            salaryRange: { min: 120000, max: 180000, currency: "USD" },
            status: "active" as const,
            createdAt: new Date("2023-12-28"),
            updatedAt: new Date("2023-12-28"),
          },
        ],
        "4": [
          {
            id: "1",
            clientId: clientId,
            title: "Marketing Specialist",
            location: "Los Angeles, CA",
            workType: "hybrid" as const,
            visaSponsorship: true,
            salaryRange: { min: 60000, max: 90000, currency: "USD" },
            status: "active" as const,
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
          {
            id: "2",
            clientId: clientId,
            title: "Digital Marketing Manager",
            location: "Remote",
            workType: "remote" as const,
            visaSponsorship: false,
            salaryRange: { min: 70000, max: 110000, currency: "USD" },
            status: "active" as const,
            createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
          },
        ],
        "5": [
          {
            id: "1",
            clientId: clientId,
            title: "UX Designer",
            location: "Seattle, WA",
            workType: "hybrid" as const,
            visaSponsorship: true,
            salaryRange: { min: 80000, max: 120000, currency: "USD" },
            status: "active" as const,
            createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
          },
          {
            id: "2",
            clientId: clientId,
            title: "Senior UX Designer",
            location: "Remote",
            workType: "remote" as const,
            visaSponsorship: false,
            salaryRange: { min: 90000, max: 140000, currency: "USD" },
            status: "active" as const,
            createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
          },
        ],
      };
      
      return preferenceTemplates[clientId as keyof typeof preferenceTemplates] || preferenceTemplates["1"];
    };

    const mockJobPreferences: JobPreference[] = getMockJobPreferences(params.id);

    const getMockApplications = (clientId: string): Application[] => {
      const applicationTemplates = {
        "1": [
          {
            id: "1",
            clientId: clientId,
            jobPreferenceId: "1",
            resumeId: "2",
            companyName: "TechCorp Inc.",
            jobTitle: "Senior Software Engineer",
            applicationDate: new Date("2024-01-22"),
            status: "interviewing" as const,
            interviewDate: new Date("2024-02-01"),
            notes: "First round interview scheduled",
            createdAt: new Date("2024-01-22"),
            updatedAt: new Date("2024-01-22"),
          },
          {
            id: "2",
            clientId: clientId,
            jobPreferenceId: "2",
            resumeId: "3",
            companyName: "StartupXYZ",
            jobTitle: "Full Stack Developer",
            applicationDate: new Date("2024-01-25"),
            status: "applied" as const,
            createdAt: new Date("2024-01-25"),
            updatedAt: new Date("2024-01-25"),
          },
        ],
        "2": [
          {
            id: "1",
            clientId: clientId,
            jobPreferenceId: "1",
            resumeId: "2",
            companyName: "DataAI Solutions",
            jobTitle: "Data Scientist",
            applicationDate: new Date("2024-01-20"),
            status: "offered" as const,
            interviewDate: new Date("2024-01-30"),
            notes: "Offer received - £85k base + equity",
            createdAt: new Date("2024-01-20"),
            updatedAt: new Date("2024-01-28"),
          },
        ],
        "3": [
          {
            id: "1",
            clientId: clientId,
            jobPreferenceId: "1",
            resumeId: "2",
            companyName: "FinTech Pro",
            jobTitle: "Senior Product Manager",
            applicationDate: new Date("2024-01-15"),
            status: "accepted" as const,
            interviewDate: new Date("2024-01-25"),
            notes: "Position accepted - starting March 1st",
            createdAt: new Date("2024-01-15"),
            updatedAt: new Date("2024-01-26"),
          },
          {
            id: "2",
            clientId: clientId,
            jobPreferenceId: "2",
            resumeId: "3",
            companyName: "SaaS Startup",
            jobTitle: "Product Manager - FinTech",
            applicationDate: new Date("2024-01-18"),
            status: "rejected" as const,
            notes: "Position filled internally",
            createdAt: new Date("2024-01-18"),
            updatedAt: new Date("2024-01-22"),
          },
        ],
        "4": [
          {
            id: "1",
            clientId: clientId,
            jobPreferenceId: "1",
            resumeId: "2",
            companyName: "Marketing Solutions Inc.",
            jobTitle: "Marketing Specialist",
            applicationDate: new Date(Date.now() - 22 * 60 * 60 * 1000),
            status: "applied" as const,
            createdAt: new Date(Date.now() - 22 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 22 * 60 * 60 * 1000),
          },
        ],
        "5": [
          {
            id: "1",
            clientId: clientId,
            jobPreferenceId: "1",
            resumeId: "2",
            companyName: "Design Studio Pro",
            jobTitle: "UX Designer",
            applicationDate: new Date(Date.now() - 10 * 60 * 60 * 1000),
            status: "applied" as const,
            createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
          },
        ],
      };
      
      return applicationTemplates[clientId as keyof typeof applicationTemplates] || applicationTemplates["1"];
    };

    const mockApplications: Application[] = getMockApplications(params.id);

    setClient(mockClient);
    setResumes(mockResumes);
    setJobPreferences(mockJobPreferences);
    setApplications(mockApplications);
    setLoading(false);
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

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Client not found</h3>
          <Button onClick={() => window.history.back()}>Go Back</Button>
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
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.history.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
                <p className="text-gray-600">{client.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {client.linkedinUrl && (
                <Button variant="outline" className="flex items-center gap-2" onClick={handleLinkedInClick}>
                  <ExternalLink className="h-4 w-4" />
                  LinkedIn
                </Button>
              )}
              <Button className="flex items-center gap-2" onClick={handleEditProfile}>
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Client Info Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xl">
                  {client.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <CardTitle className="text-xl">{client.name}</CardTitle>
                  <CardDescription>
                    Client since {client.createdAt.toLocaleDateString()}
                  </CardDescription>
                </div>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  client.status === 'active' ? 'text-green-600 bg-green-50' : 
                  client.status === 'placed' ? 'text-blue-600 bg-blue-50' : 
                  'text-gray-600 bg-gray-50'
                }`}>
                  {client.status}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>{client.email}</p>
                  {client.phone && <p>{client.phone}</p>}
                  {client.linkedinUrl && (
                    <a href={client.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                      LinkedIn Profile
                    </a>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Quick Stats</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>Resumes: {resumes.length}</p>
                  <p>Job Preferences: {jobPreferences.length}</p>
                  <p>Applications: {applications.length}</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Recent Activity</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>Last application: {applications[0]?.applicationDate.toLocaleDateString() || 'None'}</p>
                  <p>Next interview: {applications.find(a => a.status === 'interviewing')?.interviewDate?.toLocaleDateString() || 'None'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: <Users className="h-4 w-4" /> },
                { id: 'resumes', label: 'Resumes', icon: <FileText className="h-4 w-4" /> },
                { id: 'preferences', label: 'Job Preferences', icon: <Briefcase className="h-4 w-4" /> },
                { id: 'applications', label: 'Applications', icon: <TrendingUp className="h-4 w-4" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Applications */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Applications</h3>
                  <div className="space-y-3">
                    {applications.slice(0, 3).map((app) => (
                      <div key={app.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{app.companyName}</p>
                          <p className="text-sm text-gray-600">{app.jobTitle}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                          {app.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Job Preferences Summary */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Job Preferences</h3>
                  <div className="space-y-3">
                    {jobPreferences.slice(0, 3).map((pref) => (
                      <div key={pref.id} className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium text-gray-900">{pref.title}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {pref.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {pref.salaryRange ? `${pref.salaryRange.min}k-${pref.salaryRange.max}k` : 'Not specified'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'resumes' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Resumes & CVs</h3>
                  <Button className="flex items-center gap-2" onClick={handleUploadResume}>
                    <Plus className="h-4 w-4" />
                    Upload New Resume
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {resumes.map((resume) => (
                    <Card key={resume.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{resume.name}</CardTitle>
                            <CardDescription>
                              {resume.isDefault ? 'Default CV' : 'Custom Resume'}
                            </CardDescription>
                          </div>
                          {resume.isDefault && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            {resume.createdAt.toLocaleDateString()}
                          </span>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleDownloadResume(resume)}>
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEditResume(resume)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Job Preferences</h3>
                  <Button className="flex items-center gap-2" onClick={handleAddJobPreference}>
                    <Plus className="h-4 w-4" />
                    Add Job Preference
                  </Button>
                </div>
                <div className="space-y-4">
                  {jobPreferences.map((pref) => (
                    <Card key={pref.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{pref.title}</CardTitle>
                            <CardDescription>
                              {pref.company && `at ${pref.company}`}
                            </CardDescription>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            pref.status === 'active' ? 'text-green-600 bg-green-50' : 
                            pref.status === 'paused' ? 'text-yellow-600 bg-yellow-50' : 
                            'text-blue-600 bg-blue-50'
                          }`}>
                            {pref.status}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{pref.location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-gray-400" />
                            <span className="text-sm capitalize">{pref.workType}</span>
                          </div>
                          {pref.salaryRange && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">
                                {pref.salaryRange.min}k-{pref.salaryRange.max}k {pref.salaryRange.currency}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              Visa Sponsorship: {pref.visaSponsorship ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline" onClick={() => handleEditJobPreference(pref)}>Edit</Button>
                          <Button size="sm" variant="outline" onClick={() => handleViewApplications(pref)}>View Applications</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'applications' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Job Applications</h3>
                  <Button className="flex items-center gap-2" onClick={handleAddApplication}>
                    <Plus className="h-4 w-4" />
                    Add Application
                  </Button>
                </div>
                <div className="space-y-4">
                  {applications.map((app) => (
                    <Card key={app.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{app.jobTitle}</CardTitle>
                            <CardDescription>{app.companyName}</CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(app.status)}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                              {app.status}
                            </span>
                          </div>
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 