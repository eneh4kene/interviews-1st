"use client";

import { useState, useEffect } from "react";
import { Button } from "@interview-me/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@interview-me/ui";
import { X, Calendar, MapPin, Building, Clock, CheckCircle, XCircle } from "lucide-react";
import { JobPreference, Application } from "@interview-me/types";

interface ViewApplicationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobPreference: JobPreference | null;
  applications: Application[];
}

export default function ViewApplicationsModal({ 
  isOpen, 
  onClose, 
  jobPreference, 
  applications 
}: ViewApplicationsModalProps) {
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);

  useEffect(() => {
    if (jobPreference && applications.length > 0) {
      // Filter applications for this specific job preference
      const filtered = applications.filter(app => app.jobPreferenceId === jobPreference.id);
      setFilteredApplications(filtered);
    } else {
      setFilteredApplications([]);
    }
  }, [jobPreference, applications]);

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

  if (!isOpen || !jobPreference) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Applications for {jobPreference.title}</h2>
            <p className="text-gray-600">
              {jobPreference.company && `${jobPreference.company} • `}
              {jobPreference.location}
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

        <div className="p-6">
          {filteredApplications.length > 0 ? (
            <div className="space-y-4">
              {filteredApplications.map((app) => (
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <p className="text-sm font-medium text-gray-600">Status</p>
                        <p className="text-sm capitalize">{app.status}</p>
                      </div>
                    </div>
                    {app.notes && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-600">Notes</p>
                        <p className="text-sm text-gray-900">{app.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
              <p className="text-gray-600 mb-4">
                No applications have been submitted for this job preference yet.
              </p>
              <Button onClick={onClose}>
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 