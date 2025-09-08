'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Briefcase, DollarSign, Calendar, Building, Filter, X, ArrowLeft } from 'lucide-react';
import { Button } from '@interview-me/ui';
import { Input } from '@interview-me/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@interview-me/ui';
import { Badge } from '@interview-me/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@interview-me/ui';
import { Job, JobType, WorkLocation } from '@interview-me/types';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';

interface JobSearchFilters {
  keywords: string;
  location: string;
  jobType: string;
  workLocation: string;
  salaryMin: string;
  salaryMax: string;
  source: 'all' | 'live' | 'stored';
}

interface JobSearchResponse {
  success: boolean;
  data: {
    jobs: Job[];
    totalCount: number;
    page: number;
    totalPages: number;
    aggregatorResults: Record<string, any>;
  };
  message: string;
}

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<JobSearchFilters>({
    keywords: '',
    location: '',
    jobType: '',
    workLocation: '',
    salaryMin: '',
    salaryMax: '',
    source: 'all'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const searchJobs = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(filters.keywords && { keywords: filters.keywords }),
        ...(filters.location && { location: filters.location }),
        ...(filters.jobType && { jobType: filters.jobType }),
        ...(filters.workLocation && { workLocation: filters.workLocation }),
        ...(filters.salaryMin && { salaryMin: filters.salaryMin }),
        ...(filters.salaryMax && { salaryMax: filters.salaryMax }),
        ...(filters.source !== 'all' && { source: filters.source })
      });

      const response = await fetch(`/api/jobs/search?${params}`);
      const data: JobSearchResponse = await response.json();

      if (data.success) {
        setJobs(data.data.jobs);
        setTotalPages(data.data.totalPages);
        setTotalCount(data.data.totalCount);
        setCurrentPage(page);
      } else {
        setError(data.message || 'Failed to search jobs');
      }
    } catch (error) {
      console.error('Error searching jobs:', error);
      setError('Failed to connect to the server. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchJobs();
  }, []);

  const handleSearch = () => {
    searchJobs(1);
  };

  const handlePageChange = (page: number) => {
    searchJobs(page);
  };

  const handleBackToDashboard = () => {
    setIsNavigating(true);
    router.push('/dashboard');
  };

  const clearFilters = () => {
    setFilters({
      keywords: '',
      location: '',
      jobType: '',
      workLocation: '',
      salaryMin: '',
      salaryMax: '',
      source: 'all'
    });
    searchJobs(1);
  };

  const handleFilterChange = (newFilters: Partial<JobSearchFilters>) => {
    setFilters({ ...filters, ...newFilters });
    // Auto-search when filters change (with a small delay to avoid too many requests)
    setTimeout(() => {
      searchJobs(1);
    }, 300);
  };

  const formatSalary = (min?: number, max?: number, currency = 'GBP') => {
    if (!min && !max) return 'Salary not specified';
    if (min && max) return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}`;
    if (min) return `${currency} ${min.toLocaleString()}+`;
    if (max) return `Up to ${currency} ${max.toLocaleString()}`;
    return 'Salary not specified';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const getJobTypeColor = (type: JobType) => {
    const colors = {
      'full-time': 'bg-blue-100 text-blue-800',
      'part-time': 'bg-green-100 text-green-800',
      'contract': 'bg-purple-100 text-purple-800',
      'internship': 'bg-orange-100 text-orange-800',
      'temporary': 'bg-yellow-100 text-yellow-800',
      'freelance': 'bg-pink-100 text-pink-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getWorkLocationColor = (location: WorkLocation) => {
    const colors = {
      'remote': 'bg-emerald-100 text-emerald-800',
      'onsite': 'bg-blue-100 text-blue-800',
      'hybrid': 'bg-purple-100 text-purple-800'
    };
    return colors[location] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={handleBackToDashboard}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                disabled={isNavigating}
              >
                {isNavigating ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    Loading...
                  </div>
                ) : (
                  <>
                    <ArrowLeft className="h-4 w-4" />
                    Back to Dashboard
                  </>
                )}
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Find the Right Fit for Your Client</h1>
                <p className="text-gray-600">Discover thousands of opportunities from top companies worldwide</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Search jobs, companies, or keywords..."
                    value={filters.keywords}
                    onChange={(e) => handleFilterChange({ keywords: e.target.value })}
                    className="pl-10 h-12"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Location (e.g., London, Remote)"
                    value={filters.location}
                    onChange={(e) => handleFilterChange({ location: e.target.value })}
                    className="pl-10 h-12"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
              </div>
              <Button 
                onClick={handleSearch}
                className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-lg font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Searching...
                  </div>
                ) : (
                  'Search Jobs'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filters and Results Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            {(filters.jobType || filters.workLocation || filters.salaryMin || filters.salaryMax || filters.source !== 'all') && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
          <div className="text-sm text-gray-600">
            {totalCount > 0 ? (
              <span>Showing {jobs.length} of {totalCount.toLocaleString()} jobs</span>
            ) : (
              <span>No jobs found</span>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <Card className="mb-6 shadow-md">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Job Type</label>
                  <Select value={filters.jobType || "all"} onValueChange={(value) => handleFilterChange({ jobType: value === "all" ? "" : value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All job types" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg">
                      <SelectItem value="all">All job types</SelectItem>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                      <SelectItem value="temporary">Temporary</SelectItem>
                      <SelectItem value="freelance">Freelance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Work Location</label>
                  <Select value={filters.workLocation || "all"} onValueChange={(value) => handleFilterChange({ workLocation: value === "all" ? "" : value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All locations" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg">
                      <SelectItem value="all">All locations</SelectItem>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="onsite">On-site</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Salary</label>
                  <Input
                    placeholder="£0"
                    value={filters.salaryMin}
                    onChange={(e) => handleFilterChange({ salaryMin: e.target.value })}
                    type="number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Salary</label>
                  <Input
                    placeholder="£100,000"
                    value={filters.salaryMax}
                    onChange={(e) => handleFilterChange({ salaryMax: e.target.value })}
                    type="number"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
                <Select value={filters.source} onValueChange={(value: any) => handleFilterChange({ source: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg">
                    <SelectItem value="all">All sources</SelectItem>
                    <SelectItem value="live">Live aggregators</SelectItem>
                    <SelectItem value="stored">Stored jobs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Job Listings */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <LoadingSpinner size="lg" text="Searching for jobs..." />
            </div>
          ) : error ? (
            <ErrorMessage 
              title="Search Failed"
              message={error}
              onRetry={() => searchJobs(1)}
            />
          ) : jobs.length > 0 ? (
            jobs.map((job) => (
              <Card 
                key={job.id} 
                className="hover:shadow-md transition-shadow duration-200 cursor-pointer"
                onClick={() => window.location.href = `/jobs/${job.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                            {job.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-1">
                              <Building className="h-4 w-4" />
                              <span>{job.company}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              <span>{job.location}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {job.source}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatDate(job.postedDate)}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-gray-700 mb-4 line-clamp-2">
                        {job.descriptionSnippet}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {job.jobType && (
                          <Badge className={getJobTypeColor(job.jobType)}>
                            {job.jobType.replace('-', ' ')}
                          </Badge>
                        )}
                        {job.workLocation && (
                          <Badge className={getWorkLocationColor(job.workLocation)}>
                            {job.workLocation}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span>{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Posted {formatDate(job.postedDate)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 lg:items-end">
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(job.applyUrl, '_blank');
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Apply Now
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Implement save job functionality
                        }}
                      >
                        Save Job
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs found</h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your search criteria or filters to find more opportunities.
                </p>
                <Button onClick={clearFilters} variant="outline">
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    onClick={() => handlePageChange(page)}
                    className="w-10 h-10"
                  >
                    {page}
                  </Button>
                );
              })}
              
              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 