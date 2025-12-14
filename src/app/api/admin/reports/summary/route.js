// app/api/admin/reports/summary/route.js
import { validateUserAccess, createApiResponse } from "@/lib/reports/commonApi";
import sql from "mssql";

export async function GET(req) {
  try {
    // Validate user access
    const auth = await validateUserAccess(req);
    if (!auth.success) {
      return createApiResponse({ error: auth.error }, auth.status);
    }
    
    const { pool, companyId } = auth;
    
    // Parse query parameters for filters
    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    
    // Base SQL condition for date filtering
    let dateCondition = "1=1";
    
    // Create request object
    const request = pool.request()
      .input("companyId", sql.Int, companyId);
    
    // Add date filters if provided
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
      summary: {},
      monthlySimulation: [],
      popularCourses: [],
      popularSimulations: [],
      courseParticipation: []
    };
    
    // 1. Get summary metrics for the company
    const summaryResult = await request
      .query(`
        SELECT 
          (SELECT COUNT(*) FROM courses 
           WHERE companyid = @companyId AND (course_passive = 0 OR course_passive IS NULL)) AS aktifKursSayisi,
          
          (SELECT COUNT(*) FROM users 
           WHERE companyid = @companyId AND (user_passive = 0 OR user_passive IS NULL)) AS aktifKullaniciSayisi,
          
          (SELECT COUNT(*) FROM enrol 
           WHERE companyid = @companyId AND (course_user_passive = 0 OR course_user_passive IS NULL)) AS aktifKayitSayisi,
          
          (SELECT COUNT(DISTINCT thread_id) FROM keyzpage_score 
           WHERE user_id IN (SELECT id FROM users WHERE companyid = @companyId)
           ${startDate || endDate ? `AND ${dateCondition}` : ''}) AS tamamlananSimulasyonSayisi
      `);
    
    if (summaryResult.recordset.length > 0) {
      reportsData.summary = summaryResult.recordset[0];
    }
    
    // 2. Get monthly simulation activity
    const monthlySimulationResult = await request
      .query(`
        SELECT 
          FORMAT(ks.created_at, 'yyyy-MM') AS ay,
          COUNT(DISTINCT ks.thread_id) AS simulasyonSayisi,
          COUNT(DISTINCT ks.user_id) AS katilimciSayisi,
          AVG(CAST(ks.toplam_puan AS FLOAT)) AS ortalamaPuan
        FROM 
          keyzpage_score ks
        JOIN
          users u ON ks.user_id = u.id
        WHERE
          u.companyid = @companyId AND
          ${dateCondition}
        GROUP BY 
          FORMAT(ks.created_at, 'yyyy-MM')
        ORDER BY 
          ay
      `);
    
    reportsData.monthlySimulation = monthlySimulationResult.recordset;
    
    // 3. Get popular courses
    const popularCoursesResult = await request
      .query(`
        SELECT TOP 5
          c.course_name as name,
          COUNT(DISTINCT ks.thread_id) AS kayitSayisi,
          COUNT(DISTINCT ks.user_id) AS kullaniciSayisi
        FROM 
          courses c
        JOIN 
          keyzpage_score ks ON c.course_id = ks.course_id
        JOIN
          users u ON ks.user_id = u.id
        WHERE 
          c.companyid = @companyId AND
          u.companyid = @companyId AND
          (c.course_passive = 0 OR c.course_passive IS NULL) AND
          ${dateCondition}
        GROUP BY 
          c.course_id, c.course_name
        ORDER BY 
          kayitSayisi DESC
      `);
    
    reportsData.popularCourses = popularCoursesResult.recordset;
    
    // 4. Get popular simulations - ✅ UPDATED TO USE CENTRALIZED SIMULATIONS TABLE
    const popularSimulationsResult = await request
      .query(`
        WITH CourseSimulationMap AS (
          SELECT 
            c.course_id,
            c.companyid,
            sim.simulasyon_name
          FROM 
            courses c
          CROSS APPLY (VALUES
            (c.simulasyon_table_name_1),
            (c.simulasyon_table_name_2),
            (c.simulasyon_table_name_3),
            (c.simulasyon_table_name_4),
            (c.simulasyon_table_name_5),
            (c.simulasyon_table_name_6),
            (c.simulasyon_table_name_7),
            (c.simulasyon_table_name_8),
            (c.simulasyon_table_name_9),
            (c.simulasyon_table_name_10)
          ) AS sim(simulasyon_name)
          WHERE 
            sim.simulasyon_name IS NOT NULL 
            AND sim.simulasyon_name <> ''
            AND c.companyid = @companyId
            AND (c.course_passive = 0 OR c.course_passive IS NULL)
        ),
        SimulationAssignments AS (
          SELECT 
            csm.simulasyon_name,
            COUNT(DISTINCT e.user_id) AS atanmaSayisi
          FROM 
            CourseSimulationMap csm
          JOIN 
            enrol e ON csm.course_id = e.course_id
          WHERE 
            e.companyid = @companyId
            AND (e.course_user_passive = 0 OR e.course_user_passive IS NULL)
          GROUP BY 
            csm.simulasyon_name
        )
        SELECT TOP 5
          s.simulasyon_name AS name,
          s.simulasyon_showname AS showName,
          COUNT(DISTINCT ks.thread_id) AS kullanilmaSayisi,
          COUNT(DISTINCT ks.user_id) AS kullaniciSayisi,
          COALESCE(sa.atanmaSayisi, 0) AS atanmaSayisi,
          AVG(CAST(ks.toplam_puan AS FLOAT)) AS ortalamaPuan
        FROM 
          [dbo].[simulations] s
        JOIN 
          keyzpage_score ks ON s.simulasyon_name = ks.simulasyon_name
        JOIN
          users u ON ks.user_id = u.id
        LEFT JOIN
          SimulationAssignments sa ON s.simulasyon_name = sa.simulasyon_name
        WHERE
          u.companyid = @companyId AND
          ${dateCondition}
        GROUP BY 
          s.simulasyon_name,
          s.simulasyon_showname,
          sa.atanmaSayisi
        ORDER BY 
          kullanilmaSayisi DESC
      `);

    reportsData.popularSimulations = popularSimulationsResult.recordset;

    
    // 5. Get course participation data
    const courseParticipationResult = await request
      .query(`
        SELECT 
          c.course_name as name,
          COUNT(DISTINCT u.id) AS katilimciSayisi,
          CAST(COUNT(DISTINCT u.id) AS FLOAT) / 
          NULLIF((SELECT COUNT(*) FROM users WHERE companyid = @companyId AND (user_passive = 0 OR user_passive IS NULL)), 0) * 100 AS katilimOrani
        FROM 
          courses c
        LEFT JOIN 
          keyzpage_score ks ON c.course_id = ks.course_id
        LEFT JOIN
          users u ON ks.user_id = u.id AND u.companyid = @companyId
        WHERE 
          c.companyid = @companyId AND
          (c.course_passive = 0 OR c.course_passive IS NULL) AND
          ${dateCondition}
        GROUP BY 
          c.course_id, c.course_name
        ORDER BY 
          katilimOrani DESC
      `);
    
    reportsData.courseParticipation = courseParticipationResult.recordset;
    
    return createApiResponse(reportsData);
  } catch (error) {
    console.error("Summary reports API error:", error);
    return createApiResponse(
      { error: "Server error", details: error.message }, 
      500
    );
  }
}