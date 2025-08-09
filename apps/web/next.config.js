/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        appDir: true,
    },
    transpilePackages: ["@interview-me/ui", "@interview-me/types"],
};

module.exports = nextConfig; 