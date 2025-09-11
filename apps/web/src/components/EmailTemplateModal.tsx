"use client";

import { useState, useEffect } from 'react';
import { Button } from "@interview-me/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@interview-me/ui";
import { Input } from "@interview-me/ui";
import { Label } from "@interview-me/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@interview-me/ui";
// Note: Textarea and Switch are not available in @interview-me/ui, using alternatives
import { 
  X, 
  Save, 
  Eye, 
  Copy, 
  Trash2,
  Plus,
  Variable,
  Mail,
  Code,
  Palette
} from "lucide-react";
import { apiService } from '../lib/api';

interface EmailTemplate {
  id?: string;
  name: string;
  subject: string;
  html_content: string;
  text_content: string;
  category: string;
  is_active: boolean;
  is_default?: boolean;
  variables?: string[];
  created_at?: string;
  updated_at?: string;
}

interface EmailTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: EmailTemplate | null;
  onSave: (template: EmailTemplate) => void;
  onDelete?: (templateId: string) => void;
}

const TEMPLATE_CATEGORIES = [
  { value: 'welcome', label: 'Welcome', description: 'Client onboarding emails' },
  { value: 'interview', label: 'Interview', description: 'Interview scheduling and updates' },
  { value: 'notification', label: 'Notification', description: 'System notifications' },
  { value: 'marketing', label: 'Marketing', description: 'Promotional emails' },
  { value: 'application', label: 'Application', description: 'Job application emails' },
  { value: 'reminder', label: 'Reminder', description: 'Reminder emails' }
];

const AVAILABLE_VARIABLES = {
  welcome: [
    { name: 'client_name', label: 'Client Name', description: 'Full name of the client' },
    { name: 'client_email', label: 'Client Email', description: 'Email address of the client' },
    { name: 'worker_name', label: 'Worker Name', description: 'Name of assigned worker' },
    { name: 'worker_phone', label: 'Worker Phone', description: 'Phone number of assigned worker' },
    { name: 'company_name', label: 'Company Name', description: 'InterviewsFirst company name' },
    { name: 'dashboard_url', label: 'Dashboard URL', description: 'Link to client dashboard' }
  ],
  interview: [
    { name: 'client_name', label: 'Client Name', description: 'Full name of the client' },
    { name: 'interview_date', label: 'Interview Date', description: 'Scheduled interview date' },
    { name: 'interview_time', label: 'Interview Time', description: 'Scheduled interview time' },
    { name: 'interview_type', label: 'Interview Type', description: 'Type of interview (phone, video, in-person)' },
    { name: 'worker_name', label: 'Worker Name', description: 'Name of assigned worker' },
    { name: 'company_name', label: 'Company Name', description: 'InterviewsFirst company name' }
  ],
  notification: [
    { name: 'client_name', label: 'Client Name', description: 'Full name of the client' },
    { name: 'notification_type', label: 'Notification Type', description: 'Type of notification' },
    { name: 'message', label: 'Message', description: 'Notification message content' },
    { name: 'action_url', label: 'Action URL', description: 'URL for required action' },
    { name: 'company_name', label: 'Company Name', description: 'InterviewsFirst company name' }
  ],
  marketing: [
    { name: 'client_name', label: 'Client Name', description: 'Full name of the client' },
    { name: 'offer_title', label: 'Offer Title', description: 'Title of the marketing offer' },
    { name: 'offer_description', label: 'Offer Description', description: 'Description of the offer' },
    { name: 'cta_url', label: 'Call to Action URL', description: 'URL for the call to action' },
    { name: 'expiry_date', label: 'Expiry Date', description: 'Offer expiry date' },
    { name: 'company_name', label: 'Company Name', description: 'InterviewsFirst company name' }
  ],
  application: [
    { name: 'client_name', label: 'Client Name', description: 'Full name of the client' },
    { name: 'job_title', label: 'Job Title', description: 'Title of the job position' },
    { name: 'company_name', label: 'Company Name', description: 'Name of the hiring company' },
    { name: 'application_url', label: 'Application URL', description: 'URL to apply for the job' },
    { name: 'deadline', label: 'Application Deadline', description: 'Deadline for application' },
    { name: 'worker_name', label: 'Worker Name', description: 'Name of assigned worker' }
  ],
  reminder: [
    { name: 'client_name', label: 'Client Name', description: 'Full name of the client' },
    { name: 'reminder_type', label: 'Reminder Type', description: 'Type of reminder' },
    { name: 'reminder_date', label: 'Reminder Date', description: 'Date of the reminder' },
    { name: 'action_required', label: 'Action Required', description: 'Action that needs to be taken' },
    { name: 'action_url', label: 'Action URL', description: 'URL for the required action' },
    { name: 'company_name', label: 'Company Name', description: 'InterviewsFirst company name' }
  ]
};

