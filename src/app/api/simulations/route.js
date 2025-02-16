//src/app/api/simulations/route.js
import { getPool } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req) {
  
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return new Response(JSON.stringify({ error: "Course ID is required" }), { status: 400 });
    }

    // ✅ Extract and verify token
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const user = verifyToken(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
    }

    const pool = await getPool();

    // ✅ Get simulation table names from the `courses` table
    const courseQuery = `
      SELECT simulasyon_table_name_1, simulasyon_table_name_2, simulasyon_table_name_3, simulasyon_table_name_4, 
             simulasyon_table_name_5, simulasyon_table_name_6, simulasyon_table_name_7, simulasyon_table_name_8,
             simulasyon_table_name_9, simulasyon_table_name_10
      FROM courses WHERE course_id = @courseId
    `;

    const courseResult = await pool.request().input("courseId", courseId).query(courseQuery);
    if (!courseResult.recordset.length) {
      return new Response(JSON.stringify({ error: "Course not found" }), { status: 404 });
    }

    const simulationTables = Object.values(courseResult.recordset[0]).filter(Boolean);

    // ✅ Fetch simulations from each table dynamically
    let simulations = [];
    for (let tableName of simulationTables) {
      const simulationQuery = `
        SELECT simulasyon_name, simulasyon_showname, images_folder, detail
        FROM ${tableName}
      `;
      const simResult = await pool.request().query(simulationQuery);
      simulations = [...simulations, ...simResult.recordset];
    }

    return new Response(JSON.stringify({ simulations }), { status: 200 });
  } catch  {
 
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}