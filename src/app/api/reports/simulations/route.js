// src/app/api/reports/simulations/route.js
"use server";

import { getPool } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req) {
    try {
        // Auth validation
        const authHeader = req.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        const token = authHeader.split(" ")[1];
        const decodedUser = await verifyToken(token);
        if (!decodedUser || !decodedUser.id) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Get course_id from query params
        const { searchParams } = new URL(req.url);
        const courseId = searchParams.get("course_id");

        if (!courseId) {
            return new Response(JSON.stringify({ error: "Missing course_id parameter" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const pool = await getPool();
        if (!pool) {
            throw new Error("Database connection failed");
        }

        // Get simulation table names for the course
        const courseResult = await pool.request()
            .input("course_id", courseId)
            .query(`
                SELECT 
                    simulasyon_table_name_1, simulasyon_table_name_2, simulasyon_table_name_3,
                    simulasyon_table_name_4, simulasyon_table_name_5, simulasyon_table_name_6,
                    simulasyon_table_name_7, simulasyon_table_name_8, simulasyon_table_name_9,
                    simulasyon_table_name_10
                FROM dbo.courses 
                WHERE course_id = @course_id
            `);

        if (!courseResult.recordset.length) {
            return new Response(JSON.stringify({ simulationDetails: [] }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Get valid simulation table names
        const simulationTableNames = Object.values(courseResult.recordset[0])
            .filter(table => table); // Filter out null/empty values

        if (simulationTableNames.length === 0) {
            return new Response(JSON.stringify({ simulationDetails: [] }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }

        // ✅ Query centralized simulations table
        const placeholders = simulationTableNames.map((_, index) => `@tableName${index}`).join(', ');
        const simulationQuery = `
            SELECT simulasyon_name, simulasyon_showname
            FROM [dbo].[simulations]
            WHERE simulasyon_name IN (${placeholders})
            AND simulasyon_showname IS NOT NULL 
            AND simulasyon_showname != ''
            ORDER BY simulasyon_name
        `;

        const request = pool.request();
        simulationTableNames.forEach((tableName, index) => {
            request.input(`tableName${index}`, tableName);
        });

        const simulationResult = await request.query(simulationQuery);

        // ✅ Simplified: Convert directly to expected format
        const simulationDetails = simulationResult.recordset.map(sim => ({
            table_name: sim.simulasyon_name,
            simulations: [{
                simulasyon_showname: sim.simulasyon_showname
            }]
        }));

        return new Response(JSON.stringify({ simulationDetails }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Reports simulations error:", error);
        return new Response(JSON.stringify({ 
            error: "Internal Server Error",
            message: process.env.NODE_ENV === 'development' ? error.message : undefined 
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}