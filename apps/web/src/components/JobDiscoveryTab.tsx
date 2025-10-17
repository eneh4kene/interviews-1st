"use client";

import { useState, useEffect } from "react";
import { Button } from "@interview-me/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@interview-me/ui";
import { 
  Search, 
  Filter, 
  MapPin, 
  DollarSign,
  Clock,
  ExternalLink,
  Bot,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Star,
  Briefcase,
  Building
} from "lucide-react";
import { ClassifiedJobListing } from "@/lib/services/JobDiscoveryService";
import { apiService } from "@/lib/api";
import ResumeGenerationModal from "./ResumeGenerationModal";

interface JobDiscoveryTabProps {
  clientId: string;
  onJobApply?: (job: ClassifiedJobListing, applicationType: 'ai' | 'manual') => void;
}

interface JobStats {
  total_jobs_found: number;
  ai_applicable_jobs: number;
  manual_only_jobs: number;
  average_match_percentage: number;
}

export default function JobDiscoveryTab({ clientId, onJobApply }: JobDiscoveryTabProps) {
  const [jobs, setJobs] = useState<ClassifiedJobListing[]>([]);
  const [stats, setStats] = useState<JobStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [defaultResume, setDefaultResume] = useState<{ id: string; file_url: string; name: string } | null>(null);
  const [filters, setFilters] = useState({
    keywords: '',
    location: '',
    workType: '' as 'remote' | 'hybrid' | 'onsite' | '',
    aiFilterType: 'all' as 'all' | 'ai_only' | 'manual_only' | 'high_confidence' | 'medium_confidence' | 'low_confidence',
    page: 1,
    limit: 20
  });
  const [refreshing, setRefreshing] = useState(false);
  const [applyingJobs, setApplyingJobs] = useState<Set<string>>(new Set());
  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ClassifiedJobListing | null>(null);

  // Fetch jobs and stats
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching jobs for client:', clientId);
      console.log('🔍 Filters:', filters);

      // Fetch jobs
      const jobsResponse = await apiService.get(`/jobs/filtered/${clientId}`, {
        params: filters
      });

      console.log('🔍 Jobs response:', jobsResponse);

      if (!jobsResponse.success) {
        throw new Error(jobsResponse.error);
      }

      setJobs((jobsResponse.data as any)?.jobs || []);

      // Fetch stats
      const statsResponse = await apiService.get(`/jobs/stats/${clientId}`);
      console.log('🔍 Stats response:', statsResponse);
      if (statsResponse.success) {
        setStats(statsResponse.data as JobStats);
      }
    } catch (err) {
      console.error('❌ Failed to fetch job data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load job data');
    } finally {
      setLoading(false);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Apply filters
  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  // Search
  const handleSearch = () => {
    fetchData();
  };

  // Load default resume for this client on demand
  const loadDefaultResume = async (): Promise<{ id: string; file_url: string; name: string } | null> => {
    try {
      const res = await apiService.get('/resumes', { params: { clientId } });
      if (res.success) {
        const items = (res.data as any[]) || [];
        const chosen = items.find((r: any) => r.isDefault) || items[0];
        if (chosen) {
          const resume = { id: chosen.id, file_url: chosen.fileUrl, name: chosen.name };
          setDefaultResume(resume);
          return resume;
        }
      }
    } catch (e) {
      console.error('Failed to load default resume', e);
    }
    setDefaultResume(null);
    return null;
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilters({
      keywords: '',
      location: '',
      workType: '',
      aiFilterType: 'all',
      page: 1,
      limit: 20
    });
  };

  // Handle manual apply with resume generation modal
  const handleManualApply = async (job: ClassifiedJobListing) => {
    // Ensure we have a default resume before opening the modal
    const resumeToUse = defaultResume || (await loadDefaultResume());
    if (!resumeToUse) {
      alert('Please upload/select a resume for this client before generating a custom resume.');
      return;
    }
    
    setSelectedJob(job);
    setResumeModalOpen(true);
  };

  // Handle continue to job (after resume generation or skipping)
  const handleContinueToJob = async (job: ClassifiedJobListing) => {
    try {
      // Check if already applying
      if (applyingJobs.has(job.id)) {
        return;
      }

      setApplyingJobs(prev => new Set(prev).add(job.id));

      // Check if there's already an application record (from resume generation)
      if (job.id) {
        const duplicateCheck = await apiService.checkDuplicateApplication(clientId, job.id);
        
        if (duplicateCheck.success && duplicateCheck.data.isDuplicate) {
          // Application already exists (from resume generation), just update it
          console.log('📝 Application already exists, updating with apply URL...');
          console.log('📝 Existing application ID:', duplicateCheck.data.existingApplicationId);
          console.log('📝 Apply URL:', job.apply_url);
          
          // Update the existing application with the apply URL
          const updateResponse = await apiService.put(`/applications/${duplicateCheck.data.existingApplicationId}`, {
            jobTitle: job.title,
            companyName: job.company,
            applyUrl: job.apply_url,
            notes: `Applied via Manual application from job discovery${selectedJob ? ' (with custom resume generated)' : ''}`
          });

          console.log('📝 Update response:', updateResponse);

          if (updateResponse.success) {
            // Close modal and clear state
            setResumeModalOpen(false);
            setSelectedJob(null);
            
            // Refresh data to show updated stats
            await fetchData();
            
            // Call parent handler if provided
            if (onJobApply) {
              onJobApply(job, 'manual');
            }
            
            // Open job URL in new tab
            if (job.apply_url) {
              window.open(job.apply_url, '_blank');
            }
          } else {
            alert(`Failed to update application: ${updateResponse.error}`);
          }
          return;
        }
      }

      // No existing application, create new one
      const applicationData = {
        clientId,
        jobId: job.id,
        jobTitle: job.title,
        companyName: job.company,
        companyWebsite: job.company_website,
        applyUrl: job.apply_url,
        applicationType: 'manual' as const,
        notes: `Applied via Manual application from job discovery`
      };

      const response = await apiService.createApplication(applicationData);

      if (response.success) {
        // Close modal and clear state
        setResumeModalOpen(false);
        setSelectedJob(null);
        
        // Refresh data to show updated stats
        await fetchData();
        
        // Call parent handler if provided
        if (onJobApply) {
          onJobApply(job, 'manual');
        }
        
        // Open job URL in new tab
        if (job.apply_url) {
          window.open(job.apply_url, '_blank');
        }
      } else {
        if ((response as any).data?.isDuplicate) {
          alert(`Application already exists: ${response.error}`);
        } else {
          alert(`Failed to apply: ${response.error}`);
        }
      }
    } catch (error) {
      console.error('Error applying to job:', error);
      alert('Failed to apply to job. Please try again.');
    } finally {
      setApplyingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(job.id);
        return newSet;
      });
      // Clear modal state
      setResumeModalOpen(false);
      setSelectedJob(null);
    }
  };

  // Handle job application
  const handleJobApply = async (job: ClassifiedJobListing, applicationType: 'ai' | 'manual') => {
    try {
      // Check if already applying
      if (applyingJobs.has(job.id)) {
        return;
      }

      setApplyingJobs(prev => new Set(prev).add(job.id));

      if (applicationType === 'ai') {
        // Prevent duplicate AI applications for the same job
        if (job.id) {
          try {
            const duplicateCheck = await apiService.checkDuplicateApplication(clientId, job.id);
            if (duplicateCheck.success && (duplicateCheck.data as any).isDuplicate) {
              alert(`Application already exists: ${(duplicateCheck.data as any).message || 'This job already has an application for this client.'}`);
              return;
            }
          } catch (_) {
            // If duplicate check fails, fall through and let server validate
          }
        }
        // Ensure default resume is available
        const resumeToUse = defaultResume || (await loadDefaultResume());
        if (!resumeToUse) {
          alert('Please upload/select a resume for this client before using AI Apply.');
          return;
        }
        // Use AI Apply service for AI applications
        const response = await apiService.post('/ai-apply/submit', {
          client_id: clientId,
          job_id: job.id,
          job_title: job.title,
          company_name: job.company,
          company_website: job.company_website,
          description_snippet: job.description,
          resume: resumeToUse,
          wait_for_approval: true, // Always wait for approval for now
          worker_notes: `AI application from job discovery`
        });

        if (response.success) {
          alert(`AI application submitted for ${job.title} at ${job.company}! Check the AI Applications tab to review and approve.`);
          
          // Refresh data to show updated stats
          await fetchData();
          
          // Call parent handler if provided
          if (onJobApply) {
            onJobApply(job, applicationType);
          }
        } else {
          alert(`Failed to submit AI application: ${response.error}`);
        }
      } else {
        // Manual applications are now handled by the resume generation modal
        // This should not be called directly anymore
        console.warn('Manual application should be handled through resume generation modal');
      }
    } catch (error) {
      console.error('Error applying to job:', error);
      alert('Failed to apply to job. Please try again.');
    } finally {
      setApplyingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(job.id);
        return newSet;
      });
    }
  };

  // Load data on mount and when filters change
  useEffect(() => {
    fetchData();
  }, [clientId, filters.workType, filters.aiFilterType, filters.page]);

  // Get status color for AI applicability
  const getAiStatusColor = (isAiApplicable: boolean, confidenceScore: number) => {
    if (isAiApplicable) {
      if (confidenceScore >= 0.8) return "bg-green-100 text-green-800";
      if (confidenceScore >= 0.6) return "bg-yellow-100 text-yellow-800";
      return "bg-blue-100 text-blue-800";
    }
    return "bg-gray-100 text-gray-800";
  };

  // Get status icon for AI applicability
  const getAiStatusIcon = (isAiApplicable: boolean, confidenceScore: number) => {
    if (isAiApplicable) {
      if (confidenceScore >= 0.8) return <CheckCircle className="h-4 w-4" />;
      if (confidenceScore >= 0.6) return <AlertCircle className="h-4 w-4" />;
      return <Bot className="h-4 w-4" />;
    }
    return <User className="h-4 w-4" />;
  };

  // Format salary
  const formatSalary = (job: ClassifiedJobListing) => {
    if (job.salary) return job.salary;
    if (job.salary_min && job.salary_max) {
      return `£${job.salary_min.toLocaleString()} - £${job.salary_max.toLocaleString()}`;
    }
    if (job.salary_min) return `£${job.salary_min.toLocaleString()}+`;
    return 'Salary not specified';
  };

  // Format work location
  const formatWorkLocation = (workLocation?: string) => {
    if (!workLocation) return 'Not specified';
    return workLocation.charAt(0).toUpperCase() + workLocation.slice(1);
  };

  console.log('🔍 JobDiscoveryTab render state:', { loading, error, jobsCount: jobs.length, stats });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Job Discovery</h3>
          <Button disabled>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </Button>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Job Discovery</h3>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <XCircle className="h-12 w-12 mx-auto mb-4" />
              <p className="text-lg font-medium">Failed to load jobs</p>
              <p className="text-sm text-gray-600 mt-2">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Job Discovery</h3>
          {stats && (
            <p className="text-sm text-gray-600 mt-1">
              {stats.total_jobs_found} jobs found • {stats.ai_applicable_jobs} AI applicable • {stats.average_match_percentage}% avg match
            </p>
          )}
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search & Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Keywords
              </label>
              <input
                type="text"
                value={filters.keywords}
                onChange={(e) => handleFilterChange({ keywords: e.target.value })}
                placeholder="Job title, skills..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={filters.location}
                onChange={(e) => handleFilterChange({ location: e.target.value })}
                placeholder="City, country..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Work Type
              </label>
              <select
                value={filters.workType}
                onChange={(e) => handleFilterChange({ workType: e.target.value as 'remote' | 'hybrid' | 'onsite' | '' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Work Types</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI Filter
              </label>
              <select
                value={filters.aiFilterType}
                onChange={(e) => handleFilterChange({ aiFilterType: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Jobs</option>
                <option value="ai_only">AI Applicable Only</option>
                <option value="manual_only">Manual Only</option>
                <option value="high_confidence">High Confidence AI</option>
                <option value="medium_confidence">Medium Confidence AI</option>
                <option value="low_confidence">Low Confidence AI</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSearch} className="flex-1">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button onClick={handleClearFilters} variant="outline">
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Job Listings */}
      <div className="space-y-4">
        {jobs.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-gray-600">
                <Briefcase className="h-12 w-12 mx-auto mb-4" />
                <p className="text-lg font-medium">No jobs found</p>
                <p className="text-sm mt-2">
                  Try adjusting your search criteria or filters
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          jobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {job.title}
                      <span className="text-sm font-normal text-gray-500">
                        ({job.match_percentage}% match)
                      </span>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        {job.company}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(job.posted_date).toLocaleDateString()}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getAiStatusColor(job.is_ai_applicable, job.confidence_score)}`}>
                      {getAiStatusIcon(job.is_ai_applicable, job.confidence_score)}
                      {job.is_ai_applicable ? 'AI Applicable' : 'Manual Only'}
                    </span>
                    {job.confidence_score > 0 && (
                      <span className="text-xs text-gray-500">
                        {Math.round(job.confidence_score * 100)}% confidence
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{formatSalary(job)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{formatWorkLocation(job.work_location)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{job.source}</span>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {job.description}
                </p>

                {job.classification_reasons.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 mb-1">Classification Reasons:</p>
                    <div className="flex flex-wrap gap-1">
                      {job.classification_reasons.map((reason, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {job.is_ai_applicable && (
                    <Button 
                      onClick={() => handleJobApply(job, 'ai')}
                      disabled={applyingJobs.has(job.id)}
                      className="flex-1"
                      size="sm"
                    >
                      <Bot className="h-4 w-4 mr-2" />
                      {applyingJobs.has(job.id) ? 'Applying...' : 'AI Apply'}
                    </Button>
                  )}
                  <Button 
                    onClick={() => handleManualApply(job)}
                    disabled={applyingJobs.has(job.id)}
                    variant="outline"
                    className="flex-1"
                    size="sm"
                  >
                    <User className="h-4 w-4 mr-2" />
                    {applyingJobs.has(job.id) ? 'Applying...' : 'Manual Apply'}
                  </Button>
                  {job.apply_url && (
                    <Button 
                      onClick={() => window.open(job.apply_url, '_blank')}
                      variant="outline"
                      size="sm"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {jobs.length > 0 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            onClick={() => handleFilterChange({ page: Math.max(1, filters.page - 1) })}
            disabled={filters.page <= 1}
            variant="outline"
            size="sm"
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {filters.page}
          </span>
          <Button
            onClick={() => handleFilterChange({ page: filters.page + 1 })}
            disabled={jobs.length < filters.limit}
            variant="outline"
            size="sm"
          >
            Next
          </Button>
        </div>
      )}

      {/* Resume Generation Modal */}
      {selectedJob && (
        <ResumeGenerationModal
          isOpen={resumeModalOpen}
          onClose={() => {
            setResumeModalOpen(false);
            setSelectedJob(null);
          }}
          job={selectedJob}
          clientId={clientId}
          defaultResume={defaultResume!}
          onContinue={() => handleContinueToJob(selectedJob)}
          onResumeGenerated={(resumeUrl) => {
            console.log('Resume generated:', resumeUrl);
            // Optional: Show success message or track analytics
          }}
        />
      )}
    </div>
  );
}
