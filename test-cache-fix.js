const jwt = require('jsonwebtoken');

// Create a test JWT token
const token = jwt.sign(
    { userId: 'test-user', role: 'ADMIN' },
    'uD7!h^mZq3@9Xf$eRj2&VpB*KwY8s*TnL%4cH1oGz=+Ma?b'
);

const clientId = '392fce49-ac4b-490c-b14c-924e6f408c67';

async function testCacheFix() {
    console.log('🧪 Testing cache fix...');

    // Test 1: Send a new email
    console.log('\n1. Sending test email...');
    const emailResponse = await fetch('https://fa91dc39350c.ngrok-free.app/api/emails/inbound', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `from=test@example.com&to=nkiru.ethan@interviewsfirst.com&subject=Cache Test ${Date.now()}&text=Testing cache fix&html=<p>Testing cache fix</p>`
    });

    const emailResult = await emailResponse.json();
    console.log('Email sent:', emailResult.success);

    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Check API response headers
    console.log('\n2. Checking API response headers...');
    const apiResponse = await fetch(`http://localhost:3000/api/emails/client-inbox?clientId=${clientId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    console.log('Cache-Control header:', apiResponse.headers.get('cache-control'));
    console.log('Pragma header:', apiResponse.headers.get('pragma'));
    console.log('Expires header:', apiResponse.headers.get('expires'));

    // Test 3: Check if email appears in response
    const apiResult = await apiResponse.json();
    if (apiResult.success) {
        const emails = apiResult.data;
        console.log(`\n3. Found ${emails.length} emails in response`);

        // Look for our test email
        const testEmail = emails.find(email => email.subject.includes('Cache Test'));
        if (testEmail) {
            console.log('✅ Test email found in API response:', testEmail.subject);
        } else {
            console.log('❌ Test email NOT found in API response');
        }
    } else {
        console.log('❌ API call failed:', apiResult.error);
    }

    // Test 4: Call API again immediately to test caching
    console.log('\n4. Testing immediate second call...');
    const apiResponse2 = await fetch(`http://localhost:3000/api/emails/client-inbox?clientId=${clientId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    const apiResult2 = await apiResponse2.json();
    if (apiResult2.success) {
        const emails2 = apiResult2.data;
        console.log(`Found ${emails2.length} emails in second response`);

        const testEmail2 = emails2.find(email => email.subject.includes('Cache Test'));
        if (testEmail2) {
            console.log('✅ Test email found in second API response:', testEmail2.subject);
        } else {
            console.log('❌ Test email NOT found in second API response');
        }
    }
}

testCacheFix().catch(console.error);
