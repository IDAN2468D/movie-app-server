import { Resend } from 'resend';

// Initialize Resend with API Key
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const sendEmail = async (to: string, subject: string, html: string) => {
  console.log(`📧 Attempting to send email to ${to} using Resend...`);

  if (!resend) {
    console.log('⚠️ No RESEND_API_KEY found in ENV. Skipping send and logging to console.');
    console.log('TO:', to);
    console.log('SUBJECT:', subject);
    return { success: true, message: 'Dev mode: Email logged to console' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'CineBook <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('❌ Resend Error:', error);
      throw new Error(`Email failed: ${error.message}`);
    }

    console.log('🚀 Message sent successfully via Resend:', data?.id);
    return { success: true, messageId: data?.id };
  } catch (error: any) {
    console.error('❌ Error sending email:', error.message || error);
    throw new Error(`Email failed: ${error.message}`);
  }
};
