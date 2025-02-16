import { getPool } from '@/lib/db';
import sql from 'mssql';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const pool = await getPool();

    // 🔹 Escape the 'user' table name using [user] or dbo.[user]
    const result = await pool
      .request()
      .input('email', sql.VarChar, email)
      .query('SELECT id, email, password_hash, firstname, lastname, companyid FROM dbo.[user] WHERE email = @email'); // ✅ FIXED

    if (result.recordset.length === 0) {
      return new Response(JSON.stringify({ error: 'E-posta ya da şifreniz yanlış' }), { status: 401 });
    }

    const user = result.recordset[0];

    // Compare password with hashed password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return new Response(JSON.stringify({ error: 'E-posta ya da şifreniz yanlış' }), { status: 401 });
    }

    // Generate JWT Token with additional user details
    const token = jwt.sign({ 
      id: user.id, 
      email: user.email, 
      firstname: user.firstname,
      lastname: user.lastname,
      companyid: user.companyid
    }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    return new Response(JSON.stringify({ token }), { status: 200 });
  } catch  {
    
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
