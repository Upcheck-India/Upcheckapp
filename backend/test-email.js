require('dotenv').config();
const nodemailer = require('nodemailer');

async function sendTestEmail() {
    console.log('Testing SMTP Configuration...');
    console.log(`Host: ${process.env.SMTP_HOST}`);
    console.log(`Port: ${process.env.SMTP_PORT}`);
    console.log(`User: ${process.env.SMTP_USER}`);

    // Mask password related info
    const pass = process.env.SMTP_PASS || '';
    console.log(`Pass: ${pass.substring(0, 4)}...${pass.substring(pass.length - 4)}`);

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    try {
        console.log('Verifying connection...');
        await transporter.verify();
        console.log('✅ Connection successful!');

        const mailOptions = {
            from: `"${process.env.SMTP_SENDER_NAME}" <${process.env.SMTP_SENDER_EMAIL}>`,
            to: process.env.SMTP_SENDER_EMAIL, // Send to self for testing
            subject: 'Test Email from Upcheck Debugger',
            text: 'If you receive this, SMTP is working correctly!',
        };

        console.log(`Sending test email to ${mailOptions.to}...`);
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent:', info.messageId);
    } catch (error) {
        console.error('❌ Failed to send email:', error);
    }
}

sendTestEmail();
