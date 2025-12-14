// app/api/admin/kullaniciolusturexcel/route.js
import { getPool } from "@/lib/db";
import sql from "mssql";
import jwt from "jsonwebtoken";
import * as XLSX from "xlsx";


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
          details: err.message
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const adminUserId = decoded.id;

    // Process form data and file upload
    const formData = await req.formData();
    const action = formData.get('action');
    
    if (action !== 'upload_excel') {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const excelFile = formData.get('excel_file');
    
    if (!excelFile) {
      return new Response(
        JSON.stringify({ 
          error: "Excel file not provided",
          details: "Lütfen geçerli bir Excel dosyası yükleyin." 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Check if it's a valid file object
    if (!(excelFile instanceof Blob)) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid file format",
          details: "Yüklenen dosya geçerli değil." 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Process the Excel file directly without saving to disk
    const arrayBuffer = await excelFile.arrayBuffer();
    
    // Read the Excel file directly from memory
    let workbook;
    try {
      // Use XLSX.read with arrayBuffer instead of XLSX.readFile
      workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    } catch (excelError) {
      return new Response(
        JSON.stringify({ 
          error: "Excel dosyası açılamadı", 
          details: excelError.message 
        }),
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

    // Retrieve the admin user's company info from dbo.users
    let adminUser;
    try {
      const adminResult = await pool
        .request()
        .input("id", sql.Int, adminUserId)
        .query("SELECT companyid, companyname FROM dbo.users WHERE id = @id");
      
      adminUser = adminResult.recordset[0];
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
    const companyName = adminUser.companyname;
    
    // Get first sheet from workbook
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Remove header row if present
    if (rows.length > 0) {
      rows.shift();
    }

    const duplicateUsers = [];
    const addedUsers = [];
    let successCount = 0;

    // Process each row
    try {
      for (const row of rows) {
        // Skip if row is empty (check first three columns)
        if (!row[0] && !row[1] && !row[2]) continue;
        
        const firstname = String(row[0] || "").trim();
        const lastname = String(row[1] || "").trim();
        const email = String(row[2] || "").trim();
        
        // Skip if any required field is missing
        if (!firstname || !lastname || !email) continue;
        
        // Other columns: bolge (3), sehir (4), iskolu (5), bolum (6), birim (7), takim (8)
        const bolge = String(row[3] || "").trim();
        const sehir = String(row[4] || "").trim();
        const iskolu = String(row[5] || "").trim();
        const bolum = String(row[6] || "").trim();
        const birim = String(row[7] || "").trim();
        const takim = String(row[8] || "").trim();

        // Check if user already exists (by email)
        const checkStmt = await pool
          .request()
          .input("email", sql.NVarChar, email)
          .input("companyId", sql.Int, companyId)
          .query("SELECT firstname, lastname, email FROM dbo.users WHERE email = @email AND companyid = @companyId");
        
        if (checkStmt.recordset.length > 0) {
          duplicateUsers.push({ firstname, lastname, email });
          continue;
        }

        // Get next ID for the user
        const idResult = await pool
          .request()
          .query("SELECT ISNULL(MAX(id), 0) + 1 AS next_id FROM dbo.users");
      
        const nextUserId = idResult.recordset[0].next_id;

        // Insert new user with default values for system fields
        await pool
          .request()
          .input("id", sql.Int, nextUserId)
          .input("firstname", sql.NVarChar, firstname)
          .input("lastname", sql.NVarChar, lastname)
          .input("email", sql.NVarChar, email)
          .input("bolge", sql.NVarChar, bolge || "")
          .input("sehir", sql.NVarChar, sehir || "")
          .input("iskolu", sql.NVarChar, iskolu || "")
          .input("bolum", sql.NVarChar, bolum || "")
          .input("birim", sql.NVarChar, birim || "")
          .input("takim", sql.NVarChar, takim || "")
          .input("companyId", sql.Int, companyId)
          .input("companyName", sql.NVarChar, companyName)
          .input("admin", sql.Bit, 0)
          .input("user_company_passive", sql.Bit, 0)
          .input("user_passive", sql.Bit, 0)
          .query(`
            INSERT INTO dbo.users 
              (id, firstname, lastname, email, bolge, sehir, iskolu, bolum, birim, takim, 
              companyid, companyname, admin, user_company_passive, user_passive)
            VALUES 
              (@id, @firstname, @lastname, @email, @bolge, @sehir, @iskolu, @bolum, @birim, @takim, 
              @companyId, @companyName, @admin, @user_company_passive, @user_passive)
          `);
          
        addedUsers.push({ firstname, lastname, email });
        successCount++;
      }
    } catch (processError) {
      return new Response(
        JSON.stringify({ 
          error: "Excel verileri işlenirken hata oluştu", 
          details: processError.message 
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build a success message
    let success_message = `Toplam ${successCount} kullanıcı başarıyla eklendi.`;
    if (duplicateUsers.length > 0) {
      success_message += ` ${duplicateUsers.length} kullanıcı zaten sistemde kayıtlı.`;
    }

    return new Response(
      JSON.stringify({
        success_message,
        added_users: addedUsers,
        duplicate_users: duplicateUsers,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Excel upload error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Excel dosyası işlenirken hata oluştu", 
        details: error.message 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}