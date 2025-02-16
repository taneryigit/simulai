// src/app/api/simulations/end/route.js
import { getPool } from "@/lib/db";

export async function POST(req) {
    let pool = null;
    let transaction = null;

    try {
        const body = await req.json();
       
        
        const { 
            simulasyon_name, 
            thread_id,
            course_id,
            user_id  // We need this to match PHP version
        } = body;

        // Match PHP validation
        if (!thread_id || !simulasyon_name || !course_id || !user_id) {
         
            return new Response(JSON.stringify({ 
                error: "Missing required fields" 
            }), { 
                status: 400 
            });
        }

        pool = await getPool();
        transaction = pool.transaction();
        
        try {
            await transaction.begin();

            // 1. First fetch ALL conversation data (matching PHP)
            const fetchResult = await transaction.request()
                .input("threadId", thread_id)
                .input("userId", user_id)
                .input("simulationName", simulasyon_name)
                .query(`
                    SELECT *
                    FROM keyzpage_complete
                    WHERE thread_id = @threadId
                    AND user_id = @userId
                    AND simulasyon_name = @simulationName
                    ORDER BY created_at ASC;
                `);

            if (!fetchResult.recordset || fetchResult.recordset.length === 0) {
                throw new Error('No conversation data found to transfer');
            }

            // 2. Verify we have the final response with key points
            const hasFinalResponse = fetchResult.recordset.some(record => 
                record.ai_response.includes('Eğitim simülasyonumuz burada bitti') && 
                record.key1 && 
                record.puan1 && 
                record.toplam_puan
            );

            if (!hasFinalResponse) {
                throw new Error('Final response with key points not found');
            }

            // 3. Insert ALL records into score table
            for (const record of fetchResult.recordset) {
                await transaction.request()
                    .input("userId", record.user_id)
                    .input("courseId", record.course_id)
                    .input("simulationName", record.simulasyon_name)
                    .input("userResponse", record.user_response)
                    .input("aiResponse", record.ai_response)
                    .input("threadId", record.thread_id)
                    .input("key1", record.key1)
                    .input("puan1", record.puan1)
                    .input("key2", record.key2)
                    .input("puan2", record.puan2)
                    .input("key3", record.key3)
                    .input("puan3", record.puan3)
                    .input("key4", record.key4)
                    .input("puan4", record.puan4)
                    .input("key5", record.key5)
                    .input("puan5", record.puan5)
                    .input("toplamPuan", record.toplam_puan)
                    .input("createdAt", record.created_at)
                    .query(`
                        INSERT INTO keyzpage_score (
                            user_id, course_id, simulasyon_name,
                            user_response, ai_response, thread_id,
                            key1, puan1, key2, puan2, key3, puan3,
                            key4, puan4, key5, puan5, toplam_puan, created_at
                        )
                        VALUES (
                            @userId, @courseId, @simulationName,
                            @userResponse, @aiResponse, @threadId,
                            @key1, @puan1, @key2, @puan2, @key3, @puan3,
                            @key4, @puan4, @key5, @puan5, @toplamPuan, @createdAt
                        );
                    `);
            }

            // 4. Verify data was copied
            const verifyScoreResult = await transaction.request()
                .input("threadId", thread_id)
                .query(`
                    SELECT COUNT(*) as count
                    FROM keyzpage_score
                    WHERE thread_id = @threadId;
                `);

            if (verifyScoreResult.recordset[0].count !== fetchResult.recordset.length) {
                throw new Error('Data transfer verification failed');
            }

            // 5. Delete from complete table
            await transaction.request()
                .input("threadId", thread_id)
                .input("userId", user_id)
                .input("simulationName", simulasyon_name)
                .query(`
                    DELETE FROM keyzpage_complete 
                    WHERE thread_id = @threadId
                    AND user_id = @userId
                    AND simulasyon_name = @simulationName;
                `);

            await transaction.commit();
       

            return new Response(JSON.stringify({ 
                success: true,
                message: "Simulation completed and saved successfully" 
            }), { 
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

        } catch (transactionError) {
       
            await transaction.rollback();
            throw transactionError;
        }

    } catch  {
       
        if (transaction && transaction._acquiredConfig) {
            try {
                await transaction.rollback();
            } catch  {
                
            }
        }

        return new Response(JSON.stringify({ 
            error: "Error ending simulation", 
            details: error.message 
        }), { 
            status: 500 
        });
    }
    // REMOVE the finally block completely
}