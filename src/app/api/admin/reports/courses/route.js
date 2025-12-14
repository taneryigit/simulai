// app/api/admin/reports/courses/route.js
import { getPool } from "@/lib/db";
import sql from "mssql";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(req) {
  try {
    // Parse query parameters
    const url = new URL(req.url);
    const classId = url.searchParams.get("classId");
    const courseId = url.searchParams.get("courseId");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    
    // Retrieve the token from the Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Token missing" }),
        { status: 401 }
      );
    }
    
    const token = authHeader.split(" ")[1];
    let decoded;
    
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Invalid token", details: err.message }),
        { status: 401 }
      );
    }
    
    const userId = decoded.id;
    
    // Get database connection
    const pool = await getPool();
    
    // Get user company info
    const userResult = await pool
      .request()
      .input("id", sql.Int, userId)
      .query("SELECT companyid, admin FROM dbo.users WHERE id = @id");
    
    if (userResult.recordset.length === 0) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404 }
      );
    }
    
    const user = userResult.recordset[0];
    const companyId = user.companyid;
    
    // Check admin privileges
    if (!user.admin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Admin privileges required" }),
        { status: 403 }
      );
    }
    
    // Process course reports with filters
    return await getCourseReports(pool, companyId, { classId, courseId, startDate, endDate });
    
  } catch (error) {
    console.error("Courses API error:", error);
    return new Response(
      JSON.stringify({ error: "Server error", details: error.message }),
      { status: 500 }
    );
  }
}

