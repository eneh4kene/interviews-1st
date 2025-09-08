'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Building, DollarSign, Calendar, Clock, ExternalLink, Bookmark, Share2, Mail } from 'lucide-react';
import { Button } from '@interview-me/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@interview-me/ui';
import { Badge } from '@interview-me/ui';
import { Job, JobType, WorkLocation } from '@interview-me/types';
import LoadingSpinner from '../../../components/LoadingSpinner';

interface JobDetailsResponse {
  success: boolean;
  data: Job;
  message: string;
}

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        const response = await fetch(`/api/jobs/${params.id}`);
        const data: JobDetailsResponse = await response.json();

        if (data.success) {
          setJob(data.data);
        } else {
          setError(data.message || 'Failed to load job details');
        }
      } catch (error) {
        setError('Failed to load job details');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchJobDetails();
    }
  }, [params.id]);

  const formatSalary = (min?: number, max?: number, currency = 'GBP') => {
    if (!min && !max) return 'Salary not specified';
    if (min && max) return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}`;
    if (min) return `${currency} ${min.toLocaleString()}+`;
    if (max) return `Up to ${currency} ${max.toLocaleString()}`;
    return 'Salary not specified';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading job details..." />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Not Found</h2>
            <p className="text-gray-600 mb-6">{error || 'The job you are looking for could not be found.'}</p>
            <Button onClick={() => router.push('/jobs')} className="w-full">
              Back to Jobs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/jobs')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Job Header */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-3">
                      {job.title}
                    </h1>
                    <div className="flex items-center gap-4 text-gray-600 mb-4">
                      <div className="flex items-center gap-1">
                        <Building className="h-5 w-5" />
                        <span className="font-medium">{job.company}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-5 w-5" />
                        <span>{job.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="secondary" className="text-sm">
                      {job.source}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      Posted {formatDate(job.postedDate)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="flex items-center gap-2 text-gray-600">
                    <DollarSign className="h-5 w-5" />
                    <span>{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-5 w-5" />
                    <span>Posted {formatDate(job.postedDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-5 w-5" />
                    <span>Job ID: {job.externalId}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 lg:items-end">
                <Button 
                  onClick={() => window.open(job.applyUrl, '_blank')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-semibold"
                >
                  Apply Now
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Bookmark className="h-4 w-4" />
                    Save
                  </Button>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Job Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Description */}
            <Card>
              <CardHeader>
                <CardTitle>Job Description</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <p className="text-gray-700 leading-relaxed mb-4">
                    {job.descriptionSnippet}
                  </p>
                  {job.requirements && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Requirements</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-gray-700">{job.requirements}</p>
                      </div>
                    </div>
                  )}
                  {job.benefits && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Benefits</h3>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-gray-700">{job.benefits}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle>About {job.company}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                    {job.company.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{job.company}</h3>
                    <p className="text-gray-600">{job.location}</p>
                  </div>
                </div>
                <p className="text-gray-700">
                  We're looking for talented individuals to join our team. If you're passionate about what you do and want to work with a company that values innovation and growth, we'd love to hear from you.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Apply */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Apply</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => window.open(job.applyUrl, '_blank')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-semibold mb-4"
                >
                  Apply for this position
                </Button>
                <p className="text-sm text-gray-600 text-center">
                  You'll be redirected to the company's application page
                </p>
              </CardContent>
            </Card>

            {/* Job Details */}
            <Card>
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Job Type:</span>
                  <span className="font-medium">{job.jobType ? job.jobType.replace('-', ' ') : 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Work Location:</span>
                  <span className="font-medium">{job.workLocation ? job.workLocation.replace('-', ' ') : 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Salary:</span>
                  <span className="font-medium">{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Posted:</span>
                  <span className="font-medium">{formatDate(job.postedDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Source:</span>
                  <span className="font-medium capitalize">{job.source}</span>
                </div>
              </CardContent>
            </Card>

            {/* Similar Jobs */}
            <Card>
              <CardHeader>
                <CardTitle>Similar Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Looking for more opportunities like this?
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/jobs')}
                  className="w-full"
                >
                  Browse More Jobs
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 