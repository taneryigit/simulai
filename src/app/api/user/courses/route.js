import { getPool } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    

    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const decoded = verifyToken(token);
  

    if (!decoded || !decoded.id) {
 
      return new Response(JSON.stringify({ error: "Invalid Token" }), { status: 401 });
    }

    const userId = decoded.id;
  

    const pool = await getPool();
  

    // Fetch user info and company logo
    const userResult = await pool.request()
      .input("userId", userId)
      .query(`
        SELECT u.firstname, u.lastname, u.email, c.company_logo
        FROM [users] u
        JOIN [companyinfo] c ON u.companyid = c.companyid
        WHERE u.id = @userId
      `);

    const user = userResult.recordset[0];

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }



    const courseResult = await pool.request()
      .input("userId", userId)
      .query(`
        SELECT 
          e.course_id, 
          c.course_name, 
          c.course_logo, 
          c.course_info, 
          c.start_date, 
          c.end_date 
        FROM [enrol] e
        JOIN [courses] c ON e.course_id = c.course_id
        WHERE e.user_id = @userId AND e.course_user_passive = 0
      `);

   

    return new Response(JSON.stringify({
      user: user,
      courses: courseResult.recordset,
    }), { status: 200 });

  } catch {
 
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
