// Simple test to verify cache fix
const jwt = require('jsonwebtoken');

// Create a valid JWT token
const token = jwt.sign(
    { userId: 'test-user', role: 'ADMIN' },
    'uD7!h^mZq3@9Xf$eRj2&VpB*KwY8s*TnL%4cH1oGz=+Ma?b'
);

async function testCache() {
    console.log('🧪 Testing cache fix with valid token...');

    try {
        // Test the API with valid token
        const response = await fetch('http://localhost:3000/api/emails/client-inbox?clientId=392fce49-ac4b-490c-b14c-924e6f408c67', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Status:', response.status);
        console.log('Cache-Control:', response.headers.get('cache-control'));
        console.log('Pragma:', response.headers.get('pragma'));
        console.log('Expires:', response.headers.get('expires'));

        if (response.ok) {
            const data = await response.json();
            console.log('✅ API call successful');
            console.log('Number of emails:', data.data ? data.data.length : 'No data');
        } else {
            const error = await response.text();
            console.log('❌ API call failed:', error.substring(0, 200));
        }
    } catch (error) {
        console.error('❌ Request failed:', error.message);
    }
}

testCache();
