import { getPool } from '@/lib/db';
import sql from 'mssql';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "E-posta ve şifre gereklidir." }), { status: 400 });
    }

    const pool = await getPool();

    // Get user from DB
    const result = await pool
      .request()
      .input('email', sql.VarChar, email)
      .query('SELECT id, email, password_hash, firstname, lastname, companyid FROM dbo.[users] WHERE email = @email');

    if (result.recordset.length === 0) {
      return new Response(JSON.stringify({ error: 'E-posta ya da şifreniz yanlış' }), { status: 401 });
    }

    const user = result.recordset[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return new Response(JSON.stringify({ error: 'E-posta ya da şifreniz yanlış' }), { status: 401 });
    }

    // Update login timestamps
    try {
      await pool
        .request()
        .input("id", sql.Int, user.id)
        .query(`
          UPDATE dbo.users
          SET last_login = current_login, current_login = GETDATE()
          WHERE id = @id
        `);
    } catch (updateError) {
      console.error("Update error:", updateError);
      // Continue even if timestamp update fails
    }

    // Generate JWT Token
    const token = jwt.sign({ 
      id: user.id, 
      email: user.email, 
      firstname: user.firstname,
      lastname: user.lastname,
      companyid: user.companyid
    }, process.env.JWT_SECRET, { expiresIn: '1h' });

    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("🔥 API Error:", error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}