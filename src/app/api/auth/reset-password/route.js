// app/api/auth/reset-password/route.js
import { getPool } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(req) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      console.error('Missing required fields:', { hasToken: !!token, hasPassword: !!password });
      return Response.json({ 
        error: 'Geçersiz istek, token veya şifre eksik.' 
      }, { status: 400 });
    }

    // Add password validation
    if (password.length < 8 || !/^(?=.*[A-Z])(?=.*\d).+$/.test(password)) {
      return Response.json({ 
        error: 'Şifre en az 8 karakter uzunluğunda olmalı, bir büyük harf ve bir rakam içermelidir.' 
      }, { status: 400 });
    }

    // Verify JWT Token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return Response.json({ 
        error: 'Geçersiz veya süresi dolmuş token.' 
      }, { status: 400 });
    }

    const pool = await getPool();

    // Verify token in database and check expiration
    const userResult = await pool.request()
      .input("userId", decoded.userId)
      .input("resetToken", token)
      .query(`
        SELECT id, reset_token, reset_expires, DATEADD(HOUR, 3, GETUTCDATE()) as currentTime
        FROM dbo.[users]
        WHERE id = @userId
          AND reset_token = @resetToken
          AND reset_expires > DATEADD(HOUR, 3, GETUTCDATE())
      `);

    if (userResult.recordset.length === 0) {
      return Response.json({ 
        error: 'Geçersiz veya süresi dolmuş token.' 
      }, { status: 400 });
    }

    const user = userResult.recordset[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');

    // Update password and clear reset token
    const updateResult = await pool.request()
      .input("userId", user.id)
      .input("hashedPassword", hashedPassword)
      .query(`
        UPDATE dbo.[users]
        SET 
          password_hash = @hashedPassword,
          reset_token = NULL,
          reset_expires = NULL,
          last_login = DATEADD(HOUR, 3, GETUTCDATE())
        OUTPUT 
          inserted.id,
          CAST(CASE WHEN inserted.password_hash IS NOT NULL THEN 1 ELSE 0 END as bit) as password_updated
        WHERE id = @userId;
      `);

    console.log('Update result:', {
      rowsAffected: updateResult.rowsAffected[0],
      passwordUpdated: updateResult.recordset[0]?.password_updated
    });

    if (updateResult.rowsAffected[0] === 0) {
      console.error('Password update failed - no rows affected');
      return Response.json({ 
        error: 'Şifre güncellenirken bir hata oluştu.' 
      }, { status: 500 });
    }

    return Response.json({ 
      message: 'Şifreniz başarıyla güncellendi!' 
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return Response.json({ 
      error: 'Sunucu hatası, lütfen tekrar deneyin.' 
    }, { status: 500 });
  }
}