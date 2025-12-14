// src/app/api/simulations/end/route.js
import { getPool } from "@/lib/db";
import sql from "mssql";

export async function POST(req) {
    let pool = null;
    let transaction = null;
    try {
        const body = await req.json();
        const { user_id, course_id, simulasyon_name, thread_id } = body;

        if (!thread_id || !simulasyon_name || !course_id || !user_id) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
        }

        pool = await getPool();
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // First, log what we're fetching to help with debugging
        console.log(`Fetching records for thread_id: ${thread_id}, user_id: ${user_id}, simulasyon_name: ${simulasyon_name}`);

        const fetchResult = await transaction.request()
            .input("threadId", thread_id)
            .input("userId", user_id)
            .input("simulationName", simulasyon_name)
            .query(`
                SELECT * FROM dbo.keyzpage_complete
                WHERE thread_id = @threadId
                AND user_id = @userId
                AND simulasyon_name = @simulationName
                ORDER BY created_at ASC;
            `);

        if (!fetchResult.recordset || fetchResult.recordset.length === 0) {
            throw new Error("No conversation data found to transfer");
        }

        // Log what we found to help with debugging
        console.log(`Found ${fetchResult.recordset.length} records to transfer`);
        
        for (const record of fetchResult.recordset) {
            // Log each record's toplam_puan to help with debugging
            console.log(`Processing record with toplam_puan: ${record.toplam_puan}`);
            
            let insertQuery = `INSERT INTO dbo.keyzpage_score (
                user_id, course_id, simulasyon_name,
                user_response, ai_response, thread_id,
                toplam_puan, created_at`;
            let valuesQuery = `VALUES (
                @userId, @courseId, @simulationName,
                @userResponse, @aiResponse, @threadId,
                @toplamPuan, @createdAt`;

            // IMPORTANT FIX: Ensure toplam_puan is properly handled
            // Convert to number if it exists, otherwise use null
            const toplamPuanValue = record.toplam_puan !== undefined && record.toplam_puan !== null 
                ? parseInt(record.toplam_puan, 10) 
                : null;
                
            const request = transaction.request()
                .input("userId", record.user_id)
                .input("courseId", record.course_id)
                .input("simulationName", record.simulasyon_name)
                .input("userResponse", record.user_response)
                .input("aiResponse", record.ai_response)
                .input("threadId", record.thread_id)
                .input("toplamPuan", sql.Int, toplamPuanValue) // Explicitly set as sql.Int type
                .input("createdAt", record.created_at);

            for (let i = 1; i <= 10; i++) {
                insertQuery += `, key${i}, puan${i}`;
                valuesQuery += `, @key${i}, @puan${i}`;
                request.input(`key${i}`, record[`key${i}`] || null);
                request.input(`puan${i}`, record[`puan${i}`] !== null ? parseInt(record[`puan${i}`], 10) : null);
            }

            insertQuery += `) ` + valuesQuery + `);`;
            
            // Log the final query for debugging
            console.log(`Executing insert with toplam_puan = ${toplamPuanValue}`);
            
            await request.query(insertQuery);
        }

        await transaction.request()
            .input("threadId", thread_id)
            .input("userId", user_id)
            .input("simulationName", simulasyon_name)
            .query(`
                DELETE FROM dbo.keyzpage_complete
                WHERE thread_id = @threadId
                AND user_id = @userId
                AND simulasyon_name = @simulationName;
            `);

        await transaction.commit();

        return new Response(JSON.stringify({
            success: true,
            message: "Simulation completed and saved successfully"
        }), { status: 200 });
    } catch (error) {
        if (transaction && transaction._acquiredConfig) {
            try {
                await transaction.rollback();
            } catch {}
        }

        return new Response(JSON.stringify({ error: "Error ending simulation", details: error.message }), { status: 500 });
    }
}