// src/app/api/simulations/init/route.js
import { getPool } from '@/lib/db';
import { openai } from '@/lib/openai';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const simulationName = searchParams.get("simulasyon_name");

        if (!simulationName) {
            return new Response(JSON.stringify({ error: "Missing simulation name" }), { 
                status: 400 
            });
        }

        // Get the assistant ID for this simulation
        const pool = await getPool();
        const result = await pool.request()
            .input("simulationName", simulationName)
            .query(`
                DECLARE @sql nvarchar(max)
                SET @sql = 'SELECT assistant_id FROM ' + QUOTENAME(@simulationName) + 
                          ' WHERE simulasyon_name = @simulationName'
                EXEC sp_executesql @sql, N'@simulationName nvarchar(50)', @simulationName
            `);

        const assistantId = result.recordset[0]?.assistant_id;

        if (!assistantId) {
            return new Response(JSON.stringify({ error: "Assistant not found" }), { 
                status: 404 
            });
        }

        // Create a new thread for this conversation
        const thread = await openai.beta.threads.create();

        return new Response(JSON.stringify({
            assistant_id: assistantId,
            thread_id: thread.id
        }), { 
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        
        return new Response(JSON.stringify({ 
            error: "Error initializing simulation", 
            details: error.message 
        }), { 
            status: 500 
        });
    }
}