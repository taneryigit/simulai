import { getPool } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return new Response(JSON.stringify({ error: "Invalid Token" }), { status: 401 });

    const userId = decoded.userId;
    const pool = await getPool();

    const result = await pool.request()
      .input("userId", userId)
      .query(`
        SELECT 
          e.course_id, 
          e.course_name, 
          c.course_logo, 
          c.course_info, 
          c.start_date, 
          c.end_date 
        FROM [enrol] e
        JOIN [courses] c ON e.course_id = c.course_id
        WHERE e.user_id = @userId AND e.course_user_passive = 0
      `);

    return new Response(JSON.stringify(result.recordset), { status: 200 });
  } catch  {
    
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
