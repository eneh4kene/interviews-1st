'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input, Label, Alert, AlertDescription } from '@interview-me/ui';
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Logo from '../../components/Logo';
import { ThemeToggle } from '../../components/ThemeToggle';
import { LoginRequest, LoginResponse } from '@interview-me/types';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const loginData: LoginRequest = { email, password };
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
        credentials: 'include',
      });

      const result: LoginResponse = await response.json();

      if (result.success && result.data) {
        // Store access token and user data
        localStorage.setItem('accessToken', result.data.accessToken);
        localStorage.setItem('user', JSON.stringify(result.data.user));
        
        // Smart redirect based on user role
        const user = result.data.user;
        if (user.role === 'WORKER' || user.role === 'MANAGER') {
          router.push('/dashboard');
        } else if (user.role === 'ADMIN') {
          router.push('/admin/dashboard');
        } else if (user.role === 'CLIENT') {
          router.push('/client');
        } else {
          // Fallback to role selection if role is unclear
          router.push('/login/role-selection');
        }
      } else {
        setError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center items-center gap-4 mb-6">
            <Link href="/">
              <Button variant="outline" size="sm" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <ThemeToggle />
          </div>
          <Logo size="lg" className="mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in to your InterviewsFirst account
          </p>
        </div>

        {/* Login Form */}
        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">Sign in</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="pl-10 h-11"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10 pr-10 h-11"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

          </CardContent>
        </Card>

        {/* Footer */}
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