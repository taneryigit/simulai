// app/api/admin/process_excel/route.js
import { getPool } from "@/lib/db";
import sql from "mssql";
import jwt from "jsonwebtoken";
import * as XLSX from 'xlsx';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    // Validate authorization
    const authorization = req.headers.get('authorization');
    if (!authorization) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: No token provided" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Extract and verify token
    const token = authorization.split(" ")[1];
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token format" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Decode token and get user ID
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch  {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const userId = decoded.id;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: User ID missing" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Get database connection
    const pool = await getPool();
    
    // Get user's company ID
    const userResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query("SELECT companyid FROM dbo.users WHERE id = @userId");
    
    if (userResult.recordset.length === 0) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const companyId = userResult.recordset[0].companyid;
    
    // Process form data
    const formData = await req.formData();
    const file = formData.get('file');
    const courseId = formData.get('course_id');
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file uploaded" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Process Excel file
    let emails = [];
    try {
      // Get file buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Parse workbook
      const workbook = XLSX.read(buffer, { 
        type: 'buffer',
        cellDates: true,
      });
      
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Extract emails
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      
      // Filter out email addresses from all cells
      // This mimics the PHP version that searches for emails anywhere in the Excel
      for (const row of jsonData) {
        for (const key in row) {
          const value = String(row[key]).trim();
          if (value.includes('@') && value.includes('.') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            emails.push(value.toLowerCase());
          }
        }
      }
      
      // Remove duplicates
      emails = [...new Set(emails)];
      
      if (emails.length === 0) {
        return new Response(
          JSON.stringify({ error: "No valid email addresses found in Excel file" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch (error) {
      console.error("Excel processing error:", error);
      return new Response(
        JSON.stringify({ error: "Error processing Excel file", details: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Look up users by email
    try {
      // Create placeholders for SQL query
      const placeholders = emails.map((_, i) => `@email${i}`).join(',');
      
      // Create base query similar to PHP version
      let query = `
        SELECT u.id, u.firstname, u.lastname, u.email`;
      
      // Add enrollment check if courseId is provided
      if (courseId) {
        query += `, e.class_name, e.course_id`;
      }
      
      query += ` FROM dbo.users u `;
      
      // Join with enrollment if courseId provided
      if (courseId) {
        query += `LEFT JOIN dbo.enrol e ON u.id = e.user_id AND e.course_id = @courseId `;
      }
      
      query += `WHERE u.email IN (${placeholders}) AND u.companyid = @companyId`;
      
      // Prepare and execute query
      const request = pool.request()
        .input('companyId', sql.Int, companyId);
      
      // Add courseId parameter if provided
      if (courseId) {
        request.input('courseId', sql.Int, parseInt(courseId));
      }
      
      // Add email parameters
      emails.forEach((email, i) => {
        request.input(`email${i}`, sql.NVarChar, email);
      });
      
      const result = await request.query(query);
      const users = result.recordset;
      
      // Track which emails were matched
      const matchedEmails = users.map(user => user.email.toLowerCase());
      
      // Find unmatched emails
      const unmatchedEmails = emails.filter(email => !matchedEmails.includes(email.toLowerCase()));
      
      // Separate users based on enrollment status (similar to PHP)
      const newUsers = [];
      const existingUsers = [];
      
      users.forEach(user => {
        if (courseId && user.course_id) {
          existingUsers.push(user);
        } else {
          newUsers.push(user);
        }
      });
      
      // Return success response
      return new Response(
        JSON.stringify({
          success: true,
          new_users: newUsers,
          existing_users: existingUsers,
          unmatched_emails: unmatchedEmails,
          data: jsonData // Include raw data as well
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Database error", details: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({ error: "Server error", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}