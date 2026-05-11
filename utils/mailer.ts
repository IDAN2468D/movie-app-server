import nodemailer from 'nodemailer';

export const sendEmail = async (to: string, subject: string, html: string) => {
  // Use environment variables for production, or fallback to ethereal for development
  const isGmail = process.env.EMAIL_HOST === 'smtp.gmail.com';
  
  console.log(`📧 Attempting to send email to ${to} using ${isGmail ? 'Gmail' : 'SMTP'}...`);

  const transporter = nodemailer.createTransport(
    isGmail 
    ? {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 10000,
      }
    : {
        host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER || 'test@ethereal.email',
          pass: process.env.EMAIL_PASS || 'testpassword',
        },
        tls: {
          rejectUnauthorized: false
        }
      }
  );

  if (!process.env.EMAIL_USER) {
    console.log('⚠️ No email credentials found in ENV. Skipping send and logging to console.');
    console.log('TO:', to);
    console.log('SUBJECT:', subject);
    return { success: true, message: 'Dev mode: Email logged to console' };
  }

  try {
    // Verify connection configuration
    console.log('🔍 Verifying mailer connection...');
    await transporter.verify();
    console.log('✅ Mailer connection verified');

    const info = await transporter.sendMail({
      from: `"CineBook" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log('🚀 Message sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('❌ Error sending email:', error.message || error);
    // If we're in dev, we might not want to crash the whole process but we should report it
    throw new Error(`Email failed: ${error.message}`);
  }
};
