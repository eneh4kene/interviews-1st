'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Alert, AlertDescription } from '@interview-me/ui';
import { LoginRequest, LoginResponse, User } from '@interview-me/types';
import Logo from '../Logo';

interface LoginFormProps {
  userType: 'worker' | 'client' | 'admin';
  title: string;
  description: string;
  redirectTo: string;
}

export default function LoginForm({ userType, title, description, redirectTo }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        credentials: 'include', // Important for cookies
      });

      const result: LoginResponse = await response.json();

      if (result.success && result.data) {
        // Store access token in localStorage (in real app, consider more secure storage)
        localStorage.setItem('accessToken', result.data.accessToken);
        localStorage.setItem('user', JSON.stringify(result.data.user));
        
        // Redirect based on user role
        const user = result.data.user;
        if (user.role === 'WORKER' || user.role === 'MANAGER') {
          router.push('/dashboard');
        } else if (user.role === 'ADMIN') {
          router.push('/admin');
        } else if (user.role === 'CLIENT') {
          router.push('/client');
        } else {
          router.push(redirectTo);
        }
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Logo size="lg" className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="mt-2 text-sm text-gray-600">{description}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in to your account</CardTitle>
            <CardDescription>
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
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Demo credentials for {userType}:
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Email: {userType === 'worker' ? 'worker1@interview-me.com' : 
                       userType === 'admin' ? 'admin@interview-me.com' : 
                       'client1@email.com'}
              </p>
              <p className="text-xs text-gray-500">
                Password: {userType === 'worker' ? 'password@worker' : userType === 'admin' ? 'admin@admin' : 'password@client'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 