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

    const simulationTableNames = Object.values(courseResult.recordset[0]).filter(Boolean);

    if (simulationTableNames.length === 0) {
      return new Response(JSON.stringify({ simulations: [] }), { status: 200 });
    }

    // ✅ Query centralized simulations table using the table names
    const placeholders = simulationTableNames.map((_, index) => `@tableName${index}`).join(', ');
    const simulationQuery = `
      SELECT satir_id, simulasyon_name, assistant_id, images_folder, detail, 
             simulasyon_showname, instructions, simulation_type, voice_code
      FROM [dbo].[simulations]
      WHERE simulasyon_name IN (${placeholders})
      ORDER BY satir_id
    `;

    const request = pool.request();
    simulationTableNames.forEach((tableName, index) => {
      request.input(`tableName${index}`, tableName);
    });

    const simulationResult = await request.query(simulationQuery);

    return new Response(JSON.stringify({ simulations: simulationResult.recordset }), { status: 200 });
  } catch (error) {
    console.error("Error fetching simulations:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}