export default function EmailTemplateModal({ 
  isOpen, 
  onClose, 
  template, 
  onSave, 
  onDelete 
}: EmailTemplateModalProps) {
  const [formData, setFormData] = useState<EmailTemplate>({
    name: '',
    subject: '',
    html_content: '',
    text_content: '',
    category: 'welcome',
    is_active: true,
    is_default: false,
    variables: []
  });
  
  const [activeTab, setActiveTab] = useState<'html' | 'text' | 'preview'>('html');
  const [previewData, setPreviewData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<{ html: number; text: number }>({ html: 0, text: 0 });

  // Initialize form data when template changes
  useEffect(() => {
    if (template) {
      setFormData({
        id: template.id,
        name: template.name,
        subject: template.subject,
        html_content: template.html_content || '',
        text_content: template.text_content || '',
        category: template.category,
        is_active: template.is_active,
        is_default: template.is_default || false,
        variables: template.variables || []
      });
      
      // Initialize preview data with sample values
      const sampleData: Record<string, string> = {};
      const categoryVars = AVAILABLE_VARIABLES[template.category as keyof typeof AVAILABLE_VARIABLES] || [];
      categoryVars.forEach(variable => {
        sampleData[variable.name] = `Sample ${variable.label}`;
      });
      setPreviewData(sampleData);
    } else {
      setFormData({
        name: '',
        subject: '',
        html_content: '',
        text_content: '',
        category: 'welcome',
        is_active: true,
        variables: []
      });
    }
  }, [template]);

  const handleInputChange = (field: keyof EmailTemplate, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTextareaClick = (field: 'html_content' | 'text_content', event: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget;
    const cursorPos = textarea.selectionStart;
    if (field === 'html_content') {
      setCursorPosition(prev => ({ ...prev, html: cursorPos }));
    } else {
      setCursorPosition(prev => ({ ...prev, text: cursorPos }));
    }
  };

  const handleTextareaKeyUp = (field: 'html_content' | 'text_content', event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget;
    const cursorPos = textarea.selectionStart;
    if (field === 'html_content') {
      setCursorPosition(prev => ({ ...prev, html: cursorPos }));
    } else {
      setCursorPosition(prev => ({ ...prev, text: cursorPos }));
    }
  };

  const handleTextareaChange = (field: 'html_content' | 'text_content', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVariableInsert = (variableName: string) => {
    const variableTag = `{{${variableName}}}`;
    if (activeTab === 'html') {
      const currentContent = formData.html_content;
      const currentPos = cursorPosition.html;
      const newContent = currentContent.slice(0, currentPos) + variableTag + currentContent.slice(currentPos);
      setFormData(prev => ({
        ...prev,
        html_content: newContent
      }));
      // Update cursor position to after the inserted variable
      setCursorPosition(prev => ({
        ...prev,
        html: currentPos + variableTag.length
      }));
    } else {
      const currentContent = formData.text_content;
      const currentPos = cursorPosition.text;
      const newContent = currentContent.slice(0, currentPos) + variableTag + currentContent.slice(currentPos);
      setFormData(prev => ({
        ...prev,
        text_content: newContent
      }));
      // Update cursor position to after the inserted variable
      setCursorPosition(prev => ({
        ...prev,
        text: currentPos + variableTag.length
      }));
    }
  };

  // Restore cursor position after variable insertion only
  useEffect(() => {
    const textarea = document.getElementById(activeTab === 'html' ? 'html_content' : 'text_content') as HTMLTextAreaElement;
    if (textarea) {
      const pos = activeTab === 'html' ? cursorPosition.html : cursorPosition.text;
      // Only restore cursor position if it's significantly different (variable insertion)
      if (Math.abs(textarea.selectionStart - pos) > 1) {
        textarea.setSelectionRange(pos, pos);
      }
    }
  }, [cursorPosition, activeTab]);

  const handleSave = async () => {
    console.log('=== MODAL SAVE CLICKED ===');
    console.log('Form data:', JSON.stringify(formData, null, 2));
    console.log('Template prop:', template);
    
    setIsLoading(true);
    try {
      await onSave(formData);
      console.log('Modal save completed successfully');
      onClose();
    } catch (error) {
      console.error('Error saving template in modal:', error);
      alert('Failed to save template: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (template?.id && onDelete) {
      setIsLoading(true);
      try {
        await onDelete(template.id);
        onClose();
      } catch (error) {
        console.error('Error deleting template:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const renderPreview = () => {
    let content = '';
    if (activeTab === 'html') {
      content = formData.html_content;
    } else {
      content = formData.text_content;
    }

    // Replace variables with preview data
    Object.entries(previewData).forEach(([key, value]) => {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    if (activeTab === 'html') {
      return (
        <div 
          className="border rounded-lg p-4 bg-white min-h-[300px]"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    } else {
      return (
        <pre className="border rounded-lg p-4 bg-white min-h-[300px] whitespace-pre-wrap font-sans">
          {content}
        </pre>
      );
    }
  };

  const currentVariables = AVAILABLE_VARIABLES[formData.category as keyof typeof AVAILABLE_VARIABLES] || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {template ? 'Edit Template' : 'Create Template'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {template ? 'Update your email template' : 'Create a new email template'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {template && onDelete && (
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Form */}
          <div className="w-1/2 p-6 overflow-y-auto border-r">
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="e.g., Welcome Email"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="subject">Email Subject</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      placeholder="e.g., Welcome to {{company_name}}!"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                      <SelectTrigger className="bg-white border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-300 shadow-lg z-50">
                        {TEMPLATE_CATEGORIES.map(category => (
                          <SelectItem key={category.value} value={category.value} className="bg-white hover:bg-gray-50">
                            <div>
                              <div className="font-medium">{category.label}</div>
                              <div className="text-sm text-gray-500">{category.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => handleInputChange('is_active', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <Label htmlFor="is_active">Active Template</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_default"
                      checked={formData.is_default}
                      onChange={(e) => handleInputChange('is_default', e.target.checked)}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <Label htmlFor="is_default">Default Template for Category</Label>
                    <span className="text-xs text-gray-500">(Only one default per category)</span>
                  </div>
                </CardContent>
              </Card>

              {/* Variables */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Variable className="h-5 w-5" />
                    Available Variables
                  </CardTitle>
                  <CardDescription>
                    Click on a variable to insert it into your template
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-2">
                    {currentVariables.map(variable => (
                      <div
                        key={variable.name}
                        className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleVariableInsert(variable.name)}
                      >
                        <div>
                          <div className="font-medium text-sm">{variable.label}</div>
                          <div className="text-xs text-gray-500">{variable.description}</div>
                        </div>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {`{{${variable.name}}}`}
                        </code>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Panel - Editor & Preview */}
          <div className="w-1/2 flex flex-col">
            {/* Tabs */}
            <div className="border-b">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('html')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === 'html'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Code className="h-4 w-4" />
                  HTML
                </button>
                <button
                  onClick={() => setActiveTab('text')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === 'text'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Mail className="h-4 w-4" />
                  Text
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === 'preview'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </button>
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {activeTab === 'html' && (
                <div>
                  <Label htmlFor="html_content">HTML Content</Label>
                  <textarea
                    id="html_content"
                    value={formData.html_content}
                    onChange={(e) => handleTextareaChange('html_content', e.target.value)}
                    onClick={(e) => handleTextareaClick('html_content', e)}
                    onKeyUp={(e) => handleTextareaKeyUp('html_content', e)}
                    placeholder="Enter your HTML email content here..."
                    className="w-full min-h-[400px] font-mono text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={15}
                  />
                </div>
              )}
              
              {activeTab === 'text' && (
                <div>
                  <Label htmlFor="text_content">Text Content</Label>
                  <textarea
                    id="text_content"
                    value={formData.text_content}
                    onChange={(e) => handleTextareaChange('text_content', e.target.value)}
                    onClick={(e) => handleTextareaClick('text_content', e)}
                    onKeyUp={(e) => handleTextareaKeyUp('text_content', e)}
                    placeholder="Enter your plain text email content here..."
                    className="w-full min-h-[400px] font-mono text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={15}
                  />
                </div>
              )}
              
              {activeTab === 'preview' && (
                <div>
                  <Label>Preview</Label>
                  {renderPreview()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-500">
            {template ? 'Last updated: ' + (template.updated_at ? new Date(template.updated_at).toLocaleString() : 'Never') : 'New template'}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onClose}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || !formData.name || !formData.subject}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isLoading ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Template</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{template?.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                variant="destructive"
                disabled={isLoading}
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
