import React, { useState, useEffect } from 'react';
import { X, Send, Save, Paperclip, Eye, EyeOff } from 'lucide-react';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (emailData: EmailData) => Promise<void>;
  onSaveDraft?: (emailData: EmailData) => Promise<void>;
  initialData?: Partial<EmailData>;
  mode?: 'compose' | 'reply' | 'forward' | 'review';
  readOnly?: boolean;
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
  initialData = {},
  mode = 'compose',
  readOnly = false
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

  const [isPreview, setIsPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      await onSend(emailData);
      onClose();
    } catch (error) {
      console.error('Failed to send email:', error);
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

  const addAttachment = (file: File) => {
    const attachment: Attachment = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      url: URL.createObjectURL(file),
      size: file.size,
      type: file.type
    };
    
    setEmailData(prev => ({
      ...prev,
      attachments: [...prev.attachments, attachment]
    }));
  };

  const removeAttachment = (id: string) => {
    setEmailData(prev => ({
      ...prev,
      attachments: prev.attachments.filter(att => att.id !== id)
    }));
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">
            {mode === 'compose' && 'Compose Email'}
            {mode === 'reply' && 'Reply'}
            {mode === 'forward' && 'Forward'}
            {mode === 'review' && 'Review Application Email'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPreview(!isPreview)}
              className="p-2 hover:bg-gray-100 rounded"
              title={isPreview ? 'Edit' : 'Preview'}
            >
              {isPreview ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Email Form */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!isPreview ? (
            <>
              {/* Recipients */}
              <div className="p-4 border-b space-y-3">
                <div className="flex items-center gap-2">
                  <label className="w-16 text-sm font-medium">From:</label>
                  <input
                    type="email"
                    value={emailData.from || ''}
                    onChange={(e) => setEmailData(prev => ({ ...prev, from: e.target.value }))}
                    className="flex-1 px-3 py-2 border rounded-md"
                    placeholder="sender@interviewsfirst.com"
                    readOnly={readOnly}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="w-16 text-sm font-medium">To:</label>
                  <input
                    type="email"
                    value={emailData.to}
                    onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                    className="flex-1 px-3 py-2 border rounded-md"
                    placeholder="recipient@company.com"
                    readOnly={readOnly}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-16 text-sm font-medium">CC:</label>
                  <input
                    type="email"
                    value={emailData.cc || ''}
                    onChange={(e) => setEmailData(prev => ({ ...prev, cc: e.target.value }))}
                    className="flex-1 px-3 py-2 border rounded-md"
                    placeholder="cc@company.com"
                    readOnly={readOnly}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-16 text-sm font-medium">BCC:</label>
                  <input
                    type="email"
                    value={emailData.bcc || ''}
                    onChange={(e) => setEmailData(prev => ({ ...prev, bcc: e.target.value }))}
                    className="flex-1 px-3 py-2 border rounded-md"
                    placeholder="bcc@company.com"
                    readOnly={readOnly}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-16 text-sm font-medium">Subject:</label>
                  <input
                    type="text"
                    value={emailData.subject}
                    onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                    className="flex-1 px-3 py-2 border rounded-md"
                    placeholder="Email subject"
                    readOnly={readOnly}
                  />
                </div>
              </div>

              {/* Attachments */}
              {emailData.attachments.length > 0 && (
                <div className="p-4 border-b">
                  <div className="flex items-center gap-2 mb-2">
                    <Paperclip size={16} />
                    <span className="text-sm font-medium">Attachments</span>
                  </div>
                  <div className="space-y-2">
                    {emailData.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{attachment.name}</span>
                          <span className="text-xs text-gray-500">
                            ({formatFileSize(attachment.size)})
                          </span>
                        </div>
                        {!readOnly && (
                          <button
                            onClick={() => removeAttachment(attachment.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Body */}
              <div className="flex-1 p-4">
                <textarea
                  value={emailData.body}
                  onChange={(e) => setEmailData(prev => ({ ...prev, body: e.target.value }))}
                  className="w-full h-full resize-none border-0 outline-none"
                  placeholder="Compose your email..."
                  readOnly={readOnly}
                />
              </div>
            </>
          ) : (
            /* Preview Mode */
            <div className="flex-1 p-4 overflow-auto">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2 mb-4">
                  <div><strong>From:</strong> {emailData.from}</div>
                  <div><strong>To:</strong> {emailData.to}</div>
                  {emailData.cc && <div><strong>CC:</strong> {emailData.cc}</div>}
                  {emailData.bcc && <div><strong>BCC:</strong> {emailData.bcc}</div>}
                  <div><strong>Subject:</strong> {emailData.subject}</div>
                </div>
                
                {emailData.attachments.length > 0 && (
                  <div className="mb-4">
                    <strong>Attachments:</strong>
                    <ul className="list-disc list-inside ml-4">
                      {emailData.attachments.map((att) => (
                        <li key={att.id}>{att.name} ({formatFileSize(att.size)})</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="whitespace-pre-wrap border-t pt-4">
                  {emailData.body}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="flex items-center gap-2">
            {!readOnly && (
              <input
                type="file"
                id="attachment"
                onChange={(e) => e.target.files?.[0] && addAttachment(e.target.files[0])}
                className="hidden"
                multiple
              />
              <label
                htmlFor="attachment"
                className="flex items-center gap-2 px-3 py-2 text-sm border rounded hover:bg-gray-100 cursor-pointer"
              >
                <Paperclip size={16} />
                Attach
              </label>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            
            {onSaveDraft && !readOnly && (
              <button
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm border rounded hover:bg-gray-100 disabled:opacity-50"
              >
                <Save size={16} />
                {isSaving ? 'Saving...' : 'Save Draft'}
              </button>
            )}
            
            <button
              onClick={handleSend}
              disabled={isSending || !emailData.to || !emailData.subject}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              <Send size={16} />
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
