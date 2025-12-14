import { getPool } from "@/lib/db";
import sql from "mssql";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    // Verify JWT token from Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Token missing" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Invalid token", details: err.message }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const adminUserId = decoded.id;

    const body = await req.json();
    const action = body.action;
    if (!action) {
      return new Response(
        JSON.stringify({ error: "Action not specified" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const pool = await getPool();

    // Retrieve the admin user's company id from dbo.users
    const userResult = await pool
      .request()
      .input("id", sql.Int, adminUserId)
      .query("SELECT companyid FROM dbo.users WHERE id = @id");
    const adminUser = userResult.recordset[0];
    if (!adminUser) {
      return new Response(
        JSON.stringify({ error: "Admin user not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const companyId = adminUser.companyid;

    if (action === "search_courses") {
      const queryStr = body.query;
      const result = await pool
        .request()
        .input("query", sql.NVarChar, `%${queryStr}%`)
        .input("companyId", sql.Int, companyId)
        .query(`
          SELECT DISTINCT class_name 
          FROM dbo.enrol 
          WHERE class_name LIKE @query AND companyid = @companyId
        `);
      const courses = result.recordset.map((row) => row.class_name);
      return new Response(JSON.stringify({ courses }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else if (action === "delete_class") {
      const className = body.class_name;
      await pool
        .request()
        .input("className", sql.NVarChar, className)
        .input("companyId", sql.Int, companyId)
        .query(`
          DELETE FROM dbo.enrol 
          WHERE class_name = @className AND companyid = @companyId
        `);
      return new Response(
        JSON.stringify({ message: "Sınıf ve tüm katılımcıları başarıyla silindi." }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Geçersiz işlem" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("API error:", error);
    return new Response(
      JSON.stringify({ error: "Server error", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
