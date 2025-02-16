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

        // Get simulation tables for the course
        const courseResult = await pool.request()
            .input("course_id", courseId)
            .query(`
                SELECT 
                    simulasyon_table_name_1, simulasyon_table_name_2, simulasyon_table_name_3,
                    simulasyon_table_name_4, simulasyon_table_name_5, simulasyon_table_name_6,
                    simulasyon_table_name_7, simulasyon_table_name_8, simulasyon_table_name_9,
                    simulasyon_table_name_10
                FROM courses 
                WHERE course_id = @course_id
            `);

        if (!courseResult.recordset.length) {
            return new Response(JSON.stringify({ simulations: [] }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Get valid simulation tables
        const simulationTables = Object.values(courseResult.recordset[0])
            .filter(table => table); // Filter out null/empty values

        if (simulationTables.length === 0) {
            return new Response(JSON.stringify({ simulations: [] }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Get existing tables from database
        const tablesResult = await pool.request()
            .query(`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'`);
        
        const existingTables = tablesResult.recordset.map(r => r.TABLE_NAME);
        const validSimulations = simulationTables.filter(table => existingTables.includes(table));

        // Get simulation details for each valid table
        const simulationDetails = [];
        for (const table of validSimulations) {
            const result = await pool.request()
                .query(`
                    SELECT simulasyon_showname 
                    FROM ${table} 
                    WHERE simulasyon_showname IS NOT NULL AND simulasyon_showname != ''
                `);
            
            if (result.recordset.length > 0) {
                simulationDetails.push({
                    table_name: table,
                    simulations: result.recordset
                });
            }
        }

        return new Response(JSON.stringify({ simulationDetails }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        
        return new Response(JSON.stringify({ 
            error: "Internal Server Error",
            message: process.env.NODE_ENV === 'development' ? error.message : undefined 
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}