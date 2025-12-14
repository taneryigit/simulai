// bu sayfa /api/admin/kullaniciolustur/route.js
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

    // Parse request body
    let body;
    try {
      body = await req.json();
      
    } catch (parseError) {
      console.error("❌ REQUEST BODY PARSE ERROR:", parseError.message);
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse request body", 
          details: parseError.message 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const action = body.action;
    console.log("🎯 ACTION - Requested action:", action);
    const newUserData = body.new_user_data;
    if (!newUserData) {
      return new Response(
        JSON.stringify({ error: "User data not provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate required fields
    const requiredFields = ['firstname', 'lastname', 'email'];
    const missingFields = requiredFields.filter(field => !newUserData[field]);
    
    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields", 
          details: `The following fields are required: ${missingFields.join(', ')}` 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const pool = await getPool();

    // Retrieve the admin user's company info from dbo.users
    const adminResult = await pool.request()
      .input("id", sql.Int, adminUserId)
      .query("SELECT companyid, companyname FROM dbo.users WHERE id = @id");
    
    const adminUser = adminResult.recordset[0];
    if (!adminUser) {
      return new Response(
        JSON.stringify({ error: "Admin user not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const companyId = adminUser.companyid;
    const companyName = adminUser.companyname;

    // Check if email already exists
    const emailCheckResult = await pool.request()
      .input("email", sql.NVarChar, newUserData.email)
      .input("companyId", sql.Int, companyId)
      .query("SELECT COUNT(*) AS count FROM dbo.users WHERE email = @email AND companyid = @companyId");
    
    if (emailCheckResult.recordset[0].count > 0) {
      return new Response(
        JSON.stringify({ error: "Bu email adresi zaten kayıtlı." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

  

    // Insert new user into dbo.users
    try {
      // First, check the users table structure to identify required columns
      const tableInfoResult = await pool.request()
        .query(`
          SELECT COLUMN_NAME, IS_NULLABLE 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'users'
        `);
      
      console.log("Table structure:", tableInfoResult.recordset);
      
      // Get an ID for the new user
      const idResult = await pool.request()
        .query("SELECT ISNULL(MAX(id), 0) + 1 AS next_id FROM dbo.users");
      
      const nextUserId = idResult.recordset[0].next_id;
      
      
      // Prepare the insert statement with more parameters
      await pool.request()
      .input("id", sql.Int, nextUserId)
      .input("firstname", sql.NVarChar, newUserData.firstname)
      .input("lastname", sql.NVarChar, newUserData.lastname)
      .input("email", sql.NVarChar, newUserData.email)
      .input("bolge", sql.NVarChar, newUserData.bolge || "")
      .input("sehir", sql.NVarChar, newUserData.sehir || "")
      .input("iskolu", sql.NVarChar, newUserData.iskolu || "")
      .input("bolum", sql.NVarChar, newUserData.bolum || "")
      .input("birim", sql.NVarChar, newUserData.birim || "")
      .input("takim", sql.NVarChar, newUserData.takim || "")
      .input("companyId", sql.Int, companyId)
      .input("companyName", sql.NVarChar, companyName)
      // Add these three new inputs
      .input("admin", sql.Bit, 0)
      .input("user_company_passive", sql.Bit, 0)
      .input("user_passive", sql.Bit, 0)
      .query(`
        INSERT INTO dbo.users 
          (id, firstname, lastname, email, bolge, sehir, iskolu, bolum, birim, takim, companyid, companyname, 
          admin, user_company_passive, user_passive)
        VALUES 
          (@id, @firstname, @lastname, @email, @bolge, @sehir, @iskolu, @bolum, @birim, @takim, @companyId, @companyName,
          @admin, @user_company_passive, @user_passive)
      `);

      return new Response(
        JSON.stringify({ message: "Yeni kullanıcı başarıyla oluşturuldu." }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (dbError) {
      console.error("Database insertion error:", dbError);
      return new Response(
        JSON.stringify({ 
          error: "Kullanıcı veritabanına eklenirken hata oluştu.", 
          details: dbError.message 
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("API error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Sunucu hatası", 
        details: error.message 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}