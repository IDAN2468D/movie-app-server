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
    // Resend Free Tier Sandbox Redirect:
    // If the target recipient is not the verified developer email, redirect it so it sends successfully
    let targetRecipient = to.trim();
    const developerEmail = 'idankzm@gmail.com';
    
    if (targetRecipient.toLowerCase() !== developerEmail.toLowerCase()) {
      console.log(`🔄 [Resend Sandbox Bypass] Redirecting email from "${targetRecipient}" to verified owner "${developerEmail}" to satisfy Resend Free tier restrictions.`);
      
      const noticeHtml = `
        <div style="direction: rtl; text-align: right; background-color: #1e1b4b; border: 1px solid #4f46e5; border-radius: 12px; padding: 16px; margin-bottom: 24px; color: #e0e7ff; font-family: sans-serif; line-height: 1.6;">
          <strong>📢 שים לב (מפתח/בוחן):</strong> מייל זה נשלח במקור לכתובת <em>${to}</em>, אך עקב מגבלות Resend Sandbox בחשבון החינמי, הוא נותב מחדש לכתובת המפתח המאומתת שלך.
        </div>
      `;
      html = noticeHtml + html;
      targetRecipient = developerEmail;
    }

    console.log(`📤 Sending via Resend to: ${targetRecipient}`);
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: targetRecipient,
      subject: `${subject} (נשלח במקור ל-${to})`,
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
