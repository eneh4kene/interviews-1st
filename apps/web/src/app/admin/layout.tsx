"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminAuth = () => {
      try {
        const stored = localStorage.getItem('user');
        const token = localStorage.getItem('accessToken');

        if (!stored || !token) {
          router.push('/login');
          return;
        }

        const user = JSON.parse(stored);
        if (user && user.role === 'ADMIN') {
          setIsLoading(false);
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Error checking admin authentication:', error);
        router.push('/login');
      }
    };

    checkAdminAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
