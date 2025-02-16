import { getPool } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(req) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return Response.json({ error: 'Geçersiz istek, eksik veri.' }, { status: 400 });
    }

    // Verify JWT Token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch  {
      return Response.json({ error: 'Token geçersiz veya süresi dolmuş.' }, { status: 400 });
    }

    const pool = await getPool();

    // Get user by ID from token
    const result = await pool.request()
      .input("userId", decoded.userId)
      .query("SELECT id FROM dbo.[user] WHERE id = @userId");

    if (result.recordset.length === 0) {
      return Response.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password in database
    await pool.request()
      .input("userId", decoded.userId)
      .input("hashedPassword", hashedPassword)
      .query("UPDATE dbo.[user] SET password = @hashedPassword, reset_token = NULL, reset_expires = NULL WHERE id = @userId");

    return Response.json({ message: 'Şifreniz başarıyla güncellendi!' });

  } catch  {
    
    return Response.json({ error: 'Sunucu hatası, lütfen tekrar deneyin.' }, { status: 500 });
  }
}
