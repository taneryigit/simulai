//bu sayfa app/api/admin/katilimcieklecikart/route.js
import { getPool } from "@/lib/db";
import sql from "mssql";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    // Verify JWT token from Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Token missing" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return new Response(JSON.stringify({ error: "Invalid token", details: err.message }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    const userId = decoded.id;

    // Get request data
    const body = await req.json();
    const action = body.action;
    if (!action) {
      return new Response(JSON.stringify({ error: "Action not specified" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const pool = await getPool();

    // Retrieve the user's company id from dbo.users
    const userResult = await pool
      .request()
      .input("id", sql.Int, userId)
      .query("SELECT companyid FROM dbo.users WHERE id = @id");
    const user = userResult.recordset[0];
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }
    const companyId = user.companyid;

    // Process actions
    if (action === "search_courses") {
      const queryStr = body.query;
      const result = await pool
        .request()
        .input("query", sql.NVarChar, `%${queryStr}%`)
        .input("companyId", sql.Int, companyId)
        .query("SELECT DISTINCT class_name FROM dbo.enrol WHERE class_name LIKE @query AND companyid = @companyId");
      const courses = result.recordset.map((course) => course.class_name);
      return new Response(JSON.stringify({ courses }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "search_users") {
      const queryStr = body.query;
      const courseName = body.course_name;
      const result = await pool
        .request()
        .input("query", sql.NVarChar, `%${queryStr}%`)
        .input("companyId", sql.Int, companyId)
        .input("courseName", sql.NVarChar, courseName)
        .query(`
          SELECT DISTINCT e.user_id, u.firstname, u.lastname, u.email
          FROM dbo.enrol e
          INNER JOIN dbo.users u ON e.user_id = u.id
          WHERE (u.firstname LIKE @query OR u.lastname LIKE @query)
          AND e.companyid = @companyId
          AND e.class_name = @courseName
        `);
      const users = result.recordset.map((user) => ({
        id: user.user_id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
      }));
      return new Response(JSON.stringify({ users }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "search_users_to_add") {
      const queryStr = body.query;
      const courseName = body.course_name;
      const result = await pool
        .request()
        .input("companyId", sql.Int, companyId)
        .input("query", sql.NVarChar, `%${queryStr}%`)
        .input("courseName", sql.NVarChar, courseName)
        .query(`
          SELECT DISTINCT u.id, u.firstname, u.lastname, u.email  
          FROM dbo.users u 
          WHERE u.companyid = @companyId 
          AND (u.firstname LIKE @query OR u.lastname LIKE @query)
          AND u.id NOT IN (
              SELECT user_id 
              FROM dbo.enrol 
              WHERE class_name = @courseName 
              AND companyid = @companyId
          )
        `);
      const users = result.recordset.map((user) => ({
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
      }));
      return new Response(JSON.stringify({ users }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Simplified removal logic for "remove_users" action
    if (action === "remove_users") {
      const userIds = body.user_ids;
      const courseName = body.course_name;
      
      console.log("Remove users action started:", {
        userIds,
        courseName,
        companyId
      });
      
      // Keep track of successful deletions
      let successCount = 0;
      let errorMessages = [];
      
      try {
        // Instead of explicit transaction, use individual deletes
        for (const userId of userIds) {
          try {
            // Convert userId to integer if it's coming as a string
            const userIdInt = parseInt(userId, 10);
            
            console.log(`Attempting to delete user ID: ${userIdInt} from class: ${courseName}, company: ${companyId}`);
            
            // Execute the deletion directly without explicit transaction
            const deleteResult = await pool
              .request()
              .input("userId", sql.Int, userIdInt)
              .input("className", sql.NVarChar, courseName)
              .input("companyId", sql.Int, companyId)
              .query(`
                DELETE FROM dbo.enrol 
                WHERE user_id = @userId 
                AND class_name = @className 
                AND companyid = @companyId
              `);
            
            // Check if rows were affected
            const rowsAffected = deleteResult.rowsAffected[0];
            console.log(`Deletion result: ${rowsAffected} rows affected`);
            
            if (rowsAffected > 0) {
              successCount++;
            } else {
              errorMessages.push(`Kullanıcı ID ${userIdInt} için kayıt bulunamadı.`);
            }
          } catch (userError) {
            console.error(`Error deleting user ID ${userId}:`, userError);
            errorMessages.push(`Kullanıcı ID ${userId} silinemedi: ${userError.message}`);
          }
        }
        
        // Prepare response based on results
        if (successCount > 0) {
          let message = `${successCount} katılımcı başarıyla çıkartıldı.`;
          if (errorMessages.length > 0) {
            message += ` ${errorMessages.length} katılımcı çıkartılamadı.`;
          }
          
          return new Response(
            JSON.stringify({ 
              message: message,
              successCount: successCount,
              failureCount: errorMessages.length,
              errors: errorMessages.length > 0 ? errorMessages : undefined
            }), 
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } else {
          return new Response(
            JSON.stringify({ 
              error: "Hiçbir katılımcı çıkartılamadı.", 
              details: errorMessages 
            }), 
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
      } catch (e) {
        // Handle unexpected errors
        console.error("Error removing users:", e);
        
        return new Response(
          JSON.stringify({ 
            error: "Katılımcılar çıkartılırken bir hata oluştu.", 
            details: e.message,
            stack: e.stack
          }), 
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // FIXED: add_users process with improved error handling and logic
    if (action === "add_users") {
      const userIds = body.user_ids;
      const courseName = body.course_name;
      
      console.log("Add users action started with the following data:", {
        userIds: JSON.stringify(userIds),
        courseName,
        companyId
      });
      
      // Keep track of successful additions and errors
      let successCount = 0;
      let errorMessages = [];
      
      try {
        // Check if userIds is an array and has elements
        if (!Array.isArray(userIds) || userIds.length === 0) {
          console.error("No valid user IDs provided:", userIds);
          return new Response(JSON.stringify({ 
            error: "Hata: Geçerli kullanıcı seçilmedi.",
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        
        // Get class reference data
        const classResult = await pool
          .request()
          .input("courseName", sql.NVarChar, courseName)
          .input("companyId", sql.Int, companyId)
          .query(`
            SELECT TOP 1 
              class_name, 
              course_id, 
              course_name, 
              class_start_date, 
              class_end_date 
            FROM dbo.enrol 
            WHERE class_name = @courseName 
            AND companyid = @companyId
          `);
        
        if (classResult.recordset.length === 0) {
          console.error(`Class reference not found: ${courseName}`);
          return new Response(JSON.stringify({ 
            error: "Hata: Sınıf referansı bulunamadı. Lütfen önce sınıfı seçin."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        
        const classReference = classResult.recordset[0];
        console.log("Class reference:", JSON.stringify(classReference));
        
        // Process each user
        for (const userId of userIds) {
          try {
            const userIdInt = parseInt(userId, 10);
            
            if (isNaN(userIdInt)) {
              errorMessages.push(`Geçersiz kullanıcı ID: ${userId}`);
              continue;
            }
            
            // Get user details
            const userResult = await pool
              .request()
              .input("userId", sql.Int, userIdInt)
              .input("companyId", sql.Int, companyId)
              .query(`
                SELECT id, firstname, lastname 
                FROM dbo.users 
                WHERE id = @userId 
                AND companyid = @companyId
              `);
            
            if (userResult.recordset.length === 0) {
              errorMessages.push(`Kullanıcı bulunamadı: ID ${userIdInt}`);
              continue;
            }
            
            const user = userResult.recordset[0];
            
            // Check if user is already enrolled
            const enrollCheck = await pool
              .request()
              .input("userId", sql.Int, userIdInt)
              .input("className", sql.NVarChar, courseName)
              .input("companyId", sql.Int, companyId)
              .query(`
                SELECT COUNT(*) AS enrolled 
                FROM dbo.enrol 
                WHERE user_id = @userId 
                AND class_name = @className 
                AND companyid = @companyId
              `);
            
            if (enrollCheck.recordset[0].enrolled > 0) {
              errorMessages.push(`Kullanıcı zaten kayıtlı: ${user.firstname} ${user.lastname}`);
              continue;
            }
            
            // Get next enrol_id value
            const nextIdResult = await pool
              .request()
              .query(`
                SELECT ISNULL(MAX(enrol_id), 0) + 1 AS next_id 
                FROM dbo.enrol
              `);
            
            const nextEnrolId = nextIdResult.recordset[0].next_id;
            console.log(`Generated next enrol_id: ${nextEnrolId}`);
            
            // Insert new enrollment with the generated enrol_id
            await pool
              .request()
              .input("enrolId", sql.Int, nextEnrolId)
              .input("userId", sql.Int, userIdInt)
              .input("firstname", sql.NVarChar, user.firstname)
              .input("lastname", sql.NVarChar, user.lastname)
              .input("courseId", sql.Int, classReference.course_id)
              .input("courseName", sql.NVarChar, classReference.course_name)
              .input("className", sql.NVarChar, classReference.class_name)
              .input("classStartDate", sql.DateTime, classReference.class_start_date)
              .input("classEndDate", sql.DateTime, classReference.class_end_date)
              .input("companyId", sql.Int, companyId)
              .query(`
                INSERT INTO dbo.enrol (
                  enrol_id,
                  user_id, 
                  firstname, 
                  lastname, 
                  course_id, 
                  course_name, 
                  class_name, 
                  class_start_date, 
                  class_end_date, 
                  companyid
                ) VALUES (
                  @enrolId,
                  @userId,
                  @firstname,
                  @lastname,
                  @courseId,
                  @courseName,
                  @className,
                  @classStartDate,
                  @classEndDate,
                  @companyId
                )
              `);
            
            successCount++;
          } catch (userError) {
            console.error(`Error processing user ID ${userId}:`, userError);
            errorMessages.push(`İşlem hatası: ${userError.message}`);
          }
        }
        
        // Return response
        if (successCount > 0) {
          let message = `${successCount} katılımcı başarıyla eklendi.`;
          if (errorMessages.length > 0) {
            message += ` ${errorMessages.length} katılımcı eklenemedi.`;
          }
          
          return new Response(
            JSON.stringify({ 
              message: message,
              successCount: successCount,
              failureCount: errorMessages.length,
              errors: errorMessages.length > 0 ? errorMessages : undefined
            }), 
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } else {
          return new Response(
            JSON.stringify({ 
              error: "Hiçbir katılımcı eklenemedi.",
              details: errorMessages 
            }), 
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
      } catch (error) {
        console.error("Add users error:", error);
        return new Response(
          JSON.stringify({ 
            error: "Katılımcılar eklenirken bir hata oluştu.",
            details: error.message
          }), 
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(JSON.stringify({ error: "Geçersiz işlem" }), { status: 400, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("API error:", error);
    return new Response(JSON.stringify({ error: "Server error", details: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}