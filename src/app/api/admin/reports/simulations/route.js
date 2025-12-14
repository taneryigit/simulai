// app/api/admin/reports/simulations/route.js
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
    
    // Process simulation reports with filters
    return await getSimulationReports(pool, companyId, { classId, courseId, startDate, endDate });
    
  } catch (error) {
    console.error("Simulations API error:", error);
    return new Response(
      JSON.stringify({ error: "Server error", details: error.message }),
      { status: 500 }
    );
  }
}

// Function to get simulation reports with filtering
async function getSimulationReports(pool, companyId, filters) {
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
    courseCondition = "kc.course_id = @courseId";
    request.input("courseId", sql.Int, parseInt(courseId));
  }
  
  if (startDate && endDate) {
    dateCondition = "(kc.created_at BETWEEN @startDate AND @endDate)";
    request.input("startDate", sql.DateTime, new Date(startDate));
    request.input("endDate", sql.DateTime, new Date(endDate));
  } else if (startDate) {
    dateCondition = "kc.created_at >= @startDate";
    request.input("startDate", sql.DateTime, new Date(startDate));
  } else if (endDate) {
    dateCondition = "kc.created_at <= @endDate";
    request.input("endDate", sql.DateTime, new Date(endDate));
  }
  
  // Prepare the reports data object
  const reportsData = {
    simulationPerformance: [], // Simülasyon bazında performans analizi
    skillPerformance: [], // Anahtar beceri performans analizi
    simulationSkillAnalysis: [], // Simülasyon beceri analizi
  };
  
  // 1. Get simulation performance analysis with filters - ✅ UPDATED TO USE CENTRALIZED SIMULATIONS TABLE
  const simulationPerformanceResult = await request
    .query(`
      SELECT 
        kc.simulasyon_name,
        s.simulasyon_showname,
        COUNT(kc.id) AS tamamlamaSayisi,
        AVG(CAST(kc.toplam_puan AS FLOAT)) AS ortalamaPuan,
        STDEV(CAST(kc.toplam_puan AS FLOAT)) AS puanStandartSapmasi,
        MIN(kc.toplam_puan) AS minimumPuan,
        MAX(kc.toplam_puan) AS maksimumPuan
      FROM 
        keyzpage_score kc
      LEFT JOIN 
        [dbo].[simulations] s ON kc.simulasyon_name = s.simulasyon_name
      JOIN
        users u ON kc.user_id = u.id
      LEFT JOIN
        enrol e ON kc.user_id = e.user_id AND kc.course_id = e.course_id
      WHERE
        u.companyid = @companyId AND
        ${courseCondition} AND
        ${classCondition} AND
        ${dateCondition}
      GROUP BY 
        kc.simulasyon_name, s.simulasyon_showname
      ORDER BY 
        tamamlamaSayisi DESC
    `);
  
  reportsData.simulationPerformance = simulationPerformanceResult.recordset;
  
  // 2. Get key skill performance analysis with filters
  const skillPerformanceResult = await request
    .query(`
      WITH PuanListesi AS (
        SELECT 1 AS puanNo UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION
        SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
      )
      SELECT 
        'Beceri ' + CAST(p.puanNo AS VARCHAR) AS beceriAdi,
        COUNT(*) AS toplamDegerlendirme,
        AVG(CAST(
          CASE p.puanNo
            WHEN 1 THEN kc.puan1
            WHEN 2 THEN kc.puan2
            WHEN 3 THEN kc.puan3
            WHEN 4 THEN kc.puan4
            WHEN 5 THEN kc.puan5
            WHEN 6 THEN kc.puan6
            WHEN 7 THEN kc.puan7
            WHEN 8 THEN kc.puan8
            WHEN 9 THEN kc.puan9
            WHEN 10 THEN kc.puan10
          END AS FLOAT)) AS ortalamaPuan,
        STDEV(CAST(
          CASE p.puanNo
            WHEN 1 THEN kc.puan1
            WHEN 2 THEN kc.puan2
            WHEN 3 THEN kc.puan3
            WHEN 4 THEN kc.puan4
            WHEN 5 THEN kc.puan5
            WHEN 6 THEN kc.puan6
            WHEN 7 THEN kc.puan7
            WHEN 8 THEN kc.puan8
            WHEN 9 THEN kc.puan9
            WHEN 10 THEN kc.puan10
          END AS FLOAT)) AS standartSapma,
        COUNT(CASE p.puanNo
          WHEN 1 THEN kc.puan1
          WHEN 2 THEN kc.puan2
          WHEN 3 THEN kc.puan3
          WHEN 4 THEN kc.puan4
          WHEN 5 THEN kc.puan5
          WHEN 6 THEN kc.puan6
          WHEN 7 THEN kc.puan7
          WHEN 8 THEN kc.puan8
          WHEN 9 THEN kc.puan9
          WHEN 10 THEN kc.puan10
        END) * 100.0 / COUNT(*) AS doldurulmaPuani
      FROM 
        PuanListesi p
      CROSS JOIN 
        keyzpage_score kc
      JOIN
        users u ON kc.user_id = u.id
      LEFT JOIN
        enrol e ON kc.user_id = e.user_id AND kc.course_id = e.course_id
      WHERE
        u.companyid = @companyId AND
        ${courseCondition} AND
        ${classCondition} AND
        ${dateCondition}
      GROUP BY 
        p.puanNo
      HAVING 
        COUNT(CASE p.puanNo
          WHEN 1 THEN kc.puan1
          WHEN 2 THEN kc.puan2
          WHEN 3 THEN kc.puan3
          WHEN 4 THEN kc.puan4
          WHEN 5 THEN kc.puan5
          WHEN 6 THEN kc.puan6
          WHEN 7 THEN kc.puan7
          WHEN 8 THEN kc.puan8
          WHEN 9 THEN kc.puan9
          WHEN 10 THEN kc.puan10
        END) > 0
      ORDER BY 
        p.puanNo
    `);
  
  reportsData.skillPerformance = skillPerformanceResult.recordset;
  
  // 3. Get simulation skill analysis with filters - ✅ UPDATED TO USE CENTRALIZED SIMULATIONS TABLE
  const simulationSkillAnalysisResult = await request
    .query(`
      WITH SimulasyonBecerileri AS (
        SELECT 
          ks.simulasyon_name,
          CASE WHEN COUNT(ks.puan1) > 0 THEN 1 ELSE 0 END AS hasPuan1,
          CASE WHEN COUNT(ks.puan2) > 0 THEN 1 ELSE 0 END AS hasPuan2,
          CASE WHEN COUNT(ks.puan3) > 0 THEN 1 ELSE 0 END AS hasPuan3,
          CASE WHEN COUNT(ks.puan4) > 0 THEN 1 ELSE 0 END AS hasPuan4,
          CASE WHEN COUNT(ks.puan5) > 0 THEN 1 ELSE 0 END AS hasPuan5,
          CASE WHEN COUNT(ks.puan6) > 0 THEN 1 ELSE 0 END AS hasPuan6,
          CASE WHEN COUNT(ks.puan7) > 0 THEN 1 ELSE 0 END AS hasPuan7,
          CASE WHEN COUNT(ks.puan8) > 0 THEN 1 ELSE 0 END AS hasPuan8,
          CASE WHEN COUNT(ks.puan9) > 0 THEN 1 ELSE 0 END AS hasPuan9,
          CASE WHEN COUNT(ks.puan10) > 0 THEN 1 ELSE 0 END AS hasPuan10,
          AVG(CAST(COALESCE(ks.puan1, 0) AS FLOAT)) AS avgPuan1,
          AVG(CAST(COALESCE(ks.puan2, 0) AS FLOAT)) AS avgPuan2,
          AVG(CAST(COALESCE(ks.puan3, 0) AS FLOAT)) AS avgPuan3,
          AVG(CAST(COALESCE(ks.puan4, 0) AS FLOAT)) AS avgPuan4,
          AVG(CAST(COALESCE(ks.puan5, 0) AS FLOAT)) AS avgPuan5,
          AVG(CAST(COALESCE(ks.puan6, 0) AS FLOAT)) AS avgPuan6,
          AVG(CAST(COALESCE(ks.puan7, 0) AS FLOAT)) AS avgPuan7,
          AVG(CAST(COALESCE(ks.puan8, 0) AS FLOAT)) AS avgPuan8,
          AVG(CAST(COALESCE(ks.puan9, 0) AS FLOAT)) AS avgPuan9,
          AVG(CAST(COALESCE(ks.puan10, 0) AS FLOAT)) AS avgPuan10,
          AVG(CAST(ks.toplam_puan AS FLOAT)) AS avgTotalPuan,
          COUNT(*) AS simulasyonSayisi
        FROM 
          keyzpage_score ks
        JOIN
          users u ON ks.user_id = u.id
        LEFT JOIN
          enrol e ON ks.user_id = e.user_id AND ks.course_id = e.course_id
        WHERE
          u.companyid = @companyId AND
          ${courseCondition} AND
          ${classCondition} AND
          ${dateCondition}
        GROUP BY 
          ks.simulasyon_name
      )
      SELECT 
        sb.simulasyon_name,
        s.simulasyon_showname,
        sb.simulasyonSayisi,
        sb.hasPuan1, sb.hasPuan2, sb.hasPuan3, sb.hasPuan4, sb.hasPuan5, 
        sb.hasPuan6, sb.hasPuan7, sb.hasPuan8, sb.hasPuan9, sb.hasPuan10,
        CASE WHEN sb.hasPuan1 = 1 THEN sb.avgPuan1 ELSE NULL END AS avgPuan1,
        CASE WHEN sb.hasPuan2 = 1 THEN sb.avgPuan2 ELSE NULL END AS avgPuan2,
        CASE WHEN sb.hasPuan3 = 1 THEN sb.avgPuan3 ELSE NULL END AS avgPuan3,
        CASE WHEN sb.hasPuan4 = 1 THEN sb.avgPuan4 ELSE NULL END AS avgPuan4,
        CASE WHEN sb.hasPuan5 = 1 THEN sb.avgPuan5 ELSE NULL END AS avgPuan5,
        CASE WHEN sb.hasPuan6 = 1 THEN sb.avgPuan6 ELSE NULL END AS avgPuan6,
        CASE WHEN sb.hasPuan7 = 1 THEN sb.avgPuan7 ELSE NULL END AS avgPuan7,
        CASE WHEN sb.hasPuan8 = 1 THEN sb.avgPuan8 ELSE NULL END AS avgPuan8,
        CASE WHEN sb.hasPuan9 = 1 THEN sb.avgPuan9 ELSE NULL END AS avgPuan9,
        CASE WHEN sb.hasPuan10 = 1 THEN sb.avgPuan10 ELSE NULL END AS avgPuan10,
        sb.avgTotalPuan,
        sb.hasPuan1 + sb.hasPuan2 + sb.hasPuan3 + sb.hasPuan4 + sb.hasPuan5 + 
        sb.hasPuan6 + sb.hasPuan7 + sb.hasPuan8 + sb.hasPuan9 + sb.hasPuan10 AS toplamBeceriSayisi
      FROM 
        SimulasyonBecerileri sb
      LEFT JOIN 
        [dbo].[simulations] s ON sb.simulasyon_name = s.simulasyon_name
      ORDER BY 
        sb.simulasyonSayisi DESC
    `);
  
  reportsData.simulationSkillAnalysis = simulationSkillAnalysisResult.recordset;
  
  // Return the reports data
  return new Response(
    JSON.stringify(reportsData),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}