// app/api/auth/new-password/route.js
import { getPool } from '@/lib/db';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      console.error('Missing email in request');
      return Response.json({ 
        error: "E-posta gereklidir." 
      }, { status: 400 });
    }

    const pool = await getPool();

    // Check if user exists
    const userResult = await pool.request()
      .input("email", email)
      .query(`
        SELECT id, firstname, email 
        FROM dbo.[users] 
        WHERE email = @email
      `);

    if (userResult.recordset.length === 0) {
      console.error('User not found for email:', email);
      return Response.json({ 
        error: "Bu e-posta adresi kayıtlı değil. Lütfen yöneticinize başvurun" 
      }, { status: 404 });
    }

    const user = userResult.recordset[0];

    // Generate JWT token
    const resetToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Update user with reset token and expiration (UTC+3 for Turkey)
    const updateResult = await pool.request()
      .input("userId", user.id)
      .input("resetToken", resetToken)
      .query(`
        UPDATE dbo.[users]
        SET 
          reset_token = @resetToken,
          reset_expires = DATEADD(HOUR, 1, DATEADD(HOUR, 3, GETUTCDATE()))
        WHERE id = @userId
      `);

    if (updateResult.rowsAffected[0] === 0) {
      throw new Error('Failed to update reset token');
    }

    // Email configuration (keeping the same template)
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

    // Keeping the same email template
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "SimulAI Şifre Talebi",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Merhaba ${user.firstname},</h2>
          <p>Şifrenizi belirlemek için bir talepte bulundunuz.</p>
          <p>Yeni şifrenizi belirlemek için aşağıdaki bağlantıya tıklayın:</p>
          <p style="margin: 20px 0;">
            <a href="${resetLink}" 
               style="background-color: #007bff; 
                      color: white; 
                      padding: 10px 20px; 
                      text-decoration: none; 
                      border-radius: 5px;">
              Şifremi Belirle
            </a>
          </p>
          <p><strong>Önemli:</strong> Bu bağlantı 1 saat süreyle geçerlidir.</p>
          <p>Eğer bu talebi siz yapmadıysanız, lütfen bu e-postayı dikkate almayın.</p>
          <hr style="margin: 20px 0; border: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            Bu otomatik bir e-postadır, lütfen yanıtlamayın.<br>
            SimulAI Destek Ekibi
          </p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Reset email sent successfully to:', email);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      return Response.json({ 
        error: "E-posta gönderilirken bir hata oluştu." 
      }, { status: 500 });
    }

    return Response.json({ 
      message: "Şifre bağlantısı e-posta adresinize gönderildi." 
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    return Response.json({ 
      error: "Sunucu hatası, lütfen tekrar deneyin." 
    }, { status: 500 });
  }
}