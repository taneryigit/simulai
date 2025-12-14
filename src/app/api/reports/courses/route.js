"use server";

import { getPool } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req) {
    try {
        // Extract and verify the JWT token
        const authHeader = req.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { 
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        const token = authHeader.split(" ")[1];
        const decodedUser = await verifyToken(token); // Made async
        if (!decodedUser || !decodedUser.id) {
            return new Response(JSON.stringify({ error: "Invalid token" }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        const userId = decodedUser.id;
        
        // Connect to the database
        const pool = await getPool();
        if (!pool) {
            throw new Error("Database connection failed");
        }

        const result = await pool.request()
            .input("user_id", userId)
            .query(`
                SELECT course_id, course_name 
                FROM dbo.enrol 
                WHERE user_id = @user_id
            `);
        
        return new Response(JSON.stringify({ courses: result.recordset || [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        
        return new Response(JSON.stringify({ 
            error: "Internal Server Error",
            message: error.message 
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}