import { promises as fs } from "fs";
import path from "path";

export async function GET(req) {
  try {
    // Extract simulation name from query
    const { searchParams } = new URL(req.url);
    const simulationName = searchParams.get("simulation");

    if (!simulationName) {
      return new Response(JSON.stringify({ error: "Missing simulation name" }), { status: 400 });
    }

    // Define the folder path
    const folderPath = path.join(process.cwd(), "public", "images", "simulasyon", simulationName, "positive");

    // Read the directory contents
    const files = await fs.readdir(folderPath);

    // Filter only image files (optional)
    const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));

    return new Response(JSON.stringify({ images: imageFiles }), { status: 200 });
  } catch  {
    
    return new Response(JSON.stringify({ error: "Could not retrieve images" }), { status: 500 });
  }
}
