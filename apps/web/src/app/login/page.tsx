'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@interview-me/ui';
import { Users, User, Shield, Home, ArrowLeft } from 'lucide-react';
import Logo from '../../components/Logo';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Link href="/">
              <Button variant="outline" size="sm" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
          <Logo size="lg" className="mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-gray-900">Welcome to InterviewsFirst</h1>
          <p className="mt-2 text-lg text-gray-600">
            Choose your role to access the platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Worker Login */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle>Workers & Managers</CardTitle>
              <CardDescription>
                Career coaches and recruiters managing client portfolios
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Access your dashboard to manage clients, schedule interviews, and track placements.
              </p>
              <Link href="/login/worker">
                <Button className="w-full">
                  Sign in as Worker
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Client Login */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <User className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle>Clients</CardTitle>
              <CardDescription>
                Job seekers looking for career opportunities
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                View your profile, manage applications, and respond to interview offers.
              </p>
              <Link href="/login/client">
                <Button className="w-full">
                  Sign in as Client
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Admin Login */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle>Administrators</CardTitle>
              <CardDescription>
                System administrators and platform managers
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Manage users, monitor system performance, and configure platform settings.
              </p>
              <Link href="/login/admin">
                <Button className="w-full">
                  Sign in as Admin
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact support at{' '}
            <a href="mailto:support@interviewsfirst.com" className="text-blue-600 hover:underline">
              support@interviewsfirst.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
} 