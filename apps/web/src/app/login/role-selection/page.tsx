'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@interview-me/ui';
import { Users, User, Shield, ArrowLeft } from 'lucide-react';
import Logo from '../../../components/Logo';
import { ThemeToggle } from '../../../components/ThemeToggle';

export default function RoleSelectionPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center items-center gap-4 mb-6">
            <Link href="/login">
              <Button variant="outline" size="sm" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800">
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Button>
            </Link>
            <ThemeToggle />
          </div>
          <Logo size="lg" className="mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Select Your Role</h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            Choose your role to access the appropriate dashboard
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Talent Manager */}
          <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-xl">Talent Manager</CardTitle>
              <CardDescription>
                Career coaches and recruiters managing talent portfolios
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Access your dashboard to manage talents, schedule interviews, and track placements.
              </p>
              <Link href="/login/worker">
                <Button className="w-full h-11">
                  Continue as Talent Manager
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Talent */}
          <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-xl">Talent</CardTitle>
              <CardDescription>
                Job seekers looking for career opportunities
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                View your profile, manage applications, and respond to interview offers.
              </p>
              <Link href="/login/client">
                <Button className="w-full h-11">
                  Continue as Talent
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Admin */}
          <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-xl">Administrator</CardTitle>
              <CardDescription>
                System administrators and platform managers
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Manage users, monitor system performance, and configure platform settings.
              </p>
              <Link href="/login/admin">
                <Button className="w-full h-11">
                  Continue as Admin
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Need help? Contact support at{' '}
            <a href="mailto:support@interviewsfirst.com" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              support@interviewsfirst.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
