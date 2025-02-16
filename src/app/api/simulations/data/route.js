import { getPool } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const simulationName = searchParams.get("simulation");

    if (!courseId || !simulationName) {
     
      return new Response(JSON.stringify({ error: "Missing courseId or simulation name" }), { status: 400 });
    }

    // ✅ Extract and verify token
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
  
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const user = verifyToken(token);
    if (!user) {
    
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
    }

    const pool = await getPool();

    // ✅ Fetch simulation data dynamically from the selected simulation table
    const simulationQuery = `
      SELECT satir_id, simulasyon_name, assistant_id, images_folder, detail, 
             simulasyon_showname, instructions 
      FROM ${simulationName} 
      WHERE simulasyon_name = @simulationName
    `;
    
    const simResult = await pool.request()
      .input("simulationName", simulationName)
      .query(simulationQuery);

    if (!simResult.recordset.length) {
     
      return new Response(JSON.stringify({ error: "Simulation not found" }), { status: 404 });
    }

    // ✅ Fetch user company name
    const userQuery = `SELECT companyid FROM [user] WHERE id = @userId`;
    const userResult = await pool.request()
      .input("userId", user.userId)
      .query(userQuery);

    const companyID = userResult.recordset.length ? userResult.recordset[0].companyid : "Unknown";

    
    return new Response(JSON.stringify({
      simulation: simResult.recordset[0],
      user: { companyid: companyID },
    }), { status: 200 });

  } catch (error) {
    
    return new Response(JSON.stringify({ error: "Internal Server Error", details: error.message }), { status: 500 });
  }
}
