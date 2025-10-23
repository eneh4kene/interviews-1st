"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from "@interview-me/ui";
import { Input } from "@interview-me/ui";
import { Label } from "@interview-me/ui";
import { Shield, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { apiService } from "../../../lib/api";
import Logo from "../../../components/Logo";
import { ThemeToggle } from "../../../components/ThemeToggle";

export default function AdminLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.login(formData.email, formData.password);

      if (response.success) {
        // Check if user is admin
        if (response.data.user.role === 'ADMIN') {
          // Store user data and token
          localStorage.setItem('user', JSON.stringify(response.data.user));
          localStorage.setItem('accessToken', response.data.accessToken);
          
          // Redirect to admin dashboard
          router.push('/admin/dashboard');
        } else {
          setError('Access denied. Admin privileges required.');
        }
      } else {
        setError(response.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
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
          <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Login</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in to access the admin dashboard
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Administrator Access</CardTitle>
            <CardDescription className="text-center">
              Enter your admin credentials to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="admin@interviewsfirst.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in as Admin"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Admin access is restricted to authorized personnel only.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Need help? Contact support at{' '}
            <a href="mailto:support@interviewsfirst.com" className="text-blue-600 dark:text-blue-400 hover:underline">
              support@interviewsfirst.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}