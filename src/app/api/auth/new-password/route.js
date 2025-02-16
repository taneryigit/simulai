import { getPool } from '@/lib/db';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

export async function POST(req) {
  try {


    const { email } = await req.json();
  

    if (!email) {
    
      return Response.json({ error: "E-posta gereklidir." }, { status: 400 });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input("email", email)
      .query("SELECT id FROM dbo.[user] WHERE email = @email");



    if (result.recordset.length === 0) {
     
      return Response.json({ error: "Bu e-posta adresi kayıtlı değil. Lütfen yöneticinize başvurun" }, { status: 404 });
    }

    // ✅ Use JWT for reset token
    const resetToken = jwt.sign(
      { userId: result.recordset[0].id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: 587,  // ✅ Use port 587 for STARTTLS (instead of 465)
      secure: false, // ✅ Use `false` to enable TLS instead of SSL
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false, // ✅ Ignore self-signed certificates
      },
    });

   

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "SimulAI Şifre Talebi",
      text: `Merhaba,\n\nŞifrenizi belirlemek için aşağıdaki bağlantıya tıklayın:\n\n${resetLink}\n\nBağlantının geçerlilik süresi 1 saattir.\n\nEğer bu talebi siz yapmadıysanız, lütfen bu e-postayı dikkate almayın.\n\nTeşekkürler,\nSimulaAI Destek Ekibi`,
    };

 
    await transporter.sendMail(mailOptions);


    return Response.json({ message: "Şifre bağlantısı e-posta adresinize gönderildi." });

  } catch  {
   
    return Response.json({ error: "Sunucu hatası, lütfen tekrar deneyin." }, { status: 500 });
  }
}