// Function to get course reports with filtering
async function getCourseReports(pool, companyId, filters) {
  const { classId, courseId, startDate, endDate } = filters;
  
  // Base SQL conditions for filters
  let classCondition = "1=1";
  let courseCondition = "1=1";
  let dateCondition = "1=1";
  
  // Create request object
  const request = pool.request()
    .input("companyId", sql.Int, companyId);
  
  // Add filters if provided
  if (classId) {
    classCondition = "e.class_id = @classId";
    request.input("classId", sql.Int, parseInt(classId));
  }
  
  if (courseId) {
    courseCondition = "e.course_id = @courseId";
    request.input("courseId", sql.Int, parseInt(courseId));
  }
  
  if (startDate && endDate) {
    dateCondition = "(ks.created_at BETWEEN @startDate AND @endDate)";
    request.input("startDate", sql.DateTime, new Date(startDate));
    request.input("endDate", sql.DateTime, new Date(endDate));
  } else if (startDate) {
    dateCondition = "ks.created_at >= @startDate";
    request.input("startDate", sql.DateTime, new Date(startDate));
  } else if (endDate) {
    dateCondition = "ks.created_at <= @endDate";
    request.input("endDate", sql.DateTime, new Date(endDate));
  }
  
  // Prepare the reports data object
  const reportsData = {
    coursePerformance: [], // Kurs bazında performans analizi
    courseTimePerformance: [], // Zaman içindeki performans değişimi
    classList: [], // Sınıf listesi raporu
    nonParticipatingUsers: [], // Eğitim almayan katılımcılar raporu
    classPerformance: [], // Sınıf bazlı performans analizi 
    classDetailReport: [] // Sınıf detay raporu
  };
  
  // 1. Get course performance analysis with filters
  const coursePerformanceResult = await request
    .query(`
      SELECT 
        c.course_id,
        c.course_name,
        COUNT(DISTINCT kc.user_id) AS tamamlayanKullaniciSayisi,
        COUNT(kc.id) AS toplamSimulasyonSayisi,
        AVG(CAST(kc.toplam_puan AS FLOAT)) AS ortalamaPuan,
        MIN(kc.toplam_puan) AS minimumPuan,
        MAX(kc.toplam_puan) AS maksimumPuan
      FROM 
        courses c
      JOIN
        enrol e ON c.course_id = e.course_id
      LEFT JOIN 
        keyzpage_score kc ON c.course_id = kc.course_id AND e.user_id = kc.user_id
      WHERE
        c.companyid = @companyId AND
        ${courseCondition} AND
        ${classCondition} AND
        ${dateCondition}
      GROUP BY 
        c.course_id, c.course_name
      ORDER BY 
        ortalamaPuan DESC
    `);
  
  reportsData.coursePerformance = coursePerformanceResult.recordset;
  
  // 2. Get course performance over time with filters
  const courseTimePerformanceResult = await request
    .query(`
      SELECT 
        c.course_id,
        c.course_name,
        FORMAT(kc.created_at, 'yyyy-MM') AS ay,
        AVG(CAST(kc.toplam_puan AS FLOAT)) AS ortalamaPuan,
        COUNT(kc.id) AS degerlendirmeSayisi
      FROM 
        courses c
      JOIN
        enrol e ON c.course_id = e.course_id
      JOIN 
        keyzpage_score kc ON c.course_id = kc.course_id AND e.user_id = kc.user_id
      JOIN
        users u ON kc.user_id = u.id
      WHERE
        c.companyid = @companyId AND
        u.companyid = @companyId AND
        ${courseCondition} AND
        ${classCondition} AND
        ${dateCondition}
      GROUP BY 
        c.course_id, c.course_name, FORMAT(kc.created_at, 'yyyy-MM')
      ORDER BY 
        c.course_id, ay
    `);
  
  reportsData.courseTimePerformance = courseTimePerformanceResult.recordset;
  
  // 3. Get class list report with filters
  const classFilterCondition = classId ? "e.class_id = @classId" : "1=1";
  const courseFilterCondition = courseId ? "e.course_id = @courseId" : "1=1";
  
  const classListResult = await request
    .query(`
      SELECT 
        e.class_id,
        e.class_name,
        c.course_name,
        e.class_start_date AS sinifBaslangicTarihi,
        e.class_end_date AS sinifBitisTarihi,
        COUNT(DISTINCT e.user_id) AS kayitliKullaniciSayisi,
        (SELECT COUNT(DISTINCT ks.user_id) 
         FROM keyzpage_score ks 
         JOIN enrol e2 ON ks.user_id = e2.user_id AND ks.course_id = e2.course_id
         WHERE e2.class_id = e.class_id AND ${dateCondition}) AS katilimGosterenKullaniciSayisi
      FROM 
        enrol e
      JOIN 
        courses c ON e.course_id = c.course_id
      WHERE 
        e.companyid = @companyId AND
        (e.course_user_passive = 0 OR e.course_user_passive IS NULL) AND
        e.class_id IS NOT NULL AND
        ${classFilterCondition} AND
        ${courseFilterCondition}
      GROUP BY 
        e.class_id, e.class_name, c.course_name, e.class_start_date, e.class_end_date
      ORDER BY 
        e.class_start_date DESC
    `);
  
  reportsData.classList = classListResult.recordset;
  
  // 4. Get non-participating users report with filters
  const nonParticipatingUsersResult = await request
    .query(`
      SELECT 
        e.class_id,
        e.class_name,
        c.course_name,
        u.firstname + ' ' + u.lastname AS kullaniciAdi,
        u.email,
        e.class_start_date AS sinifBaslangicTarihi,
        e.class_end_date AS sinifBitisTarihi
      FROM 
        enrol e
      JOIN 
        courses c ON e.course_id = c.course_id
      JOIN 
        users u ON e.user_id = u.id
      LEFT JOIN 
        keyzpage_score ks ON e.user_id = ks.user_id AND e.course_id = ks.course_id
                          AND (${dateCondition})
      WHERE 
        e.companyid = @companyId AND
        (e.course_user_passive = 0 OR e.course_user_passive IS NULL) AND
        e.class_id IS NOT NULL AND
        ${classFilterCondition} AND
        ${courseFilterCondition} AND
        ks.id IS NULL
      ORDER BY 
        e.class_name, u.firstname, u.lastname
    `);
  
  reportsData.nonParticipatingUsers = nonParticipatingUsersResult.recordset;
  
  // 5. Get class performance analysis with filters
  const classPerformanceResult = await request
    .query(`
      SELECT 
        e.class_id,
        e.class_name,
        c.course_name,
        e.class_start_date AS sinifBaslangicTarihi,
        e.class_end_date AS sinifBitisTarihi,
        COUNT(DISTINCT ks.user_id) AS katilimciSayisi,
        COUNT(ks.id) AS tamamlananSimulasyonSayisi,
        AVG(CAST(ks.toplam_puan AS FLOAT)) AS ortalamaPuan,
        MIN(ks.toplam_puan) AS minimumPuan,
        MAX(ks.toplam_puan) AS maksimumPuan
      FROM 
        enrol e
      JOIN 
        courses c ON e.course_id = c.course_id
      JOIN 
        keyzpage_score ks ON e.user_id = ks.user_id AND e.course_id = ks.course_id
      WHERE 
        e.companyid = @companyId AND
        (e.course_user_passive = 0 OR e.course_user_passive IS NULL) AND
        e.class_id IS NOT NULL AND
        ${classFilterCondition} AND
        ${courseFilterCondition} AND
        ${dateCondition}
      GROUP BY 
        e.class_id, e.class_name, c.course_name, e.class_start_date, e.class_end_date
      ORDER BY 
        AVG(CAST(ks.toplam_puan AS FLOAT)) DESC
    `);
  
  reportsData.classPerformance = classPerformanceResult.recordset;
  
  // 6. Get class detail report with filters - ✅ UPDATED TO USE CENTRALIZED SIMULATIONS TABLE
  const classDetailReportResult = await request
    .query(`
      WITH SimulasyonIstatistikleri AS (
        SELECT 
          e.class_id,
          e.class_name,
          c.course_name,
          ks.simulasyon_name,
          s.simulasyon_showname,
          MIN(ks.created_at) AS ilkGirisTarihi,
          MAX(ks.created_at) AS sonGirisTarihi,
          AVG(CAST(ks.toplam_puan AS FLOAT)) AS ortalamaPuan,
          COUNT(ks.id) AS tamamlamaSayisi,
          COUNT(DISTINCT ks.user_id) AS katilimciSayisi
        FROM 
          enrol e
        JOIN 
          courses c ON e.course_id = c.course_id
        JOIN 
          keyzpage_score ks ON e.user_id = ks.user_id AND e.course_id = ks.course_id
        LEFT JOIN 
          [dbo].[simulations] s ON ks.simulasyon_name = s.simulasyon_name
        WHERE 
          e.companyid = @companyId AND
          (e.course_user_passive = 0 OR e.course_user_passive IS NULL) AND
          e.class_id IS NOT NULL AND
          ${classFilterCondition} AND
          ${courseFilterCondition} AND
          ${dateCondition}
        GROUP BY 
          e.class_id, e.class_name, c.course_name, ks.simulasyon_name, s.simulasyon_showname
      )
      SELECT 
        si.class_id,
        si.class_name,
        si.course_name,
        si.simulasyon_name,
        si.simulasyon_showname,
        FORMAT(si.ilkGirisTarihi, 'yyyy-MM-dd HH:mm') AS ilkGirisTarihi,
        FORMAT(si.sonGirisTarihi, 'yyyy-MM-dd HH:mm') AS sonGirisTarihi,
        DATEDIFF(day, si.ilkGirisTarihi, si.sonGirisTarihi) AS gecenGunSayisi,
        si.ortalamaPuan,
        si.tamamlamaSayisi,
        si.katilimciSayisi
      FROM 
        SimulasyonIstatistikleri si
      ORDER BY 
        si.class_name, si.simulasyon_name
    `);
  
  reportsData.classDetailReport = classDetailReportResult.recordset;
  
  // Return the reports data
  return new Response(
    JSON.stringify(reportsData),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}