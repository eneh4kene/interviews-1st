'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@interview-me/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@interview-me/ui';
import { Input } from '@interview-me/ui';
import { Label } from '@interview-me/ui';
import { User, Mail, Phone, MapPin, Linkedin, Building, Briefcase, CheckCircle, ArrowLeft, Plus, X, Target, Upload, FileText } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@interview-me/ui';
import Logo from '../../../components/Logo';
import Link from 'next/link';

interface JobPreference {
  title: string;
  company: string;
  location: string;
  workType: 'remote' | 'hybrid' | 'onsite';
  visaSponsorship: boolean;
  salaryMin?: number;
  salaryMax?: number;
  currency: string;
}

interface ClientRegistrationData {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  company: string;
  position: string;
  jobPreferences: JobPreference[];
  resumeFile: File | null;
}

export default function ClientSignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<ClientRegistrationData>({
    name: '',
    email: '',
    phone: '',
    location: '',
    linkedinUrl: '',
    company: '',
    position: '',
    jobPreferences: [],
    resumeFile: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (field: keyof ClientRegistrationData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addJobPreference = () => {
    if (formData.jobPreferences.length < 5) {
      const newPreference: JobPreference = {
        title: '',
        company: '',
        location: '',
        workType: 'hybrid',
        visaSponsorship: false,
        salaryMin: undefined,
        salaryMax: undefined,
        currency: 'GBP'
      };
      setFormData(prev => ({
        ...prev,
        jobPreferences: [...prev.jobPreferences, newPreference]
      }));
    }
  };

  const removeJobPreference = (index: number) => {
    setFormData(prev => ({
      ...prev,
      jobPreferences: prev.jobPreferences.filter((_, i) => i !== index)
    }));
  };

  const updateJobPreference = (index: number, field: keyof JobPreference, value: any) => {
    setFormData(prev => ({
      ...prev,
      jobPreferences: prev.jobPreferences.map((pref, i) => 
        i === index ? { ...pref, [field]: value } : pref
      )
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({
      ...prev,
      resumeFile: file
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Create FormData for file upload
      const formDataToSend = new FormData();
      
      // Add all form fields
      formDataToSend.append('name', formData.name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('location', formData.location);
      formDataToSend.append('linkedinUrl', formData.linkedinUrl);
      formDataToSend.append('company', formData.company);
      formDataToSend.append('position', formData.position);
      
      // Add job preferences as JSON string
      formDataToSend.append('jobPreferences', JSON.stringify(formData.jobPreferences));
      
      // Add resume file if selected
      if (formData.resumeFile) {
        formDataToSend.append('resume', formData.resumeFile);
      }

      const response = await fetch('/api/auth/register-client', {
        method: 'POST',
        body: formDataToSend, // Don't set Content-Type header, let browser set it with boundary
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        // Redirect to success page or login after 3 seconds
        setTimeout(() => {
          router.push('/login/client');
        }, 3000);
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Registration Successful!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for registering! Your assigned career coach will contact you soon to get started on your job search journey.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to login page...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-block mb-6">
            <Logo size="lg" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Join InterviewsFirst</h1>
          <p className="mt-2 text-lg text-gray-600">
            Let us handle your job search while you focus on acing interviews
          </p>
        </div>

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Create Your Account</CardTitle>
            <CardDescription className="text-center">
              Fill in your details to get started with your personalized job search
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Enter your phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder="e.g., London, UK"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="linkedinUrl">LinkedIn Profile</Label>
                  <Input
                    id="linkedinUrl"
                    type="url"
                    value={formData.linkedinUrl}
                    onChange={(e) => handleInputChange('linkedinUrl', e.target.value)}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>
              </div>

              {/* Professional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Briefcase className="h-5 w-5 mr-2" />
                  Professional Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company">Current Company</Label>
                    <Input
                      id="company"
                      type="text"
                      value={formData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      placeholder="Enter your current company"
                    />
                  </div>
                  <div>
                    <Label htmlFor="position">Current Position</Label>
                    <Input
                      id="position"
                      type="text"
                      value={formData.position}
                      onChange={(e) => handleInputChange('position', e.target.value)}
                      placeholder="Enter your current position"
                    />
                  </div>
                </div>
              </div>

              {/* Resume Upload Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Resume Upload
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="resume">Resume (PDF, DOC, DOCX) *</Label>
                    <div className="mt-2">
                      <input
                        id="resume"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer border border-gray-300 rounded-md p-2"
                        required
                      />
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Upload your resume in PDF, DOC, or DOCX format (max 5MB)
                    </p>
                    {formData.resumeFile && (
                      <div className="mt-2 flex items-center text-sm text-green-600">
                        <FileText className="h-4 w-4 mr-2" />
                        {formData.resumeFile.name} ({(formData.resumeFile.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Job Preferences Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Job Preferences (Optional)
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addJobPreference}
                    disabled={formData.jobPreferences.length >= 5}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Preference ({formData.jobPreferences.length}/5)
                  </Button>
                </div>
                
                <p className="text-sm text-gray-600">
                  Tell us about the types of jobs you're looking for. This helps us find better matches for you.
                </p>

                {formData.jobPreferences.map((preference, index) => (
                  <Card key={index} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-900">Job Preference {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeJobPreference(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`pref-title-${index}`}>Job Title *</Label>
                          <Input
                            id={`pref-title-${index}`}
                            type="text"
                            value={preference.title}
                            onChange={(e) => updateJobPreference(index, 'title', e.target.value)}
                            placeholder="e.g., Software Engineer"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor={`pref-company-${index}`}>Preferred Company</Label>
                          <Input
                            id={`pref-company-${index}`}
                            type="text"
                            value={preference.company}
                            onChange={(e) => updateJobPreference(index, 'company', e.target.value)}
                            placeholder="e.g., Google, Microsoft"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`pref-location-${index}`}>Location *</Label>
                          <Input
                            id={`pref-location-${index}`}
                            type="text"
                            value={preference.location}
                            onChange={(e) => updateJobPreference(index, 'location', e.target.value)}
                            placeholder="e.g., London, UK"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor={`pref-worktype-${index}`}>Work Type *</Label>
                          <Select
                            value={preference.workType}
                            onValueChange={(value) => updateJobPreference(index, 'workType', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select work type" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border border-gray-200 shadow-lg">
                              <SelectItem value="remote">Remote</SelectItem>
                              <SelectItem value="hybrid">Hybrid</SelectItem>
                              <SelectItem value="onsite">On-site</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor={`pref-salary-min-${index}`}>Min Salary (£)</Label>
                          <Input
                            id={`pref-salary-min-${index}`}
                            type="number"
                            value={preference.salaryMin || ''}
                            onChange={(e) => updateJobPreference(index, 'salaryMin', e.target.value ? parseInt(e.target.value) : undefined)}
                            placeholder="e.g., 50000"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`pref-salary-max-${index}`}>Max Salary (£)</Label>
                          <Input
                            id={`pref-salary-max-${index}`}
                            type="number"
                            value={preference.salaryMax || ''}
                            onChange={(e) => updateJobPreference(index, 'salaryMax', e.target.value ? parseInt(e.target.value) : undefined)}
                            placeholder="e.g., 80000"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={preference.visaSponsorship}
                            onChange={(e) => updateJobPreference(index, 'visaSponsorship', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Requires visa sponsorship</span>
                        </label>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {formData.jobPreferences.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No job preferences added yet.</p>
                    <p className="text-sm">Click "Add Preference" to get started.</p>
                  </div>
                )}
              </div>

              {/* Terms and Conditions */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">How it works:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• We'll create a tailored resume for each job application</li>
                  <li>• Our team will apply to relevant positions on your behalf</li>
                  <li>• You only pay £10 when you accept an interview we've secured</li>
                  <li>• No monthly fees or upfront costs</li>
                </ul>
              </div>

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating Account...
                    </div>
                  ) : (
                    'Create Account'
                  )}
                </Button>
                <Link href="/login/client">
                  <Button variant="outline" className="flex-1">
                    Already have an account? Sign in
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Back to Home */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
