// app/api/admin/reports/filter-options/route.js
import { validateUserAccess, createApiResponse } from "@/lib/reports/commonApi";

export async function GET(req) {
  try {
    // Validate user access
    const auth = await validateUserAccess(req);
    if (!auth.success) {
      return createApiResponse({ error: auth.error }, auth.status);
    }
    
    const { pool, companyId } = auth;
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "classes";
    
    // Get classes or courses based on type
    if (type === "classes") {
      const classesResult = await pool
        .request()
        .input("companyId", companyId)
        .query(`
          SELECT DISTINCT
            e.class_id,
            e.class_name,
            c.course_id,
            c.course_name,
            e.class_start_date,
            e.class_end_date,
            COUNT(DISTINCT e.user_id) AS kullaniciSayisi
          FROM 
            enrol e
          JOIN 
            courses c ON e.course_id = c.course_id
          WHERE 
            e.companyid = @companyId AND
            (e.course_user_passive = 0 OR e.course_user_passive IS NULL) AND
            e.class_id IS NOT NULL
          GROUP BY
            e.class_id, e.class_name, c.course_id, c.course_name, e.class_start_date, e.class_end_date
          ORDER BY 
            e.class_name
        `);
      
      return createApiResponse(classesResult.recordset);
    } else if (type === "courses") {
      const coursesResult = await pool
        .request()
        .input("companyId", companyId)
        .query(`
          SELECT 
            course_id,
            course_name,
            start_date,
            end_date
          FROM 
            courses
          WHERE 
            companyid = @companyId AND
            (course_passive = 0 OR course_passive IS NULL)
          ORDER BY 
            course_name
        `);
      
      return createApiResponse(coursesResult.recordset);
    } else {
      return createApiResponse({ error: "Invalid filter type" }, 400);
    }
  } catch (error) {
    console.error("Filter options API error:", error);
    return createApiResponse(
      { error: "Server error", details: error.message }, 
      500
    );
  }
}