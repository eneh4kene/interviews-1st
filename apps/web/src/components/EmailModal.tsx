import React, { useState, useEffect } from 'react';
import { X, Send, Save, Paperclip, Eye, EyeOff, MoreVertical, Reply, Forward, Archive, Trash2, Clock } from 'lucide-react';
import { processEmailContent } from '@/lib/utils/htmlSanitizer';
import { cleanQuotedText, extractMainContent } from '@/lib/utils/emailCleaner';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (emailData: EmailData) => Promise<void>;
  onSaveDraft?: (emailData: EmailData) => Promise<void>;
  onReply?: (emailData: EmailData) => void;
  onForward?: (emailData: EmailData) => void;
  initialData?: Partial<EmailData>;
  mode?: 'compose' | 'reply' | 'forward' | 'review';
  readOnly?: boolean;
  clientId?: string;
}

interface EmailData {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  attachments: Attachment[];
  from?: string;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

export default function EmailModal({
  isOpen,
  onClose,
  onSend,
  onSaveDraft,
  onReply,
  onForward,
  initialData = {},
  mode = 'compose',
  readOnly = false,
  clientId
}: EmailModalProps) {
  const [emailData, setEmailData] = useState<EmailData>({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    attachments: [],
    from: '',
    ...initialData
  });

  const [isPreview, setIsPreview] = useState(mode === 'review');
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Update preview state when mode changes
  useEffect(() => {
    setIsPreview(mode === 'review');
  }, [mode]);

  // Update emailData when initialData changes
  useEffect(() => {
    if (initialData) {
      setEmailData({
        to: initialData.to || '',
        cc: initialData.cc || '',
        bcc: initialData.bcc || '',
        subject: initialData.subject || '',
        body: initialData.body || '',
        attachments: initialData.attachments || [],
        from: initialData.from || ''
      });
    }
  }, [initialData?.to, initialData?.cc, initialData?.bcc, initialData?.subject, initialData?.body, initialData?.attachments, initialData?.from]);

  const handleSend = async () => {
    console.log('🔥 SEND BUTTON CLICKED - handleSend called');
    console.log('Email data:', emailData);
    
    // Validate required fields before sending
    if (!emailData.to || !emailData.subject || !emailData.body) {
      console.log('❌ Validation failed - missing required fields');
      alert('Please fill in all required fields (To, Subject, and Body)');
      return;
    }

    console.log('✅ Validation passed, calling onSend...');
    setIsSending(true);
    try {
      await onSend(emailData);
      console.log('✅ onSend completed successfully');
      onClose();
    } catch (error) {
      console.error('❌ onSend failed:', error);
      alert(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!onSaveDraft) return;
    
    setIsSaving(true);
    try {
      await onSaveDraft(emailData);
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addAttachment = async (file: File) => {
    try {
      // Upload file to server
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', clientId || 'temp');

      const response = await fetch('/api/emails/upload-attachment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload attachment');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      const attachment: Attachment = {
        id: result.data.id,
        name: result.data.name,
        url: result.data.url,
        size: result.data.size,
        type: result.data.type
      };
      
      setEmailData(prev => ({
        ...prev,
        attachments: [...prev.attachments, attachment]
      }));

      console.log(`✅ Attachment uploaded: ${file.name}`);
    } catch (error) {
      console.error('❌ Error uploading attachment:', error);
      alert(`Failed to upload attachment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const removeAttachment = (id: string) => {
    setEmailData(prev => ({
      ...prev,
      attachments: prev.attachments.filter(att => att.id !== id)
    }));
  };

  const downloadAttachment = (attachment: Attachment) => {
    if (attachment.url) {
      // For Vercel Blob URLs or other external URLs, open in new tab
      window.open(attachment.url, '_blank');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg sm:rounded-2xl shadow-2xl w-full max-w-5xl h-[95vh] sm:h-[90vh] flex flex-col overflow-hidden" style={{ maxHeight: '95vh' }}>
        {/* Header - Gmail Style */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm flex-shrink-0">
              {mode === 'compose' ? '✉️' : mode === 'review' ? '👁️' : '📧'}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                {mode === 'compose' ? 'New Message' : 
                 mode === 'reply' ? 'Reply' : 
                 mode === 'forward' ? 'Forward' : 
                 mode === 'review' ? 'Email Preview' : 'Email'}
              </h2>
              {mode === 'review' && (
                <p className="text-xs sm:text-sm text-gray-500">Review email content before sending</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            {mode !== 'review' && (
              <button
                onClick={() => setIsPreview(!isPreview)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                title={isPreview ? 'Edit' : 'Preview'}
              >
                {isPreview ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Email Form */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50" style={{ maxHeight: 'calc(95vh - 120px)' }}>
          {!isPreview ? (
            <>
              {/* Recipients - Gmail Style */}
              <div className="bg-white border-b border-gray-200">
                {/* From Field */}
                <div className="flex items-center px-6 py-3 border-b border-gray-100">
                  <div className="w-16 text-sm font-medium text-gray-600">From</div>
                  <div className="flex-1">
                    <input
                      type="email"
                      value={emailData.from || ''}
                      onChange={(e) => setEmailData(prev => ({ ...prev, from: e.target.value }))}
                      className="w-full px-0 py-1 text-sm border-0 outline-none bg-transparent placeholder-gray-400"
                      placeholder="sender@interviewsfirst.com"
                      readOnly={readOnly}
                    />
                  </div>
                </div>
                
                {/* To Field */}
                <div className="flex items-center px-6 py-3 border-b border-gray-100">
                  <div className="w-16 text-sm font-medium text-gray-600">To</div>
                  <div className="flex-1">
                    <input
                      type="email"
                      value={emailData.to}
                      onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                      className="w-full px-0 py-1 text-sm border-0 outline-none bg-transparent placeholder-gray-400"
                      placeholder="recipient@company.com"
                      readOnly={readOnly}
                    />
                  </div>
                </div>

                {/* CC Field - Collapsible */}
                {(emailData.cc || !readOnly) && (
                  <div className="flex items-center px-6 py-3 border-b border-gray-100">
                    <div className="w-16 text-sm font-medium text-gray-600">Cc</div>
                    <div className="flex-1">
                      <input
                        type="email"
                        value={emailData.cc || ''}
                        onChange={(e) => setEmailData(prev => ({ ...prev, cc: e.target.value }))}
                        className="w-full px-0 py-1 text-sm border-0 outline-none bg-transparent placeholder-gray-400"
                        placeholder="cc@company.com"
                        readOnly={readOnly}
                      />
                    </div>
                  </div>
                )}

                {/* BCC Field - Collapsible */}
                {(emailData.bcc || !readOnly) && (
                  <div className="flex items-center px-6 py-3 border-b border-gray-100">
                    <div className="w-16 text-sm font-medium text-gray-600">Bcc</div>
                    <div className="flex-1">
                      <input
                        type="email"
                        value={emailData.bcc || ''}
                        onChange={(e) => setEmailData(prev => ({ ...prev, bcc: e.target.value }))}
                        className="w-full px-0 py-1 text-sm border-0 outline-none bg-transparent placeholder-gray-400"
                        placeholder="bcc@company.com"
                        readOnly={readOnly}
                      />
                    </div>
                  </div>
                )}

                {/* Subject Field */}
                <div className="flex items-center px-6 py-3">
                  <div className="w-16 text-sm font-medium text-gray-600">Subject</div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={emailData.subject}
                      onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-0 py-1 text-sm border-0 outline-none bg-transparent placeholder-gray-400 font-medium"
                      placeholder="Email subject"
                      readOnly={readOnly}
                    />
                  </div>
                </div>
              </div>

              {/* Attachments */}
              {emailData.attachments.length > 0 && (
                <div className="bg-white border-b border-gray-200 px-6 py-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Paperclip size={16} className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Attachments</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {emailData.attachments.map((attachment) => (
                      <div 
                        key={attachment.id} 
                        className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-blue-100 hover:border-blue-300 transition-colors"
                        onClick={() => downloadAttachment(attachment)}
                        title="Click to download"
                      >
                        <Paperclip size={14} className="text-blue-600" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-blue-900">{attachment.name}</span>
                          <span className="text-xs text-blue-600">
                            {formatFileSize(attachment.size)}
                          </span>
                        </div>
                        {!readOnly && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAttachment(attachment.id);
                            }}
                            className="text-blue-400 hover:text-blue-600 transition-colors ml-auto"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Body - Gmail Style */}
              <div className="flex-1 bg-white overflow-auto">
                <div className="px-6 py-4">
                  <textarea
                    value={emailData.body}
                    onChange={(e) => setEmailData(prev => ({ ...prev, body: e.target.value }))}
                    className="w-full min-h-[300px] resize-none border-0 outline-none text-sm leading-relaxed placeholder-gray-400"
                    placeholder="Compose your email..."
                    readOnly={readOnly}
                    style={{ height: 'auto', minHeight: '300px' }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = Math.max(300, target.scrollHeight) + 'px';
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            /* Preview Mode - Gmail Style */
            <div className="flex-1 bg-white overflow-auto">
              {/* Email Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                      {emailData.from?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{emailData.from}</span>
                        <span className="text-sm text-gray-500">to me</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date().toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-lg font-medium text-gray-900">
                    {emailData.subject}
                  </div>
                  
                  {emailData.cc && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Cc:</span> {emailData.cc}
                    </div>
                  )}
                  
                  {emailData.bcc && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Bcc:</span> {emailData.bcc}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Attachments */}
              {emailData.attachments.length > 0 && (
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Paperclip size={16} className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Attachments</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {emailData.attachments.map((attachment) => (
                      <div 
                        key={attachment.id} 
                        className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-colors"
                        onClick={() => downloadAttachment(attachment)}
                        title="Click to download"
                      >
                        <Paperclip size={14} className="text-gray-600" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{attachment.name}</span>
                          <span className="text-xs text-gray-500">
                            {formatFileSize(attachment.size)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Email Body */}
              <div className="px-6 py-6">
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
                    {cleanQuotedText(processEmailContent(emailData.body).textContent)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Gmail Style Action Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-1">
            {!readOnly && (
              <>
                <input
                  type="file"
                  id="attachment"
                  onChange={(e) => e.target.files?.[0] && addAttachment(e.target.files[0])}
                  className="hidden"
                  multiple
                />
                <label
                  htmlFor="attachment"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                >
                  <Paperclip size={16} />
                  Attach
                </label>
              </>
            )}
            
            {/* More options for review mode */}
            {mode === 'review' && (
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Review mode actions */}
            {mode === 'review' && onReply && onForward && (
              <>
                <button
                  onClick={() => onReply(emailData)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Reply size={16} />
                  Reply
                </button>
                <button
                  onClick={() => onForward(emailData)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Forward size={16} />
                  Forward
                </button>
                <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Archive size={16} />
                  Archive
                </button>
                <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Trash2 size={16} />
                  Delete
                </button>
              </>
            )}
            
            {/* Compose mode actions */}
            {mode === 'compose' && !readOnly && (
              <>
                {onSaveDraft && (
                  <button
                    onClick={(e) => {
                      console.log('🚨 SAVE DRAFT BUTTON CLICKED - This should NOT happen when trying to send!');
                      handleSaveDraft();
                    }}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Save size={16} />
                    {isSaving ? 'Saving...' : 'Save Draft'}
                  </button>
                )}
                
                <button
                  onClick={(e) => {
                    console.log('🔥 SEND BUTTON CLICKED - onClick handler triggered');
                    console.log('Button disabled?', isSending || !emailData.to || !emailData.subject || !emailData.body);
                    console.log('Email data at click:', emailData);
                    handleSend();
                  }}
                  disabled={isSending || !emailData.to || !emailData.subject || !emailData.body}
                  className="flex items-center gap-2 px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                >
                  <Send size={16} />
                  {isSending ? 'Sending...' : 'Send'}
                </button>
              </>
            )}
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {mode === 'review' ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}