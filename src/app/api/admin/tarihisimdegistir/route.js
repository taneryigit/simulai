import { getPool } from "@/lib/db";
import sql from "mssql";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    // Verify JWT token from the Authorization header
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

    // Retrieve admin user's company id from dbo.users
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
          SELECT DISTINCT class_name,
                 MIN(class_start_date) AS class_start_date,
                 MAX(class_end_date) AS class_end_date
          FROM dbo.enrol
          WHERE class_name LIKE @query AND companyid = @companyId
          GROUP BY class_name
        `);
      const courses = result.recordset;
      return new Response(
        JSON.stringify({ courses }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else if (action === "update_dates") {
      // Updated parameter names to match frontend
      const { course_name, start_date, end_date } = body;
      if (!course_name || !start_date || !end_date) {
        return new Response(
          JSON.stringify({ error: "Missing required fields for updating dates" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      await pool
        .request()
        .input("newStartDate", sql.DateTime, start_date)
        .input("newEndDate", sql.DateTime, end_date)
        .input("courseName", sql.NVarChar, course_name)
        .input("companyId", sql.Int, companyId)
        .query(`
          UPDATE dbo.enrol
          SET class_start_date = @newStartDate,
              class_end_date = @newEndDate
          WHERE class_name = @courseName AND companyid = @companyId
        `);
      return new Response(
        JSON.stringify({ message: "Tarih güncellemesi başarılı." }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else if (action === "update_class_name") {
      const { old_class_name, new_class_name } = body;
      if (!old_class_name || !new_class_name) {
        return new Response(
          JSON.stringify({ error: "Missing required fields for updating class name" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      await pool
        .request()
        .input("newClassName", sql.NVarChar, new_class_name)
        .input("oldClassName", sql.NVarChar, old_class_name)
        .input("companyId", sql.Int, companyId)
        .query(`
          UPDATE dbo.enrol
          SET class_name = @newClassName
          WHERE class_name = @oldClassName AND companyid = @companyId
        `);
      return new Response(
        JSON.stringify({ message: "Sınıf ismi güncellemesi başarılı." }),
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