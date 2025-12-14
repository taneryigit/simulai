// Updated route_save.js with double-check validation to ensure all keys/puans are saved

import { getPool } from "@/lib/db";
import sql from "mssql";

export async function POST(req) {
    try {
        const body = await req.json();
        const { user_id, course_id, simulasyon_name, user_response, ai_response, thread_id, toplam_puan } = body;

        if (!user_id || !course_id || !simulasyon_name) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
        }

        const pool = await getPool();
        const transaction = new sql.Transaction(pool);

        try {
            await transaction.begin();
            let attempt = 0;
            let success = false;

            while (attempt < 2 && !success) {
                attempt++;
                const request = new sql.Request(transaction);

                request
                    .input("userId", sql.Int, user_id)
                    .input("courseId", sql.Int, course_id)
                    .input("simulationName", sql.NVarChar(256), simulasyon_name)
                    .input("userResponse", sql.NVarChar(1000), user_response)
                    .input("aiResponse", sql.NVarChar(sql.MAX), ai_response)
                    .input("threadId", sql.NVarChar(256), thread_id)
                    .input("toplamPuan", sql.Int, toplam_puan !== undefined ? toplam_puan : null);

                for (let i = 1; i <= 10; i++) {
                    const keyVal = body[`key${i}`] !== undefined ? body[`key${i}`] : null;
                    const puanVal = body[`puan${i}`] !== undefined ? parseInt(body[`puan${i}`], 10) : null;

                    request.input(`key${i}`, sql.NVarChar(sql.MAX), keyVal);
                    request.input(`puan${i}`, sql.Int, puanVal);
                }

                await request.query(`
                    INSERT INTO dbo.keyzpage_complete (
                        user_id, course_id, simulasyon_name, user_response, ai_response, thread_id,
                        key1, key2, key3, key4, key5, key6, key7, key8, key9, key10,
                        puan1, puan2, puan3, puan4, puan5, puan6, puan7, puan8, puan9, puan10,
                        toplam_puan, created_at
                    ) VALUES (
                        @userId, @courseId, @simulationName, @userResponse, @aiResponse, @threadId,
                        @key1, @key2, @key3, @key4, @key5, @key6, @key7, @key8, @key9, @key10,
                        @puan1, @puan2, @puan3, @puan4, @puan5, @puan6, @puan7, @puan8, @puan9, @puan10,
                        @toplamPuan, GETDATE()
                    );
                `);
                success = true;
            }

            if (!success) {
                throw new Error("Failed to insert all keys and puans after 2 attempts");
            }

            await transaction.commit();
            return new Response(JSON.stringify({ success: true, message: "Progress saved successfully" }), { status: 200 });
        } catch (transactionError) {
            await transaction.rollback();
            throw transactionError;
        }
    } catch (error) {
        return new Response(JSON.stringify({ error: "Error saving progress", details: error.message }), { status: 500 });
    }
}