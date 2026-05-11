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

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0F0F0F; color: #FFFFFF; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: linear-gradient(145deg, #1A1A1A, #0A0A0A); border-radius: 24px; padding: 40px; border: 1px solid rgba(255, 255, 255, 0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 32px; font-weight: bold; color: #E50914; letter-spacing: 2px; }
            .ticket { background: rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 24px; margin-top: 20px; position: relative; overflow: hidden; }
            .ticket::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: #E50914; }
            h1 { font-size: 24px; margin: 0 0 10px 0; color: #FFFFFF; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 10px; }
            .label { color: #888; font-size: 14px; }
            .value { color: #FFF; font-weight: 600; }
            .footer { text-align: center; margin-top: 40px; color: #666; font-size: 12px; }
            .qr-placeholder { width: 150px; height: 150px; background: white; margin: 20px auto; border-radius: 8px; padding: 10px; }
            .price-badge { background: #E50914; color: white; padding: 4px 12px; border-radius: 20px; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">CineBook</div>
                <p style="color: #888;">הכרטיס שלך מוכן להקרנה!</p>
            </div>
            
            <div class="ticket">
                <h1>${data.movieTitle}</h1>
                
                <div class="detail-row">
                    <span class="label">תאריך:</span>
                    <span class="value">${data.date}</span>
                </div>
                
                <div class="detail-row">
                    <span class="label">שעה:</span>
                    <span class="value">${data.time}</span>
                </div>
                
                <div class="detail-row">
                    <span class="label">אולם:</span>
                    <span class="value">${data.hall}</span>
                </div>
                
                <div class="detail-row">
                    <span class="label">מושבים:</span>
                    <span class="value">${seatsList}</span>
                </div>
                
                <div class="detail-row" style="border: none;">
                    <span class="label">סה"כ לתשלום:</span>
                    <span class="price-badge">₪${data.totalPrice}</span>
                </div>
            </div>

            <div class="footer">
                <p>מספר הזמנה: ${data.bookingId}</p>
                <p>נא להציג מייל זה בכניסה לקולנוע.</p>
                <p>© 2026 CineBook Mobile. כל הזכויות שמורות.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};
