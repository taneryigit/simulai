// /src/app/api/simulations/report/route.js
import { getPool } from "@/lib/db";
import sql from "mssql";

function splitKey(raw) {
  if (typeof raw !== "string") return { ad: null, aciklama: null };
  const idx = raw.indexOf(":");
  if (idx > -1) {
    return {
      ad: raw.slice(0, idx).trim(),
      aciklama: raw.slice(idx + 1).trim(),
    };
  }
  return { ad: raw.trim(), aciklama: null };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get("thread_id");

    if (!threadId) {
      return new Response(JSON.stringify({ error: "thread_id required" }), { status: 400 });
    }

    const pool = await getPool();

    // Tüm turlar (eskiden yeniye)
    const all = await pool.request()
      .input("threadId", sql.NVarChar(256), threadId)
      .query(`
        SELECT *
        FROM dbo.keyzpage_score
        WHERE thread_id = @threadId
        ORDER BY created_at ASC
      `);

    if (!all.recordset.length) {
      return new Response(JSON.stringify({ error: "No report found" }), { status: 404 });
    }

    const latest = all.recordset[all.recordset.length - 1];

    // Keys: key i ↔ puan i eşleştir
    const keys = [];
    for (let i = 1; i <= 10; i++) {
      const raw = latest[`key${i}`];
      const score = latest[`puan${i}`];
      if (raw != null || score != null) {
        const { ad, aciklama } = splitKey(raw);
        keys.push({
          index: i,
          ad,           // başlık (":" öncesi)
          aciklama,     // geri bildirim (":" sonrası)
          puan: score != null ? Number(score) : null,
        });
      }
    }

    // Transcript: tüm görüşme
    const transcript = all.recordset.map(r => ({
      created_at: r.created_at,
      user: r.user_response,
      ai: r.ai_response,
    }));

    let simulationMeta = null;
    if (latest.simulasyon_name) {
      const metaResult = await pool.request()
        .input("simulasyonName", sql.NVarChar(256), latest.simulasyon_name)
        .query(`
          SELECT TOP 1 simulasyon_showname, detail
          FROM dbo.simulations
          WHERE simulasyon_name = @simulasyonName
        `);

      simulationMeta = metaResult.recordset?.[0] ?? null;
    }

    return new Response(JSON.stringify({
      thread_id: threadId,
      simulasyon_name: latest.simulasyon_name,
      simulasyon_showname: simulationMeta?.simulasyon_showname ?? null,
      simulasyon_detail: simulationMeta?.detail ?? null,
      toplam_puan: latest.toplam_puan,
      aciklama: latest.ai_response, // açıklamayı burada tutuyorsan
      keys,
      transcript,
    }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Error fetching report", details: err.message }), { status: 500 });
  }
}
