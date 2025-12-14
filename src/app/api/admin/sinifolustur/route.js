// app/api/admin/sinifolustur/route.js
import { getPool } from "@/lib/db";
import sql from "mssql";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

// Helper: Validate JWT and return user ID
function validateToken(authorization) {
  if (!authorization) throw new Error("Unauthorized: No token provided");
  const token = authorization.split(" ")[1];
  if (!token) throw new Error("Unauthorized: Invalid token format");
  const decoded = jwt.verify(token, JWT_SECRET);
  if (!decoded.id) throw new Error("Unauthorized: User ID not found in token");
  return decoded.id;
}

export async function GET(req) {
  try {
    // Validate token and get userId
    const authorization = req.headers.get('authorization');
    if (!authorization) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: No token provided" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    let userId;
    try {
      userId = validateToken(authorization);
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Get database connection
    const pool = await getPool();
    
    // Fetch user information
    const userResult = await pool.request()
      .input('id', sql.Int, userId)
      .query("SELECT firstname, lastname, companyid FROM dbo.users WHERE id = @id");
    
    if (userResult.recordset.length === 0) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const user = userResult.recordset[0];
    const companyId = user.companyid;
    
    // Fetch courses for the user's company
    const coursesResult = await pool.request()
      .input('companyid', sql.Int, companyId)
      .query("SELECT course_id, course_name FROM dbo.courses WHERE companyid = @companyid");
    
    const courses = coursesResult.recordset;
    
    // Fetch attribute options like in PHP
    const attributes = ['iskolu', 'bolum', 'bolge', 'sehir', 'birim', 'takim'];
    const options = {};
    
    for (const attribute of attributes) {
      const query = `SELECT DISTINCT ${attribute} FROM dbo.users 
                    WHERE ${attribute} IS NOT NULL 
                    AND companyid = @companyid`;
      
      const result = await pool.request()
        .input('companyid', sql.Int, companyId)
        .query(query);
      
      options[attribute] = result.recordset.map(row => row[attribute]);
    }
    
    // Fetch all users for the same company
    const usersResult = await pool.request()
      .input('companyid', sql.Int, companyId)
      .query("SELECT * FROM dbo.users WHERE companyid = @companyid");
    
    const users = usersResult.recordset;
    
    // Return the data
    return new Response(
      JSON.stringify({
        user,
        courses,
        options,
        users,
        companyId
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function POST(req) {
  try {
    // Validate token and get userId
    const authorization = req.headers.get('authorization');
    if (!authorization) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: No token provided" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    let userId;
    try {
      userId = validateToken(authorization);
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Parse request body
    const body = await req.json();
    const { action, data } = body;
    
    if (!action) {
      return new Response(
        JSON.stringify({ error: "No action specified" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Get database connection
    const pool = await getPool();
    
    // Verify the user exists (but don't store the user info since we don't need it)
    const userResult = await pool.request()
      .input('id', sql.Int, userId)
      .query("SELECT COUNT(*) as userExists FROM dbo.users WHERE id = @id");
    
    if (userResult.recordset[0].userExists === 0) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Handle different actions
    switch (action) {
      case "createClass": {
        // Validate required data
        if (!data || !data.className || !data.courseId) {
          return new Response(
            JSON.stringify({ error: "Missing required class data" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        
        // Get course name
        const courseResult = await pool.request()
          .input('courseId', sql.Int, parseInt(data.courseId))
          .query("SELECT course_name FROM dbo.courses WHERE course_id = @courseId");
          
        if (courseResult.recordset.length === 0) {
          return new Response(
            JSON.stringify({ error: "Course not found" }),
            { status: 404, headers: { "Content-Type": "application/json" } }
          );
        }
        
        const courseName = courseResult.recordset[0].course_name;
        
        // Create a unique ID for the class
        const classId = Date.now() + Math.floor(Math.random() * 1000);
        
        // Return success with the class ID
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Class created successfully", 
            newClass: { 
              id: classId,
              className: data.className,
              courseName: courseName,
              startDate: data.startDate,
              endDate: data.endDate
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}