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

export default function ClientInterviewResponse({ params }: { params: { id: string } }) {
  const [interview, setInterview] = useState<Interview | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [response, setResponse] = useState<'accept' | 'decline' | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    // Mock data - in real app, fetch from API
    const mockInterview: Interview = {
      id: params.id,
      applicationId: "1",
      clientId: "1",
      companyName: "TechCorp Inc.",
      jobTitle: "Senior Software Engineer",
      scheduledDate: new Date("2024-02-01T14:00:00Z"),
      interviewType: "video",
      status: "scheduled",
      paymentStatus: "pending",
      paymentAmount: 10,
      paymentCurrency: "GBP",
      createdAt: new Date("2024-01-25"),
      updatedAt: new Date("2024-01-25"),
    };

    const mockClient: Client = {
      id: "1",
      workerId: "worker1",
      name: "Sarah Johnson",
      email: "sarah.johnson@email.com",
      phone: "+1 (555) 123-4567",
      linkedinUrl: "https://linkedin.com/in/sarahjohnson",
      status: "active",
      paymentStatus: "pending",
      totalInterviews: 0,
      totalPaid: 0,
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-15"),
    };

    setInterview(mockInterview);
    setClient(mockClient);
    setLoading(false);
  }, [params.id]);

  const handleResponse = async (responseType: 'accept' | 'decline') => {
    setResponding(true);
    setResponse(responseType);
    
    try {
      // In real app, call API
      const apiResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/interviews/${params.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          response: responseType,
          notes: notes,
        }),
      });

      if (apiResponse.ok) {
        const data = await apiResponse.json();
        setInterview(data.data);
        
        if (responseType === 'accept') {
          // Show payment form
          setPaymentProcessing(true);
        }
      }
    } catch (error) {
      console.error('Error responding to interview:', error);
    } finally {
      setResponding(false);
    }
  };

  const handlePayment = async () => {
    setPaymentProcessing(true);
    
    try {
      // In real app, integrate with Stripe
      const apiResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/interviews/${params.id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethod: 'card',
          stripePaymentIntentId: 'pi_mock_123',
        }),
      });

      if (apiResponse.ok) {
        const data = await apiResponse.json();
        setInterview(prev => prev ? { ...prev, paymentStatus: 'paid' } : null);
        alert('Payment successful! Your interview is confirmed.');
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
      case "scheduled": return "text-blue-600 bg-blue-50";
      case "client_accepted": return "text-green-600 bg-green-50";
      case "client_declined": return "text-red-600 bg-red-50";
      case "completed": return "text-purple-600 bg-purple-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "text-yellow-600 bg-yellow-50";
      case "paid": return "text-green-600 bg-green-50";
      case "failed": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
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

  if (!interview || !client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Interview not found</h3>
          <Button onClick={() => window.history.back()}>Go Back</Button>
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
                    <p className="font-medium text-gray-900">Interview Date</p>
                    <p className="text-gray-600">
                      {interview.scheduledDate.toLocaleDateString()} at {interview.scheduledDate.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Building className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Interview Type</p>
                    <p className="text-gray-600 capitalize">{interview.interviewType}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Payment Required</p>
                    <p className="text-gray-600">£{interview.paymentAmount} {interview.paymentCurrency}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Duration</p>
                    <p className="text-gray-600">45-60 minutes</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Location</p>
                    <p className="text-gray-600">
                      {interview.interviewType === 'video' ? 'Video Call (Zoom/Teams)' : 
                       interview.interviewType === 'phone' ? 'Phone Call' : 'On-site'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Info className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Payment Status</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(interview.paymentStatus)}`}>
                      {interview.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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

                {responding && (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Processing your response...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Section */}
        {interview.status === 'client_accepted' && interview.paymentStatus === 'pending' && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Complete Payment
              </CardTitle>
              <CardDescription>
                Please complete your payment of £{interview.paymentAmount} to confirm your interview
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Payment Required</h4>
                      <p className="text-blue-700 text-sm mt-1">
                        Your interview is scheduled but requires payment confirmation. 
                        You will only be charged £{interview.paymentAmount} for this interview.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Interview Fee:</span>
                    <span className="font-medium text-gray-900">£{interview.paymentAmount}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-bold text-lg text-gray-900">£{interview.paymentAmount}</span>
                  </div>
                </div>

                <Button
                  onClick={handlePayment}
                  disabled={paymentProcessing}
                  className="w-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  {paymentProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Pay £{interview.paymentAmount}
                    </>
                  )}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  Payment is processed securely via Stripe. You will receive a confirmation email once payment is complete.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirmation Section */}
        {interview.paymentStatus === 'paid' && (
          <Card className="mb-8 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                Interview Confirmed!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-green-700">
                  Your payment has been processed successfully. Your interview with {interview.companyName} is confirmed!
                </p>
                
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <h4 className="font-medium text-gray-900 mb-2">Next Steps:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• You will receive a calendar invitation shortly</li>
                    <li>• Prepare for your {interview.interviewType} interview</li>
                    <li>• Review the company and role details</li>
                    <li>• Contact us if you have any questions</li>
                  </ul>
                </div>

                <div className="text-center">
                  <Button variant="outline" onClick={() => window.print()}>
                    Download Confirmation
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle>Your Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Name</p>
                <p className="text-gray-900">{client.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Email</p>
                <p className="text-gray-900">{client.email}</p>
              </div>
              {client.phone && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Phone</p>
                  <p className="text-gray-900">{client.phone}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-600">Total Interviews</p>
                <p className="text-gray-900">{client.totalInterviews}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 