
const authenticator = require('otplib').authenticator;

const API_URL = 'http://localhost:8080/api/auth';
const EMAIL = `test2fa_${Date.now()}@example.com`;
const PASSWORD = 'StrongPassword123!';

async function post(url: string, body: any, token?: string) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(API_URL + url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Request to ${url} failed: ${res.status} ${text}`);
    }
    return res.json();
}

async function run() {
    try {
        console.log('1. Registering user...');
        const regRes = await post('/register', {
            email: EMAIL,
            password: PASSWORD,
            firstName: 'Test',
            lastName: 'User',
            username: `user_${Date.now()}`
        });
        const { accessToken } = regRes;
        console.log('   Registered.');

        console.log('2. Setting up 2FA...');
        const setupRes = await post('/2fa/setup', {}, accessToken);
        const { secret } = setupRes;
        console.log('   Secret:', secret);

        console.log('3. Enabling 2FA...');
        const token = authenticator.generate(secret);
        await post('/2fa/enable', { token }, accessToken);
        console.log('   2FA Enabled.');

        console.log('4. Logging in (expecting 2FA challenge)...');
        const loginRes = await post('/login', {
            email: EMAIL,
            password: PASSWORD
        }); // No token needed

        if (loginRes.requires2fa) {
            console.log('   Got 2FA challenge.');
            const { tempToken } = loginRes;

            console.log('5. Verifying 2FA login...');
            const code = authenticator.generate(secret);
            const verifyRes = await post('/2fa/login', {
                tempToken,
                token: code
            });
            console.log('   2FA Login Success:', verifyRes.message);
            if (verifyRes.accessToken) {
                console.log('   Got Access Token!');
            } else {
                console.error('   Failed to get access token');
                process.exit(1);
            }

        } else {
            console.error('   Did NOT get 2FA challenge!');
            process.exit(1);
        }

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

run();
