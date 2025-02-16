// src/app/api/simulations/save/route.js
import { getPool } from "@/lib/db";

export async function POST(req) {
    try {
        const body = await req.json();
       

        const { 
            user_id, 
            course_id, 
            simulasyon_name, 
            user_response, 
            ai_response, 
            thread_id,
            key1, key2, key3, key4, key5,
            puan1, puan2, puan3, puan4, puan5,
            toplam_puan
        } = body;

        // Enhanced validation
        if (!user_id || !course_id || !simulasyon_name) {
          
            return new Response(JSON.stringify({ 
                error: "Missing required fields" 
            }), { 
                status: 400 
            });
        }

        // Check if this is a final response
        const isFinalResponse = ai_response.includes('Eğitim simülasyonumuz burada bitti');
        
        if (isFinalResponse) {
        

            // Validate key-point data for final response
            if (!key1 || !key2 || !key3 || !key4 || !key5 || 
                !puan1 || !puan2 || !puan3 || !puan4 || !puan5 || 
                !toplam_puan) {
           
                return new Response(JSON.stringify({ 
                    error: "Missing key-point data in final response" 
                }), { 
                    status: 400 
                });
            }
        }

        const pool = await getPool();
        
        // Begin transaction
        const transaction = await pool.transaction();
        
        try {
            await transaction.begin();

            // Insert with proper type handling
            const result = await transaction.request()
                .input("userId", user_id)
                .input("courseId", course_id)
                .input("simulationName", simulasyon_name)
                .input("userResponse", user_response)
                .input("aiResponse", ai_response)
                .input("threadId", thread_id)
                .input("key1", key1)
                .input("key2", key2)
                .input("key3", key3)
                .input("key4", key4)
                .input("key5", key5)
                .input("puan1", puan1 ? parseInt(puan1, 10) : null)
                .input("puan2", puan2 ? parseInt(puan2, 10) : null)
                .input("puan3", puan3 ? parseInt(puan3, 10) : null)
                .input("puan4", puan4 ? parseInt(puan4, 10) : null)
                .input("puan5", puan5 ? parseInt(puan5, 10) : null)
                .input("toplamPuan", toplam_puan ? parseInt(toplam_puan, 10) : null)
                .query(`
                    INSERT INTO keyzpage_complete (
                        user_id, course_id, simulasyon_name, 
                        user_response, ai_response, thread_id,
                        key1, key2, key3, key4, key5,
                        puan1, puan2, puan3, puan4, puan5,
                        toplam_puan, created_at
                    )
                    VALUES (
                        @userId, @courseId, @simulationName,
                        @userResponse, @aiResponse, @threadId,
                        @key1, @key2, @key3, @key4, @key5,
                        @puan1, @puan2, @puan3, @puan4, @puan5,
                        @toplamPuan, GETDATE()
                    );
                    
                    SELECT SCOPE_IDENTITY() as id;
                `);

            await transaction.commit();
            
           

            return new Response(JSON.stringify({ 
                success: true,
                message: "Progress saved successfully",
                id: result.recordset[0].id,
                isFinalResponse
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

    } catch (error) {
     
        return new Response(JSON.stringify({ 
            error: "Error saving progress", 
            details: error.message 
        }), { 
            status: 500 
        });
    }
}