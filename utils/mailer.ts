import nodemailer from 'nodemailer';

export const sendEmail = async (to: string, subject: string, html: string) => {
  // Use environment variables for production, or fallback to ethereal for development
  const isGmail = process.env.EMAIL_HOST === 'smtp.gmail.com';
  
  const transporter = nodemailer.createTransport(
    isGmail 
    ? {
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
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


  // If using ethereal and no credentials provided, we can auto-generate them
  // This is a common pattern for dev environments
  if (!process.env.EMAIL_USER) {
    console.log('No email credentials found, skipping actual send. Log content to console.');
    console.log('TO:', to);
    console.log('SUBJECT:', subject);
    // In a real dev environment, you'd use ethereal.email's createTestAccount
    return { success: true, message: 'Dev mode: Email logged to console' };
  }

  try {
    // Verify connection configuration
    await transporter.verify();
    console.log('✅ Mailer connection verified');

    const info = await transporter.sendMail({
      from: `"CineBook" <${process.env.EMAIL_FROM || 'no-reply@cinebook.com'}>`,
      to,
      subject,
      html,
    });

    console.log('Message sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};
