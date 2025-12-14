// app/api/admin/kullaniciguncelle/route.js
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
      console.error("❌ DB CONNECTION ERROR:", dbError.message);
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
          `);
        
        const users = result.recordset;
   
        
        return new Response(JSON.stringify({ users }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (searchError) {
        console.error("❌ SEARCH ERROR:", searchError.message);
        return new Response(
          JSON.stringify({ 
            error: "Kullanıcı arama sırasında hata oluştu", 
            details: searchError.message 
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    if (action === "get_user_details") {
      const userId = body.user_id;
  
      
      try {
        const result = await pool
          .request()
          .input("userId", sql.Int, userId)
          .input("companyId", sql.Int, companyId)
          .query(`
            SELECT firstname, lastname, email, bolge, sehir, iskolu, bolum, birim, takim
            FROM dbo.users 
            WHERE id = @userId AND companyid = @companyId
          `);
        
        const user = result.recordset[0];
        if (!user) {
  
          return new Response(
            JSON.stringify({ 
              error: "Kullanıcı bulunamadı", 
              details: "Bu ID'ye sahip bir kullanıcı bulunamadı veya bu şirkete ait değil." 
            }),
            { status: 404, headers: { "Content-Type": "application/json" } }
          );
        }
        
 
        return new Response(JSON.stringify({ user }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (detailsError) {
        console.error("❌ USER DETAILS ERROR:", detailsError.message);
        return new Response(
          JSON.stringify({ 
            error: "Kullanıcı bilgileri alınırken hata oluştu", 
            details: detailsError.message 
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    if (action === "update_user") {
      const userId = body.user_id;
      const updated = body.updated_data;
      

      
      // Perform validations
      const requiredFields = ['firstname', 'lastname', 'email'];
      const missingFields = requiredFields.filter(field => !updated[field]);
      
      if (missingFields.length > 0) {
     
        return new Response(
          JSON.stringify({ 
            error: "Missing required fields", 
            details: `The following fields are required: ${missingFields.join(', ')}` 
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      try {
        // Check if email already exists for a different user
        const emailCheckResult = await pool.request()
          .input("email", sql.NVarChar, updated.email)
          .input("userId", sql.Int, userId)
          .input("companyId", sql.Int, companyId)
          .query(`
            SELECT COUNT(*) AS count 
            FROM dbo.users 
            WHERE email = @email AND id != @userId AND companyid = @companyId
          `);
        
        if (emailCheckResult.recordset[0].count > 0) {
      
          return new Response(
            JSON.stringify({ error: "Bu email adresi başka bir kullanıcı tarafından kullanılıyor." }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        
        // Perform the update
     
        
        const result = await pool
          .request()
          .input("firstname", sql.NVarChar, updated.firstname)
          .input("lastname", sql.NVarChar, updated.lastname)
          .input("email", sql.NVarChar, updated.email)
          .input("bolge", sql.NVarChar, updated.bolge || "")
          .input("sehir", sql.NVarChar, updated.sehir || "")
          .input("iskolu", sql.NVarChar, updated.iskolu || "")
          .input("bolum", sql.NVarChar, updated.bolum || "")
          .input("birim", sql.NVarChar, updated.birim || "")
          .input("takim", sql.NVarChar, updated.takim || "")
          .input("userId", sql.Int, userId)
          .input("companyId", sql.Int, companyId)
          .query(`
            UPDATE dbo.users 
            SET firstname = @firstname, lastname = @lastname, email = @email, 
                bolge = @bolge, sehir = @sehir, iskolu = @iskolu, 
                bolum = @bolum, birim = @birim, takim = @takim
            WHERE id = @userId AND companyid = @companyId
          `);
          
        if (result.rowsAffected[0] === 0) {
      
          return new Response(
            JSON.stringify({ 
              error: "Kullanıcı bulunamadı veya güncellenemedi",
              details: "Kullanıcı bulunamadı veya herhangi bir değişiklik yapılmadı."
            }),
            { status: 404, headers: { "Content-Type": "application/json" } }
          );
        }
        
        
        return new Response(
          JSON.stringify({ message: "Kullanıcı bilgileri başarıyla güncellendi." }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      } catch (updateError) {
       
        return new Response(
          JSON.stringify({ 
            error: "Kullanıcı güncellenirken hata oluştu", 
            details: updateError.message 
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }
    
    // If action is not recognized
    
    return new Response(
      JSON.stringify({ error: "Geçersiz işlem", details: `Action "${action}" is not supported.` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    
    return new Response(
      JSON.stringify({ 
        error: "Server error", 
        details: error.message 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}