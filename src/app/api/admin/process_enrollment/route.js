// app/api/admin/process_enrollment/route.js
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
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: "Unauthorized: Invalid token", 
          details: error.message,
          tokenInfo: { 
            provided: !!token,
            length: token?.length || 0
          }
        }),
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
    
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (formError) {
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse request body", 
          details: formError.message 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const { records, selected_users, course_id, course_name, class_name, start_date, end_date, companyid } = body;
    
    // Handle PHP-style format or direct records format
    let enrollmentRecords = [];
    
    if (records && Array.isArray(records)) {
      // Format directly matches our expected structure
      enrollmentRecords = records;
    } else if (selected_users && Array.isArray(selected_users)) {
      // PHP-style format needs conversion
      if (!course_id || !class_name) {
        return new Response(
          JSON.stringify({ error: "Missing required enrollment data" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Will fetch user details below
      enrollmentRecords = []; // To be filled after user details fetch
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid enrollment data format" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Get database connection
    const pool = await getPool();
    
    // Get user's company ID if not provided
    let userCompanyId;
    if (!companyid) {
      const userResult = await pool.request()
        .input('userId', sql.Int, userId)
        .query("SELECT companyid FROM dbo.users WHERE id = @userId");
      
      if (userResult.recordset.length === 0) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
      
      userCompanyId = userResult.recordset[0].companyid;
    } else {
      userCompanyId = companyid;
    }
    
    // If using PHP-style format, fetch user details
    if (selected_users && selected_users.length > 0) {
      // Create placeholders for user IDs
      const placeholders = selected_users.map((_, i) => `@userId${i}`).join(',');
      
      // Query user details
      const request = pool.request();
      
      // Add parameters for each user ID
      selected_users.forEach((id, i) => {
        request.input(`userId${i}`, sql.Int, parseInt(id));
      });
      
      const userQuery = `
        SELECT id, companyid, firstname, lastname 
        FROM dbo.users 
        WHERE id IN (${placeholders})
      `;
      
      const userResult = await request.query(userQuery);
      const users = userResult.recordset;
      
      if (users.length === 0) {
        return new Response(
          JSON.stringify({ error: "No valid users found" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Format enrollment records based on user details (like in PHP)
      enrollmentRecords = users.map(user => ({
        enrol_id: null, // Will be generated in the query
        companyid: userCompanyId,
        course_id: parseInt(course_id),
        course_name: course_name,
        class_name: class_name,
        class_start_date: start_date || null,
        class_end_date: end_date || null,
        user_id: user.id,
        firstname: user.firstname,
        lastname: user.lastname
      }));
    }
    
    try {
      // Begin a transaction
      const transaction = new sql.Transaction(pool);
      await transaction.begin();


            
      // Check for existing enrollments (similar to PHP)
      const userIds = enrollmentRecords.map(record => record.user_id);
      const courseIds = [...new Set(enrollmentRecords.map(record => record.course_id))];
      
      // Only check if we have both user IDs and course IDs
      let existingEnrollments = [];
      if (userIds.length > 0 && courseIds.length > 0) {
        // Create placeholders
        const userPlaceholders = userIds.map((_, i) => `@userId${i}`).join(',');
        const coursePlaceholders = courseIds.map((_, i) => `@courseId${i}`).join(',');
        
        // Create request
        const checkRequest = new sql.Request(transaction);
        
        // Add parameters
        userIds.forEach((id, i) => {
          checkRequest.input(`userId${i}`, sql.Int, id);
        });
        
        courseIds.forEach((id, i) => {
          checkRequest.input(`courseId${i}`, sql.Int, id);
        });
        
        // Execute query
        const checkQuery = `
          SELECT user_id, course_id
          FROM dbo.enrol
          WHERE user_id IN (${userPlaceholders})
          AND course_id IN (${coursePlaceholders})
        `;
        
        const checkResult = await checkRequest.query(checkQuery);
        existingEnrollments = checkResult.recordset;
        
        // Add this missing code:
        const existingMap = new Map();
        existingEnrollments.forEach(enroll => {
          const key = `${enroll.user_id}_${enroll.course_id}`;
          existingMap.set(key, true);
        });
      }
      
      // Convert to a lookup structure for quick checking
      let nextId = 1;
      try {
        const maxIdQuery = await pool.request().query('SELECT MAX(enrol_id) as max_id FROM dbo.enrol');
        if (maxIdQuery.recordset[0].max_id) {
          nextId = maxIdQuery.recordset[0].max_id + 1;
        }
      } catch (error) {
        console.error("Error getting max enrol_id:", error);
        // If we can't get the max ID, we'll use 1 as a fallback
      }
      
      console.log(`Starting with nextId: ${nextId}`);
      console.log(`Processing ${enrollmentRecords.length} records`);
      
      let insertedCount = 0;
      let updatedCount = 0;
      
      // Process each enrollment record
      for (const record of enrollmentRecords) {
        try {
          console.log(`Processing record for user_id: ${record.user_id}`);
          
          // Check if the record already exists (user already enrolled in this course)
          const checkRequest = pool.request();
          const checkResult = await checkRequest
            .input('user_id', sql.Int, record.user_id)
            .input('course_id', sql.Int, record.course_id)
            .query(`
              SELECT COUNT(*) as count
              FROM dbo.enrol
              WHERE user_id = @user_id AND course_id = @course_id
            `);
          
          const exists = checkResult.recordset[0].count > 0;
          
          if (exists) {
            console.log(`Record exists for user_id ${record.user_id}, updating`);
            
            // Update existing enrollment
            const updateRequest = pool.request();
            await updateRequest
              .input('class_name', sql.NVarChar(255), record.class_name || '')
              .input('start_date', sql.DateTime, record.class_start_date || null)
              .input('end_date', sql.DateTime, record.class_end_date || null)
              .input('course_name', sql.NVarChar(255), record.course_name || '')
              .input('user_id', sql.Int, record.user_id)
              .input('course_id', sql.Int, record.course_id)
              .query(`
                UPDATE dbo.enrol
                SET class_name = @class_name,
                    class_start_date = @start_date,
                    class_end_date = @end_date,
                    course_name = @course_name
                WHERE user_id = @user_id AND course_id = @course_id
              `);
            
            updatedCount++;
          } else {
            console.log(`Creating new record for user_id ${record.user_id} with enrol_id ${nextId}`);
            
            // Insert new enrollment with explicit ID
            const insertRequest = pool.request();
            const currentId = nextId++;  // Get current ID and increment for next use
            
            // Ensure all required fields have non-NULL values based on schema
            await insertRequest
              .input('enrol_id', sql.Int, currentId)
              .input('companyid', sql.Int, record.companyid || userCompanyId)
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
          }
        } catch (recordError) {
          console.error(`Error processing record for user_id ${record.user_id}:`, recordError);
          console.error(`Problematic record:`, JSON.stringify(record));
          // Continue with next record instead of failing the entire batch
        }
      }
      
      // Commit the transaction
      await transaction.commit();
      
      // Return success response (similar to PHP)
      return new Response(
        JSON.stringify({
          success: true,
          message: `İşlem tamamlandı: ${insertedCount} yeni kayıt, ${updatedCount} güncelleme yapıldı.`,
          inserted: insertedCount,
          updated: updatedCount
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
      
    } catch (error) {
      console.error("Database error:", error);
      
      // Try to rollback if possible
      if (transaction) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          console.error("Rollback error:", rollbackError);
        }
      }
      
      return new Response(
        JSON.stringify({ error: error.message, details: "Database error during enrollment" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
  } catch (error) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}