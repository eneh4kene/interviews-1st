const jwt = require('jsonwebtoken');

// Create a valid JWT token with all required fields
const token = jwt.sign(
    {
        userId: 'test-user',
        email: 'test@example.com',
        role: 'ADMIN',
        type: 'access'
    },
    'uD7!h^mZq3@9Xf$eRj2&VpB*KwY8s*TnL%4cH1oGz=+Ma?b',
    {
        algorithm: 'HS256',
        expiresIn: '45m',
        issuer: 'interviewsfirst',
        audience: 'interviewsfirst-users',
    }
);

async function testCacheFix() {
    console.log('🧪 Testing cache fix with proper JWT token...');

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

            // Check if we can see recent emails
            if (data.data && data.data.length > 0) {
                console.log('Recent emails:');
                data.data.slice(0, 3).forEach((email, index) => {
                    console.log(`  ${index + 1}. ${email.subject} (${email.status})`);
                });
            }
        } else {
            const error = await response.text();
            console.log('❌ API call failed:', error.substring(0, 200));
        }
    } catch (error) {
        console.error('❌ Request failed:', error.message);
    }
}

testCacheFix();
