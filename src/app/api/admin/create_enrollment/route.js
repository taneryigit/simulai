import { getPool } from "@/lib/db";
import sql from "mssql";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    // Validate authorization
    const authorization = req.headers.get("authorization");
    if (!authorization) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: No token provided" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Extract token
    const token = authorization.split(" ")[1];
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token format" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch  {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Get admin user ID from token for auditing purposes
    const adminUserId = decoded.id;
    console.log(`Admin user ID ${adminUserId} is creating enrollments`);
    
    // Parse request body
    const body = await req.json();
    const { records } = body;
    
    if (!records || !Array.isArray(records) || records.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid enrollment data" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Connect to database
    const pool = await getPool();
    
    // Get the current max ID
    const maxIdResult = await pool.request().query('SELECT MAX(enrol_id) as max_id FROM dbo.enrol');
    let nextId = 1;
    if (maxIdResult.recordset[0].max_id) {
      nextId = maxIdResult.recordset[0].max_id + 1;
    }
    
    // Process enrollments
    let insertedCount = 0;
    let errorCount = 0;
    let errors = [];
    
    for (const record of records) {
      try {
        // Insert with explicit ID
        const currentId = nextId++;
        await pool.request()
          .input('enrol_id', sql.Int, currentId)
          .input('companyid', sql.Int, record.companyid || 1)
          .input('course_id', sql.Int, record.course_id)
          .input('course_name', sql.NVarChar(255), record.course_name || '')
          .input('class_name', sql.NVarChar(255), record.class_name || '')
          .input('start_date', sql.DateTime, record.class_start_date || null)
          .input('end_date', sql.DateTime, record.class_end_date || null)
          .input('user_id', sql.Int, record.user_id)
          .input('firstname', sql.NVarChar(125), record.firstname || '')
          .input('lastname', sql.NVarChar(255), record.lastname || '')
          .input('course_user_passive', sql.Bit, record.course_user_passive || 0)
          .query(`
            INSERT INTO dbo.enrol (
              enrol_id, companyid, course_id, course_name, class_name,
              class_start_date, class_end_date, user_id, firstname, lastname, course_user_passive
            )
            VALUES (
              @enrol_id, @companyid, @course_id, @course_name, @class_name,
              @start_date, @end_date, @user_id, @firstname, @lastname, @course_user_passive
            )
          `);
        
        insertedCount++;
      } catch (error) {
        console.error(`Error inserting record:`, error);
        console.error(`Problem record:`, JSON.stringify(record));
        errorCount++;
        errors.push({ record: record, error: error.message });
      }
    }
    
    // Return results
    return new Response(
      JSON.stringify({
        success: insertedCount > 0,
        message: `İşlem tamamlandı: ${insertedCount} kayıt başarılı, ${errorCount} kayıt başarısız.`,
        inserted: insertedCount,
        errors: errorCount,
        errorDetails: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}