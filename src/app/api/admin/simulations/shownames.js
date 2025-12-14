// app/api/admin/simulations/shownames/route.js
import { getPool } from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    // Retrieve the token from the Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized: No token provided" }),
        { status: 401 }
      );
    }
    
    const token = authHeader.split(" ")[1];
    
    try {
      jwt.verify(token, JWT_SECRET);
    } catch {
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized: Invalid token" }),
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await req.json();
    const { tables } = body;
    
    // Validate input - now expecting simulation names instead of table names
    if (!tables || !Array.isArray(tables) || tables.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Bad Request: tables array is required"
        }),
        { status: 400 }
      );
    }
    
    // Get database connection
    const pool = await getPool();
    
    // ✅ Query centralized simulations table instead of individual tables
    const showNames = {};
    
    if (tables.length > 0) {
      // Build IN clause safely (escape single quotes to prevent SQL injection)
      const simulationNamesInClause = tables
        .map(name => `'${name.toString().replace(/'/g, "''")}'`)
        .join(',');
      
      try {
        // Single query to get all simulation show names from centralized table
        const result = await pool.request()
          .query(`
            SELECT simulasyon_name, simulasyon_showname 
            FROM [dbo].[simulations] 
            WHERE simulasyon_name IN (${simulationNamesInClause})
          `);
        
        // Create mapping from results
        result.recordset.forEach(row => {
          showNames[row.simulasyon_name] = row.simulasyon_showname || row.simulasyon_name;
        });
        
        // Add fallback for any simulation names not found in the centralized table
        tables.forEach(simulationName => {
          if (!showNames[simulationName]) {
            showNames[simulationName] = simulationName; // fallback to original name
            console.warn(`Simulation not found in centralized table: ${simulationName}`);
          }
        });
        
        console.log(`✅ Successfully retrieved show names for ${Object.keys(showNames).length} simulations`);
        
      } catch (dbError) {
        console.error("Database error in simulation shownames API:", dbError);
        
        // Fallback: return original names if query fails
        tables.forEach(simulationName => {
          showNames[simulationName] = simulationName;
        });
        
        console.warn("Using fallback simulation names due to database error");
      }
    }
    
    // Return successful response
    return new Response(
      JSON.stringify({
        success: true,
        showNames
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
    
  } catch (error) {
    console.error("Error in simulation shownames API:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Internal Server Error",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      }),
      { status: 500 }
    );
  }
}