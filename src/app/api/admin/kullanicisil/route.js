// app/api/admin/kullanicisil/route.js
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
        JSON.stringify({ 
          error: "Invalid token", 
          details: err.message,
          tokenInfo: { 
            provided: !!token,
            length: token?.length || 0
          }
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const adminUserId = decoded.id;

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse request body", 
          details: parseError.message 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const action = body.action;
    if (!action) {
      return new Response(
        JSON.stringify({ error: "Action not specified" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Connect to database
    let pool;
    try {
      pool = await getPool();
    } catch (dbError) {
      return new Response(
        JSON.stringify({ 
          error: "Database connection error", 
          details: dbError.message 
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Retrieve the admin user's company id from dbo.users
    let adminUser;
    try {
      const userResult = await pool
        .request()
        .input("id", sql.Int, adminUserId)
        .query("SELECT companyid FROM dbo.users WHERE id = @id");
      
      adminUser = userResult.recordset[0];
      if (!adminUser) {
        return new Response(
          JSON.stringify({ error: "Admin user not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch (userError) {
      return new Response(
        JSON.stringify({ 
          error: "Failed to retrieve admin user information", 
          details: userError.message 
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const companyId = adminUser.companyid;

    // Handle different actions
    if (action === "search_users") {
      const queryStr = body.query;
      
      try {
        const result = await pool
          .request()
          .input("query", sql.NVarChar, `%${queryStr}%`)
          .input("companyId", sql.Int, companyId)
          .query(`
            SELECT id, firstname, lastname, email
            FROM dbo.users
            WHERE (firstname LIKE @query OR lastname LIKE @query OR email LIKE @query)
            AND companyid = @companyId
            AND id <> ${adminUserId} -- Prevent admin from deleting themselves
            AND user_passive = 0 -- Only show active users
          `);
        
        const users = result.recordset;
        
        return new Response(JSON.stringify({ users }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (searchError) {
        return new Response(
          JSON.stringify({ 
            error: "Kullanıcı arama sırasında hata oluştu", 
            details: searchError.message 
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    } else if (action === "delete_user") {
      const userId = body.user_id;
      
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "User ID not provided" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Prevent admin from deleting themselves
      if (parseInt(userId) === adminUserId) {
        return new Response(
          JSON.stringify({ 
            error: "Kendinizi silemezsiniz", 
            details: "Admin kullanıcılar kendi hesaplarını silemezler." 
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      
      try {
        // First check if the user exists and belongs to the company
        const checkResult = await pool
          .request()
          .input("userId", sql.Int, userId)
          .input("companyId", sql.Int, companyId)
          .query(`
            SELECT COUNT(*) AS userCount
            FROM dbo.users
            WHERE id = @userId AND companyid = @companyId AND user_passive = 0
          `);
        
        if (checkResult.recordset[0].userCount === 0) {
          return new Response(
            JSON.stringify({ 
              error: "Kullanıcı bulunamadı", 
              details: "Bu kullanıcı bulunamadı, pasif durumda veya şirketinize ait değil." 
            }),
            { status: 404, headers: { "Content-Type": "application/json" } }
          );
        }
        
        // Soft delete - update user_passive to 1 instead of deleting
        const updateResult = await pool
          .request()
          .input("userId", sql.Int, userId)
          .input("companyId", sql.Int, companyId)
          .query(`
            UPDATE dbo.users
            SET user_passive = 1
            WHERE id = @userId AND companyid = @companyId
          `);
        
        if (updateResult.rowsAffected[0] === 0) {
          return new Response(
            JSON.stringify({ 
              error: "Kullanıcı silinemedi", 
              details: "Kullanıcı pasif hale getirilemedi."
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
        
        return new Response(
          JSON.stringify({ message: "Kullanıcı başarıyla silindi." }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      } catch (deleteError) {
        return new Response(
          JSON.stringify({ 
            error: "Kullanıcı silme hatası", 
            details: deleteError.message 
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ 
          error: "Geçersiz işlem", 
          details: `Action "${action}" is not supported.` 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("API error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Server error", 
        details: error.message 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}