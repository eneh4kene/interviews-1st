const jwt = require('jsonwebtoken');

// Create a valid JWT token
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

async function debugJeanClaude() {
    console.log('🔍 Debugging Jean Claude email issue...');
    console.log('Client ID: 3195a4df-1edf-403a-8c16-d6c96fa77577');
    console.log('JWT Token:', token.substring(0, 50) + '...');

    try {
        const response = await fetch('http://localhost:3000/api/emails/client-inbox?clientId=3195a4df-1edf-403a-8c16-d6c96fa77577', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Response Status:', response.status);
        console.log('Response Headers:');
        console.log('  Cache-Control:', response.headers.get('cache-control'));
        console.log('  Content-Type:', response.headers.get('content-type'));

        const data = await response.text();
        console.log('Response Body:', data.substring(0, 500));

        if (response.ok) {
            const jsonData = JSON.parse(data);
            console.log('✅ API call successful');
            console.log('Number of emails:', jsonData.data ? jsonData.data.length : 'No data');

            if (jsonData.data && jsonData.data.length > 0) {
                console.log('Emails found:');
                jsonData.data.forEach((email, index) => {
                    console.log(`  ${index + 1}. ${email.subject} (${email.status}) - ${email.emailType}`);
                });
            }
        } else {
            console.log('❌ API call failed');
        }
    } catch (error) {
        console.error('❌ Request failed:', error.message);
    }
}

debugJeanClaude();
