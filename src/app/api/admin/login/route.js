//route.js for admin login bu sayfa  /api/admin/login
import { getPool } from "@/lib/db";
import sql from "mssql";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Ensure your JWT secret is defined in your environment variables
const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Eksik e-posta veya şifre" }),
        { status: 400 }
      );
    }

    const pool = await getPool();

    // Query the new "users" table (note the table name update)
    const result = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query("SELECT * FROM dbo.users WHERE email = @email");

    const user = result.recordset[0];

    // If user not found or password does not match
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return new Response(
        JSON.stringify({ error: "Hatalı e-posta veya şifre" }),
        { status: 401 }
      );
    }

// Check if user is admin
if (user.admin !== true) {
  return new Response(
    JSON.stringify({ error: "Yetkisiz erişim: Yönetici değilsiniz" }),
    { status: 403 }
  );
}

    // Update login timestamps:
    // Assumes that the users table has columns "current_login" and "last_login"
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

    // Generate JWT token
    const tokenPayload = {
      id: user.id,
      email: user.email,
      admin: user.admin,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "1h" });

    return new Response(
      JSON.stringify({ token, message: "Giriş başarılı" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Login error:", error);
    return new Response(
      JSON.stringify({ error: "Giriş sırasında hata oluştu", details: error.message }),
      { status: 500 }
    );
  }
}
