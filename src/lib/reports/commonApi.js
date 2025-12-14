// lib/reports/commonApi.js
import { getPool } from "@/lib/db";
import sql from "mssql";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Validates user token and permissions
 */
export async function validateUserAccess(request) {
  // Retrieve the token from the Authorization header
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return { error: "Token missing", status: 401 };
  }
  
  const token = authHeader.split(" ")[1];
  let decoded;
  
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return { error: "Invalid token", details: err.message, status: 401 };
  }
  
  const userId = decoded.id;
  
  // Get database connection
  const pool = await getPool();
  
  // Get user company info
  const userResult = await pool
    .request()
    .input("id", sql.Int, userId)
    .query("SELECT companyid, admin FROM dbo.users WHERE id = @id");
  
  if (userResult.recordset.length === 0) {
    return { error: "User not found", status: 404 };
  }
  
  const user = userResult.recordset[0];
  
  // Check admin privileges
  if (!user.admin) {
    return { error: "Unauthorized: Admin privileges required", status: 403 };
  }
  
  return { 
    success: true, 
    userId: userId,
    companyId: user.companyid,
    pool: pool
  };
}

/**
 * Creates a standard API response
 */
export function createApiResponse(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status: status,
      headers: { "Content-Type": "application/json" },
    }
  );
}