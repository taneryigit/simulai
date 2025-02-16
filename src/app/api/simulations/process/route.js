// src/app/api/simulations/process/route.js
import OpenAI from 'openai';





const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req) {
    try {
        const body = await req.json();
        const { content, assistant_id, thread_id } = body;
            // Ensure thread_id is provided instead of creating a new one
            if (!content || !assistant_id || !thread_id) {
                return new Response(JSON.stringify({ error: "Missing required fields: content, assistant_id, or thread_id" }), { 
                    status: 400 
                });
            }
        if (!content || !assistant_id) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), { 
                status: 400 
            });
        }

        // Create a new thread if none exists
        let currentThreadId = thread_id;
      

        // Add the user's message to the thread
        await openai.beta.threads.messages.create(currentThreadId, {
            role: "user",
            content: content
        });

        // Create a run with the assistant
        const run = await openai.beta.threads.runs.create(currentThreadId, {
            assistant_id: assistant_id
        });

      // Poll for the completion of the run with a max retry limit
let response;
const maxRetries = 20; // Maximum number of retries (20 attempts = 20 seconds max)
let attempts = 0;

while (attempts < maxRetries) {
    const runStatus = await openai.beta.threads.runs.retrieve(
        currentThreadId,
        run.id
    );

    if (runStatus.status === 'completed') {
        // Get the latest message from the thread
        const messages = await openai.beta.threads.messages.list(currentThreadId);
        
        // Get the most recent assistant message
        const lastMessage = messages.data.find(msg => msg.role === 'assistant');
        
        if (lastMessage) {
            response = lastMessage.content[0].text.value;
        }
        break;  // Exit loop when response is received
    } else if (runStatus.status === 'failed') {
        throw new Error('YZ çalıştırma başarısız oldu');
    }

    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;  // Increment retry counter
}

// If no response after max retries, return an error
if (!response) {
    throw new Error('YZ maksimum deneme sayısına ulaşıldı ve yanıt alınamadı');
}

return new Response(JSON.stringify({
    response: response,
    thread_id: currentThreadId
}), { 
    status: 200,
    headers: {
        'Content-Type': 'application/json'
    }
});

} catch  {
   
    return new Response(JSON.stringify({ 
        error: "Error processing request", 
        details: error.message 
    }), { 
        status: 500 
    });
}
}