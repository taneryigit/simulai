// src/app/api/tts/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { input, voice = "alloy" } = await req.json();

if (!input || typeof input !== 'string') {
  return NextResponse.json(
    { error: "Invalid input parameter" }, 
    { status: 400 }
  );
}

console.log(`TTS API: Sending request to OpenAI with voice: ${voice}`);
    
const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: voice.toLowerCase(), // Use the requested voice or default to alloy
        input: input.slice(0, 4096), // Ensure we don't exceed OpenAI's limit
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI TTS API error:', errorData);
      return NextResponse.json(
        { error: errorData.error?.message || "Failed to generate speech" }, 
        { status: response.status }
      );
    }
    
    // Get the audio data as an array buffer
    const buffer = await response.arrayBuffer();
    
    // Verify we have actual data
    if (!buffer || buffer.byteLength === 0) {
      console.error('OpenAI TTS API returned empty buffer');
      return NextResponse.json(
        { error: "Received empty audio data" }, 
        { status: 500 }
      );
    }
    
    console.log(`TTS API: Successfully generated ${buffer.byteLength} bytes of audio`);
    
    // Return the audio with proper headers
    return new NextResponse(buffer, {
      status: 200,
      headers: { 
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.byteLength.toString(),
        "Cache-Control": "no-cache",
      },
    });
    
  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json(
      { error: "Failed to generate speech: " + (error.message || "Unknown error") }, 
      { status: 500 }
    );
  }
}