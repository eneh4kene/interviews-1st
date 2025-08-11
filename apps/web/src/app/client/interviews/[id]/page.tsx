"use client";

import { useState, useEffect } from "react";
import { Button } from "@interview-me/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@interview-me/ui";
import { Interview, Payment, Client } from "@interview-me/types";
import { 
  Calendar, 
  MapPin, 
  Building, 
  Clock, 
  CheckCircle, 
  XCircle,
  CreditCard,
  AlertCircle,
  Info
} from "lucide-react";
import { apiService } from '../../../../lib/api';

export default function ClientInterviewResponse({ params }: { params: { id: string } }) {
  const [interview, setInterview] = useState<Interview | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [response, setResponse] = useState<'accept' | 'decline' | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const fetchInterviewData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch interview data
        const interviewResponse = await apiService.getInterview(params.id);
        if (!interviewResponse.success) {
          throw new Error(interviewResponse.error);
        }

        setInterview(interviewResponse.data);

        // Fetch client data
        if (interviewResponse.data.clientId) {
          const clientResponse = await apiService.getClient(interviewResponse.data.clientId);
          if (clientResponse.success) {
            setClient(clientResponse.data);
          }
        }

      } catch (err) {
        console.error('Failed to fetch interview data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load interview data');
      } finally {
        setLoading(false);
      }
    };

    fetchInterviewData();
  }, [params.id]);

  const handleResponse = async (responseType: 'accept' | 'decline') => {
    setResponding(true);
    setResponse(responseType);
    
    try {
      const apiResponse = await apiService.respondToInterview(params.id, {
        response: responseType,
        notes: notes,
      });

      if (apiResponse.success) {
        setInterview(apiResponse.data);
        
        if (responseType === 'accept') {
          // Show payment form
          setPaymentProcessing(true);
        }
      } else {
        throw new Error(apiResponse.error);
      }
    } catch (error) {
      console.error('Error responding to interview:', error);
      alert('Failed to respond to interview. Please try again.');
    } finally {
      setResponding(false);
    }
  };

  const handlePayment = async () => {
    setPaymentProcessing(true);
    
    try {
      const apiResponse = await apiService.payForInterview(params.id, {
        paymentMethod: 'card',
        stripePaymentIntentId: 'pi_mock_123',
      });

      if (apiResponse.success) {
        setInterview(prev => prev ? { ...prev, paymentStatus: 'paid' } : null);
        alert('Payment successful! Your interview is confirmed.');
      } else {
        throw new Error(apiResponse.error);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600 bg-blue-50';
      case 'client_accepted': return 'text-green-600 bg-green-50';
      case 'client_declined': return 'text-red-600 bg-red-50';
      case 'completed': return 'text-purple-600 bg-purple-50';
      case 'cancelled': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading interview details...</p>
        </div>
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error Loading Interview</div>
          <p className="text-gray-600 mb-4">{error || 'Interview not found'}</p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Interview Invitation</h1>
          <p className="text-gray-600">Please review and respond to your interview invitation</p>
        </div>

        {/* Interview Details */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{interview.jobTitle}</CardTitle>
                <CardDescription className="text-lg">{interview.companyName}</CardDescription>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(interview.status)}`}>
                  {interview.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Interview Date</p>
                    <p className="text-sm">{interview.scheduledDate.toLocaleDateString()} at {interview.scheduledDate.toLocaleTimeString()}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Building className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Company</p>
                    <p className="text-sm">{interview.companyName}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Interview Type</p>
                    <p className="text-sm capitalize">{interview.interviewType}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    <p className="text-sm font-medium text-blue-900">Payment Required</p>
                  </div>
                  <p className="text-sm text-blue-700">
                    To confirm your interview, a payment of £{interview.paymentAmount} is required.
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Payment Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(interview.paymentStatus)}`}>
                    {interview.paymentStatus}
                  </span>
                </div>
                
                {interview.paymentStatus === 'paid' && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Payment completed</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Information */}
        {client && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Your Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Name</p>
                  <p className="text-sm">{client.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Email</p>
                  <p className="text-sm">{client.email}</p>
                </div>
                {client.phone && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Phone</p>
                    <p className="text-sm">{client.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <p className="text-sm capitalize">{client.status}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Response Section */}
        {interview.status === 'scheduled' && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Respond to Interview Invitation</CardTitle>
              <CardDescription>
                Please let us know if you'd like to accept this interview opportunity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any questions or comments about the interview..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={() => handleResponse('accept')}
                    disabled={responding}
                    className="flex-1 bg-green-600 hover:bg-green-700 flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Accept Interview
                  </Button>
                  <Button
                    onClick={() => handleResponse('decline')}
                    disabled={responding}
                    variant="outline"
                    className="flex-1 flex items-center gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Decline Interview
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Section */}
        {interview.status === 'client_accepted' && interview.paymentStatus === 'pending' && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Complete Payment</CardTitle>
              <CardDescription>
                Please complete your payment to confirm the interview
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <p className="text-sm font-medium text-yellow-900">Payment Required</p>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Your interview is confirmed pending payment of £{interview.paymentAmount}.
                  </p>
                </div>
                
                <Button
                  onClick={handlePayment}
                  disabled={paymentProcessing}
                  className="w-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  {paymentProcessing ? 'Processing Payment...' : `Pay £${interview.paymentAmount}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success Message */}
        {interview.paymentStatus === 'paid' && (
          <Card className="mb-8 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800">Interview Confirmed!</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <p className="text-green-800 font-medium">Your interview has been confirmed</p>
                  <p className="text-green-700 text-sm">
                    You will receive further details about the interview via email.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>If you have any questions, please contact us at support@interviewsfirst.com</p>
        </div>
      </div>
    </div>
  );
} 