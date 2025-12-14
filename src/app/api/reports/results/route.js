//src/app/api/reports/results/route.js
"use server";

import { getPool } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req) {
    try {
        const authResponse = await validateAuth(req);
        if (!authResponse.success) {
            return authResponse.response;
        }
        const userId = authResponse.userId;

        const { courseId, simulationName, error: paramError } = validateParams(req);
        if (paramError) {
            return paramError;
        }

        const pool = await getPool();
        const result = await fetchSimulationResults(pool, userId, courseId, simulationName);
        const formattedResults = formatResults(result.recordset);

        return new Response(JSON.stringify({ denemeResults: formattedResults }), {
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

async function validateAuth(req) {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return {
            success: false,
            response: new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            })
        };
    }

    const token = authHeader.split(" ")[1];
    const decodedUser = await verifyToken(token);
    if (!decodedUser || !decodedUser.id) {
        return {
            success: false,
            response: new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            })
        };
    }

    return { success: true, userId: decodedUser.id };
}

function validateParams(req) {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("course_id");
    const simulationName = searchParams.get("simulation_name");

    if (!courseId || !simulationName) {
        return {
            error: new Response(JSON.stringify({ 
                error: "Missing required parameters: course_id and simulation_name" 
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            })
        };
    }

    return { courseId, simulationName };
}

async function fetchSimulationResults(pool, userId, courseId, simulationName) {
    
    
    const result = await pool.request()
        .input("user_id", userId)
        .input("course_id", courseId)
        .input("simulasyon_name", simulationName)
        .query(`
            SELECT 
                thread_id,
                user_response,
                ai_response,
                key1, puan1,
                key2, puan2,
                key3, puan3,
                key4, puan4,
                key5, puan5,
                key6, puan6,
                key7, puan7,
                key8, puan8,
                key9, puan9,
                key10, puan10,
                toplam_puan,
                created_at
            FROM dbo.keyzpage_score
            WHERE user_id = @user_id 
                AND course_id = @course_id 
                AND simulasyon_name = @simulasyon_name
            ORDER BY thread_id, created_at;
        `);

 
    return result;
}
function formatResults(records) {
    const threadGroups = {};
    const endingPhrase = "Eğitim simülasyonumuz burada bitti";

    // Group by thread_id
    records.forEach(row => {
        if (!threadGroups[row.thread_id]) {
            threadGroups[row.thread_id] = {
                thread_id: row.thread_id,
                deneme_number: Object.keys(threadGroups).length + 1,
                data: [],
                scores: [],
                toplam_puan: null
            };
        }

        // Add conversation data - ALWAYS add the data
        threadGroups[row.thread_id].data.push({
            created_at: row.created_at,
            user_response: row.user_response || '',
            ai_response: row.ai_response && row.ai_response.includes(endingPhrase) 
                ? endingPhrase 
                : row.ai_response || ''
        });

        // Add score data if present
        if (row.key1 || row.key2 || row.key3 || row.key4 || row.key5 || row.key6 || row.key7 || row.key8 || row.key9 || row.key10 ) {
            threadGroups[row.thread_id].scores.push({
                key1: row.key1,
                puan1: row.puan1,
                key2: row.key2,
                puan2: row.puan2,
                key3: row.key3,
                puan3: row.puan3,
                key4: row.key4,
                puan4: row.puan4,
                key5: row.key5,
                puan5: row.puan5,
                key6: row.key6,
                puan6: row.puan6,
                key7: row.key7,
                puan7: row.puan7,
                key8: row.key8,
                puan8: row.puan8,
                key9: row.key9,
                puan9: row.puan9,
                key10: row.key10,
                puan10: row.puan10,
                toplam_puan: row.toplam_puan
            });
            if (row.toplam_puan !== undefined && row.toplam_puan !== null) {
                threadGroups[row.thread_id].toplam_puan = row.toplam_puan;
            }
        }
    });

    // Convert to array and format times
    const formattedResults = Object.values(threadGroups).map(thread => {
        // Sort conversations by timestamp
        thread.data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        // Chain end times
        for (let i = 0; i < thread.data.length - 1; i++) {
            thread.data[i].end_time = thread.data[i + 1].created_at;
        }

        // Make sure the last item has an end_time if it's empty
        if (thread.data.length > 0) {
            const lastItem = thread.data[thread.data.length - 1];
            if (!lastItem.end_time) {
                lastItem.end_time = lastItem.created_at;
            }
        }

        const start_time = thread.data.length ? thread.data[0].created_at : null;
        const end_time = thread.data.length ? thread.data[thread.data.length - 1].end_time : null;
        
        return {
            ...thread,
            start_time,
            end_time
        };
    });

  
    return formattedResults;
}
