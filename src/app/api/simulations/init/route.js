// src/app/api/simulations/init/route.js
import OpenAI from "openai";
import { getPool } from "@/lib/db";
import sql from "mssql";
import crypto from "node:crypto";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Ortak iş mantığı: hem GET hem POST burayı çağırır
async function initCore({ simulasyon_name, mode }) {
  const pool = await getPool();

  // Simülasyon bilgilerini çek
  const simRes = await pool
    .request()
    .input("name", sql.NVarChar(256), simulasyon_name)
    .query(`
      SELECT TOP 1
        assistant_id,
        vector_store_id,
        instructions,
        voice_code
      FROM dbo.simulations
      WHERE simulasyon_name = @name
    `);

  const sim = simRes.recordset?.[0] ?? {};

  // voice_code -> gender
  const codeToGender = { 1: "male", 2: "female", 3: "neutral" };
  const voice_gender = codeToGender[sim.voice_code] ?? "neutral";

  // Varsayılan karar: assistant_id varsa Assistants, yoksa Chat
  const willUseAssistants =
    mode === "assistants" ? true :
    mode === "chat" ? false :
    !!sim.assistant_id;

  let thread_id = null;

  if (willUseAssistants) {
    // OpenAI Assistants thread oluştur
    const t = await openai.beta.threads.create();
    thread_id = t.id;
  } else {
    // Chat Completions için kendi konuşma kimliğimiz
    thread_id = crypto.randomUUID();
    // (İstersen burada conversations tablosuna başlangıç satırı insert edebilirsin)
  }

  return {
    success: true,
    mode: willUseAssistants ? "assistants" : "chat",
    assistant_id: willUseAssistants ? (sim.assistant_id ?? null) : null,
    thread_id,
    vector_store_id: sim.vector_store_id ?? null,
    voice_gender,
    instructions: sim.instructions ?? ""
  };
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const simulasyon_name = body?.simulasyon_name;
    const mode = body?.mode; // opsiyonel override

    if (!simulasyon_name) {
      return new Response(JSON.stringify({ error: "simulasyon_name is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const data = await initCore({ simulasyon_name, mode });
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: "init_failed",
      details: err?.message || String(err)
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const simulasyon_name = searchParams.get("simulasyon_name");
    const mode = searchParams.get("mode"); // opsiyonel override (?mode=chat|assistants)

    if (!simulasyon_name) {
      return new Response(JSON.stringify({ error: "simulasyon_name is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const data = await initCore({ simulasyon_name, mode });
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: "init_failed",
      details: err?.message || String(err)
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
