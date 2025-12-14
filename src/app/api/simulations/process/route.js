// src/app/api/simulations/process/route.js
import OpenAI from "openai";
import { getPool } from "@/lib/db";
import sql from "mssql";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function json(res, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Asistan mesajı içeriğini güvenli şekilde metne çevir
function extractAssistantTextFromAssistantsMessage(msg) {
  if (!msg) return "";
  // V3 içerikleri array olabilir
  if (Array.isArray(msg.content) && msg.content.length > 0) {
    // text
    const textPart = msg.content.find(c => c.type === "text" && c.text?.value);
    if (textPart?.text?.value) return textPart.text.value;
    // eski şekil
    if (msg.content[0]?.text?.value) return msg.content[0].text.value;
  }
  // fallback: msg.value veya msg.text
  if (msg.value) return msg.value;
  if (msg.text) return msg.text;
  return "";
}

export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return json({ error: "OPENAI_API_KEY is missing in environment" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const {
      content,            // zorunlu
      thread_id,          // zorunlu
      assistant_id,       // assistants modunda zorunlu
      simulasyon_name,    // chat modunda zorunlu
      mode: rawMode,      // "assistants" | "chat" | undefined
      model,              // chat model override (opsiyonel)
    } = body || {};

    // Mode belirleme (gönderilmemişse assistant_id varlığına göre)
    const mode = rawMode || (assistant_id ? "assistants" : "chat");

    // Genel validasyon
    if (!thread_id) return json({ error: "thread_id is required", where: "common" }, 400);
    if (!content || !String(content).trim()) {
      return json({ error: "content is required", where: "common" }, 400);
    }

    // ===== ASSISTANTS PATH =====
    if (mode === "assistants") {
      if (!assistant_id) {
        return json({ error: "assistant_id is required for assistants mode", where: "assistants" }, 400);
      }

      // 1) kullanıcı mesajını threade ekle
      let run;
      try {
        await openai.beta.threads.messages.create(thread_id, {
          role: "user",
          content: String(content),
        });
        // 2) run ve poll
        run = await openai.beta.threads.runs.createAndPoll(thread_id, { assistant_id });
      } catch (err) {
        return json({
          error: "openai_assistants_failed",
          details: err?.message || String(err),
          where: "assistants-openai",
        }, 500);
      }

      if (run?.status !== "completed") {
        return json({
          error: "assistants_run_incomplete",
          status: run?.status,
          where: "assistants-openai",
        }, 502);
      }

      // 3) son asistan mesajını çek
      let text = "";
      try {
        const messages = await openai.beta.threads.messages.list(thread_id, { limit: 10, order: "desc" });
        // son asistan mesajı
        const assistantMsg = messages.data.find(m => m.role === "assistant");
        text = extractAssistantTextFromAssistantsMessage(assistantMsg);
      } catch (err) {
        return json({
          error: "assistants_messages_fetch_failed",
          details: err?.message || String(err),
          where: "assistants-openai",
        }, 500);
      }

      if (!text) {
        text = "[empty assistant response]";
      }

      // 4) DB kayıt (opsiyonel, hata olsa bile akışı bozmayalım)
      try {
        const pool = await getPool();
        await pool.request()
          .input("thread", sql.NVarChar(64), thread_id)
          .input("user_msg", sql.NVarChar(sql.MAX), String(content))
          .input("ai_msg", sql.NVarChar(sql.MAX), String(text))
          .query(`
            INSERT INTO dbo.keyzpage_complete (thread_id, user_response, ai_response, created_at)
            VALUES (@thread, @user_msg, @ai_msg, SYSUTCDATETIME())
          `);
      } catch (dbErr) {
        // log için geri döndürelim ama 200 devam
        return json({
          response: text,
          thread_id,
          warning: "db_insert_failed",
          db_error: dbErr?.message || String(dbErr),
        }, 200);
      }

      return json({ response: text, thread_id }, 200);
    }

    // ===== CHAT COMPLETIONS PATH =====
    if (mode === "chat") {
      if (!simulasyon_name) {
        return json({ error: "simulasyon_name is required for chat mode", where: "chat" }, 400);
      }

      const pool = await getPool();

      // 1) instructions çek (DB)
      let instructions = "";
      try {
        const simRes = await pool.request()
          .input("name", sql.NVarChar(256), simulasyon_name)
          .query(`
            SELECT TOP 1 instructions
            FROM dbo.simulations
            WHERE simulasyon_name = @name
          `);
        instructions = simRes.recordset?.[0]?.instructions || "";
      } catch (dbErr) {
        return json({
          error: "db_fetch_instructions_failed",
          details: dbErr?.message || String(dbErr),
          where: "chat-db",
        }, 500);
      }

      // 2) geçmişi oku
      let prevTurns = [];
      try {
        const turns = await pool.request()
          .input("thread", sql.NVarChar(64), thread_id)
          .query(`
            SELECT user_response, ai_response
            FROM dbo.keyzpage_complete
            WHERE thread_id = @thread
            ORDER BY created_at ASC
          `);
        prevTurns = turns.recordset || [];
      } catch  {
        // geçmiş okunamadıysa da devam edebiliriz; sadece uyarı döneriz
        prevTurns = [];
      }

      // 3) messages kur
      const messages = [];
      if (instructions?.trim()) {
        messages.push({ role: "system", content: instructions.trim() });
      }
      for (const row of prevTurns) {
        if (row.user_response?.trim()) messages.push({ role: "user", content: row.user_response.trim() });
        if (row.ai_response?.trim())   messages.push({ role: "assistant", content: row.ai_response.trim() });
      }
      messages.push({ role: "user", content: String(content).trim() });

      // 4) completion
      let reply = "";
      try {
        const chat = await openai.chat.completions.create({
          model: model || "gpt-4o-mini",
          messages,
          temperature: 0.5,
        });
        reply = chat.choices?.[0]?.message?.content || "";
      } catch (err) {
        return json({
          error: "openai_chat_failed",
          details: err?.message || String(err),
          where: "chat-openai",
        }, 500);
      }

      if (!reply) reply = "[empty model response]";

      // 5) DB’ye yaz (ikili kayıt)
      try {
        await pool.request()
          .input("thread", sql.NVarChar(64), thread_id)
          .input("user_msg", sql.NVarChar(sql.MAX), String(content))
          .input("ai_msg", sql.NVarChar(sql.MAX), String(reply))
          .query(`
            INSERT INTO dbo.keyzpage_complete (thread_id, user_response, ai_response, created_at)
            VALUES (@thread, @user_msg, @ai_msg, SYSUTCDATETIME())
          `);
      } catch (dbErr) {
        // kayıt hatası olursa yine de 200 dön, ama uyarıyı ekle
        return json({
          response: reply,
          thread_id,
          warning: "db_insert_failed",
          db_error: dbErr?.message || String(dbErr),
        }, 200);
      }

      return json({ response: reply, thread_id }, 200);
    }

    // Bilinmeyen mode
    return json({ error: "Unknown mode", mode }, 400);

  } catch (err) {
    return json({
      error: "process_failed",
      details: err?.message || String(err),
      where: "top-level",
    }, 500);
  }
}
