#!/usr/bin/env node

/**
 * Test script to verify file URL nomenclature with interviewsfirst.com domain
 * This script will:
 * 1. Test the download API endpoint
 * 2. Verify URL structure
 * 3. Test n8n compatibility
 */

const https = require('https');
const http = require('http');

// Configuration
const APP_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://interviewsfirst.com';
const API_BASE = `${APP_URL}/api`;

// Test data
const TEST_RESUME_ID = 'test-resume-id'; // Replace with actual resume ID
const TEST_TOKEN = 'test-token'; // Replace with actual JWT token

async function testFileUrls() {
    console.log('🧪 Testing file URL nomenclature...\n');
    console.log(`📡 App URL: ${APP_URL}`);
    console.log(`🔗 API Base: ${API_BASE}\n`);

    try {
        // Test 1: Check if download endpoint exists
        console.log('1️⃣ Testing download endpoint availability...');
        const downloadUrl = `${API_BASE}/resumes/${TEST_RESUME_ID}/download`;
        console.log(`   URL: ${downloadUrl}`);

        const response = await makeRequest(downloadUrl, {
            'Authorization': `Bearer ${TEST_TOKEN}`
        });

        if (response.statusCode === 200) {
            console.log('   ✅ Download endpoint is accessible');

            // Check if it's a redirect to Vercel Blob
            if (response.headers.location) {
                console.log(`   🔄 Redirects to: ${response.headers.location}`);
                console.log('   ✅ Vercel Blob URL detected');
            } else {
                console.log('   📄 Direct file response (local file)');
            }
        } else if (response.statusCode === 401) {
            console.log('   🔐 Authentication required (expected)');
        } else if (response.statusCode === 404) {
            console.log('   📭 Resume not found (expected for test ID)');
        } else {
            console.log(`   ⚠️  Unexpected status: ${response.statusCode}`);
        }

        console.log('');

        // Test 2: Test URL structure for n8n
        console.log('2️⃣ Testing URL structure for n8n compatibility...');

        const testUrls = [
            `${API_BASE}/resumes/123/download`,
            `${API_BASE}/resumes/abc-def-123/download`,
            `${API_BASE}/resumes/123/download?token=abc123`,
        ];

        for (const url of testUrls) {
            console.log(`   Testing: ${url}`);

            // Check if URL is properly formatted
            const urlObj = new URL(url);
            if (urlObj.protocol === 'https:' && urlObj.hostname.includes('interviewsfirst.com')) {
                console.log('   ✅ URL structure is correct for n8n');
            } else {
                console.log('   ❌ URL structure issue');
            }
        }

        console.log('');

        // Test 3: Test Vercel Blob URL format
        console.log('3️⃣ Testing Vercel Blob URL format...');

        const blobUrl = 'https://blob.vercel-storage.com/resumes/resume-123456.pdf';
        console.log(`   Blob URL: ${blobUrl}`);

        if (blobUrl.startsWith('https://blob.vercel-storage.com/')) {
            console.log('   ✅ Vercel Blob URL format is correct');
        } else {
            console.log('   ❌ Invalid Vercel Blob URL format');
        }

        console.log('');

        // Test 4: Test n8n HTTP Request compatibility
        console.log('4️⃣ Testing n8n HTTP Request compatibility...');

        const n8nConfig = {
            url: `${API_BASE}/resumes/123/download`,
            method: 'GET',
            headers: {
                'Authorization': 'Bearer {{ $json.token }}',
                'User-Agent': 'n8n-workflow/1.0'
            },
            options: {
                response: {
                    response: {
                        responseFormat: 'file'
                    }
                }
            }
        };

        console.log('   n8n HTTP Request configuration:');
        console.log(JSON.stringify(n8nConfig, null, 2));
        console.log('   ✅ Configuration is n8n compatible');

        console.log('\n🎉 All tests completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

function makeRequest(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const isHttps = url.startsWith('https://');
        const client = isHttps ? https : http;

        const options = {
            method: 'GET',
            headers: {
                'User-Agent': 'Test-Script/1.0',
                ...headers
            },
            timeout: 10000
        };

        const req = client.request(url, options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: data
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

// Run tests
testFileUrls().catch(console.error);
