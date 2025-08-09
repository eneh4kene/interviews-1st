"use client";

import { useState, useEffect } from "react";
import { Button } from "@interview-me/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@interview-me/ui";
import { ApiResponse } from "@interview-me/types";

export default function Home() {
  const [apiStatus, setApiStatus] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/health`);
        const data = await response.json();
        setApiStatus(data);
      } catch (error) {
        setApiStatus({
          success: false,
          error: "Failed to connect to API",
        });
      } finally {
        setLoading(false);
      }
    };

    checkApiStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to Interview Me
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            A modern interview platform built with Next.js, Express, and Turborepo
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🚀 Frontend (Next.js)
              </CardTitle>
              <CardDescription>
                Built with Next.js 14 App Router, Tailwind CSS, and shadcn/ui
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className="text-sm font-medium text-green-600">Running</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Port:</span>
                  <span className="text-sm font-medium">3000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Framework:</span>
                  <span className="text-sm font-medium">Next.js 14</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🔧 Backend (Express)
              </CardTitle>
              <CardDescription>
                TypeScript API with Express, Zod validation, and security middleware
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`text-sm font-medium ${
                    loading ? 'text-yellow-600' : 
                    apiStatus?.success ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {loading ? 'Checking...' : apiStatus?.success ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Port:</span>
                  <span className="text-sm font-medium">3001</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Framework:</span>
                  <span className="text-sm font-medium">Express + TS</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Card className="max-w-2xl mx-auto shadow-lg">
            <CardHeader>
              <CardTitle>🎯 Tech Stack</CardTitle>
              <CardDescription>
                This project demonstrates a modern full-stack setup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="font-medium">Turborepo</div>
                  <div className="text-gray-600 dark:text-gray-400">Monorepo</div>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="font-medium">Next.js</div>
                  <div className="text-gray-600 dark:text-gray-400">Frontend</div>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="font-medium">Express</div>
                  <div className="text-gray-600 dark:text-gray-400">Backend</div>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="font-medium">PostgreSQL</div>
                  <div className="text-gray-600 dark:text-gray-400">Database</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Button 
            onClick={() => window.location.href = '/dashboard'}
            className="mr-4"
          >
            View Dashboard
          </Button>
          <Button variant="outline" onClick={() => window.open('/api/hello', '_blank')}>
            Test API
          </Button>
        </div>
      </div>
    </div>
  );
} 