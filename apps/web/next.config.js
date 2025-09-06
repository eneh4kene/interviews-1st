/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ["@interview-me/ui", "@interview-me/types"],
    
    // Performance optimizations
    compress: true,
    poweredByHeader: false,
    generateEtags: true,
    
    // Image optimization
    images: {
        domains: ['localhost'],
        formats: ['image/webp', 'image/avif'],
    },
    
    // Bundle optimization
    webpack: (config, { dev, isServer }) => {
        // Bundle analyzer (only in development)
        if (dev && !isServer) {
            const withBundleAnalyzer = require('next-bundle-analyzer')({
                enabled: process.env.ANALYZE === 'true',
            });
            return withBundleAnalyzer(config);
        }
        
        // Production optimizations
        if (!dev && !isServer) {
            config.optimization.splitChunks = {
                chunks: 'all',
                cacheGroups: {
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        chunks: 'all',
                    },
                    common: {
                        name: 'common',
                        minChunks: 2,
                        chunks: 'all',
                        enforce: true,
                    },
                },
            };
        }
        
        return config;
    },
    
    // Headers for performance
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'origin-when-cross-origin',
                    },
                ],
            },
            {
                source: '/api/(.*)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=60, s-maxage=60',
                    },
                ],
            },
            {
                source: '/_next/static/(.*)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig; 