export const getTicketEmailTemplate = (data: {
  movieTitle: string;
  date: string;
  time: string;
  hall: string;
  seats: { row: string; number: number }[];
  totalPrice: number;
  bookingId: string;
}) => {
  const seatsList = data.seats.map(s => `${s.row}${s.number}`).join(', ');
  // Use qrserver.com which is already used in the app and very reliable
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data.bookingId)}&bgcolor=FFFFFF&margin=10`;

  return `
    <!DOCTYPE html>
    <html dir="ltr" lang="he">
    <head>
        <meta charset="UTF-8">
        <title>CineBook Ticket</title>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #050505; font-family: Arial, sans-serif;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; margin: 0 auto; background-color: #121212; border-radius: 32px; border: 1px solid #333333; overflow: hidden;">
            <!-- Header -->
            <tr>
                <td align="center" style="padding: 40px 20px 20px; background: linear-gradient(to bottom, #1A1A1A, #121212);">
                    <h1 style="margin: 0; color: #E50914; font-size: 28px; letter-spacing: 2px;">CINEBOOK</h1>
                    <p style="margin: 5px 0 0; color: #888888; font-size: 14px;">הכרטיס הדיגיטלי שלך</p>
                </td>
            </tr>

            <!-- Content -->
            <tr>
                <td style="padding: 30px;">
                    <!-- Movie Card -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1A1A1A; border-radius: 20px; border: 1px solid #222222;">
                        <tr>
                            <td style="padding: 25px;">
                                <h2 style="margin: 0 0 20px; color: #FFFFFF; font-size: 22px; text-align: center;">${data.movieTitle}</h2>
                                
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #222222; color: #888888; text-align: left;">תאריך</td>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #222222; color: #FFFFFF; font-weight: bold; text-align: right;">${data.date}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #222222; color: #888888; text-align: left;">שעה</td>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #222222; color: #FFFFFF; font-weight: bold; text-align: right;">${data.time}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #222222; color: #888888; text-align: left;">אולם</td>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #222222; color: #FFFFFF; font-weight: bold; text-align: right;">${data.hall}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #222222; color: #888888; text-align: left;">מושבים</td>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #222222; color: #E50914; font-weight: bold; text-align: right;">${seatsList}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 15px 0 0; color: #888888; text-align: left;">מחיר כולל</td>
                                        <td style="padding: 15px 0 0; color: #FFFFFF; font-weight: bold; font-size: 18px; text-align: right;">₪${data.totalPrice}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>

                    <!-- QR Code Section (Using tables for max compatibility) -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 30px;">
                        <tr>
                            <td align="center">
                                <table border="0" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 20px;">
                                    <tr>
                                        <td style="padding: 20px; background-color: #FFFFFF; border-radius: 20px;" align="center">
                                            <img src="${qrUrl}" width="150" height="150" alt="QR CODE - ${data.bookingId.substring(0, 8)}" style="display: block; border: 0; width: 150px; height: 150px; background-color: #FFFFFF;">
                                        </td>
                                    </tr>
                                </table>
                                <p style="margin: 15px 0 0; color: #888888; font-size: 12px;">נא להציג את הקוד בכניסה לאולם</p>
                                <a href="${qrUrl}" style="display: inline-block; margin-top: 10px; color: #E50914; text-decoration: none; font-size: 11px;">לא רואה את הברקוד? לחץ כאן</a>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>

            <!-- Footer -->
            <tr>
                <td style="padding: 20px 30px 40px; border-top: 1px solid #222222; text-align: center;">
                    <p style="margin: 0; color: #888888; font-size: 12px;">מספר הזמנה</p>
                    <p style="margin: 5px 0 0; color: #E50914; font-weight: bold; font-size: 16px; font-family: monospace;">${data.bookingId.substring(0, 8).toUpperCase()}</p>
                    <p style="margin: 20px 0 0; color: #444444; font-size: 10px;">© 2026 CineBook Mobile. כל הזכויות שמורות.</p>
                </td>
            </tr>
        </table>
    </body>
    </html>
  `;
};
