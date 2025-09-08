'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Alert, AlertDescription } from '@interview-me/ui';
import { InterviewOffer, OfferAcceptRequest, OfferAcceptResponse, OfferDeclineRequest, OfferDeclineResponse } from '@interview-me/types';

export default function OfferPage() {
  const params = useParams();
  const router = useRouter();
  const [offer, setOffer] = useState<InterviewOffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // In real app, this would verify the token and fetch offer details
    // For now, we'll simulate the offer data
    const mockOffer: InterviewOffer = {
      id: 'offer_1',
      interviewId: 'interview_1',
      clientId: 'client_1',
      token: params.token as string,
      status: 'SENT',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      paymentStatus: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setOffer(mockOffer);
    setIsLoading(false);
  }, [params.token]);

  const handleAccept = async () => {
    if (!offer) return;
    
    setIsProcessing(true);
    setError('');

    try {
      const acceptData: OfferAcceptRequest = { token: offer.token };
      
      const response = await fetch(`/api/interviews/${offer.interviewId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(acceptData),
      });

      const result: OfferAcceptResponse = await response.json();

      if (result.success && result.data) {
        // Redirect to Stripe Checkout
        window.location.href = result.data.checkoutUrl;
      } else {
        setError(result.error || 'Failed to accept offer');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Accept offer error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!offer) return;
    
    setIsProcessing(true);
    setError('');

    try {
      const declineData: OfferDeclineRequest = { 
        token: offer.token,
        reason: 'Client declined the offer'
      };
      
      const response = await fetch(`/api/interviews/${offer.interviewId}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(declineData),
      });

      const result: OfferDeclineResponse = await response.json();

      if (result.success) {
        setSuccess('Offer declined successfully. You will not be charged.');
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        setError(result.error || 'Failed to decline offer');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Decline offer error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading offer details...</p>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Invalid Offer</CardTitle>
            <CardDescription>
              This offer link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')} className="w-full">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (offer.status === 'ACCEPTED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-green-600">Offer Accepted!</CardTitle>
            <CardDescription>
              Thank you for accepting the interview offer. Payment has been processed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')} className="w-full">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (offer.status === 'DECLINED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-gray-600">Offer Declined</CardTitle>
            <CardDescription>
              You have declined this interview offer. No payment will be charged.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')} className="w-full">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Interview Offer</h1>
          <p className="mt-2 text-sm text-gray-600">
            You have received an interview offer from Interview Me
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Interview Details</CardTitle>
            <CardDescription>
              Review the offer details before accepting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900">Interview Offer</h3>
                <p className="text-sm text-gray-600">
                  You have been selected for an interview opportunity!
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">What happens next?</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Your career coach will contact you with interview details</li>
                  <li>• You'll receive preparation materials and guidance</li>
                  <li>• We'll support you throughout the interview process</li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Payment Information</h4>
                <p className="text-sm text-blue-700">
                  <strong>£10 fee:</strong> This covers our interview preparation and support services. 
                  You only pay if you accept the offer.
                </p>
              </div>

              <div className="text-xs text-gray-500">
                <p>Offer expires: {offer.expiresAt.toLocaleDateString()} at {offer.expiresAt.toLocaleTimeString()}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleAccept}
                disabled={isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? 'Processing...' : 'Accept & Pay £10'}
              </Button>
              <Button
                onClick={handleDecline}
                disabled={isProcessing}
                variant="outline"
                className="flex-1"
              >
                {isProcessing ? 'Processing...' : 'Decline'}
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                By accepting, you agree to pay the £10 fee for interview support services.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 