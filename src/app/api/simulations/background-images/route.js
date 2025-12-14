// app/api/simulations/background-images/route.js
import { promises as fs } from "fs";
import path from "path";
import { getPool } from "@/lib/db";
import sql from "mssql";

export async function GET(req) {
  try {
    // Extract simulation name from query
    const { searchParams } = new URL(req.url);
    const simulationName = searchParams.get("simulation");

    if (!simulationName) {
      return new Response(JSON.stringify({ error: "Missing simulation name" }), { status: 400 });
    }

    // ✅ Query centralized simulations table to get the images_folder
    const pool = await getPool();
    let imagesFolderPath = `images/simulasyon/${simulationName}`; // fallback to standard path
    
    try {
      const result = await pool.request()
        .input("simulationName", sql.NVarChar, simulationName)
        .query(`
          SELECT TOP 1 images_folder 
          FROM [dbo].[simulations] 
          WHERE simulasyon_name = @simulationName
        `);
      
      if (result.recordset.length > 0 && result.recordset[0].images_folder) {
        imagesFolderPath = result.recordset[0].images_folder;
        console.log(`Found images_folder for ${simulationName}: ${imagesFolderPath}`);
      } else {
        console.warn(`No images_folder found for simulation: ${simulationName}, using fallback path: ${imagesFolderPath}`);
      }
    } catch (dbError) {
      console.error("Database error while fetching images_folder:", dbError);
      console.warn(`Using fallback path: ${imagesFolderPath}`);
      // Continue with fallback path
    }

    // ✅ Construct path: public/{images_folder}/background
    const folderPath = path.join(process.cwd(), "public", imagesFolderPath, "background");

    console.log(`Looking for background images in: ${folderPath}`);

    // Read the directory contents
    const files = await fs.readdir(folderPath);

    // Filter only image files
    const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));

    console.log(`Found ${imageFiles.length} background images for simulation: ${simulationName}`);

    return new Response(JSON.stringify({ 
      images: imageFiles,
      folderPath: imagesFolderPath,
      simulationName: simulationName
    }), { status: 200 });
    
  } catch (error) {
    console.error("Error retrieving background images:", error);
    return new Response(JSON.stringify({ 
      error: "Could not retrieve background images",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }), { status: 500 });
  }
}