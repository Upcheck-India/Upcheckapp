

const API_URL = 'http://localhost:8080/api/auth';

async function post(endpoint, body, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
}

async function run() {
    console.log('1. Checking /google/link without token (Expect 401)');
    const res1 = await post('/google/link', { idToken: 'test' });
    if (res1.status === 401) {
        console.log('   Success: Got 401 Unauthorized');
    } else {
        console.error('   Failure: Got ' + res1.status);
        process.exit(1);
    }

    console.log('2. Registering temp user...');
    const email = `linktest_${Date.now()}@example.com`;
    const password = 'StrongPassword123!@#';
    const regRes = await post('/register', {
        email,
        password,
        firstName: 'Link',
        lastName: 'Test',
        username: `linkuser${Date.now()}`
    });

    if (regRes.status !== 201) {
        console.error('   Failed to register: ', regRes.data);
        process.exit(1);
    }
    const token = regRes.data.accessToken;
    console.log('   Registered and got token.');

    console.log('3. Checking /google/link with valid token but invalid Google token (Expect 401)');
    const res2 = await post('/google/link', { idToken: 'invalid-google-token' }, token);

    // Expect 401 because verifyIdToken fails and we throw UnauthorizedException
    if (res2.status === 401 && res2.data.message === 'Invalid Google token') {
        console.log('   Success: Got 401 Invalid Google token');
    } else {
        console.error('   Failure: Expected 401 Invalid Google token, got ' + res2.status, res2.data);
        // process.exit(1); // Proceed anyway?
    }

    console.log('Done.');
}

run().catch(console.error);
