//src/app/simulations/[courseId]/[simulasyon_name]/rapor/page.js
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import TopNav from "@/components/TopNav";

// Radar chart comes from a dedicated client component to avoid SSR issues
const RadarScoreChart = dynamic(() => import("@/components/reports/RadarScoreChart"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-slate-500">Radar yükleniyor…</div>
  )
});

function Msg({ role, text }) {
  return (
    <div className={`rounded-lg border p-3 ${role === 'user' ? 'bg-white' : 'bg-gray-50'}`}>
      <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">
        {role === 'user' ? 'Kullanıcı' : 'AI'}
      </div>
      <div className="whitespace-pre-wrap text-sm text-gray-800">{text || '—'}</div>
    </div>
  );
}

export default function RaporPage() {
  const params = useParams();
  const router = useRouter();
  const search = useSearchParams();

  const courseId = search.get("courseId") || params.courseId;
  const threadId = search.get("threadId");

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        if (!threadId) return;
        const res = await fetch(`/api/simulations/report?thread_id=${encodeURIComponent(threadId)}`);
        const data = await res.json();
        if (res.ok) setReport(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [threadId]);

  // Simulasyon görseli (opsiyonel; elinizdeki API/klasöre göre ayarla)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/simulations/images?simulation=${encodeURIComponent(params.simulasyon_name)}`);
        const data = await res.json();
        if (res.ok && data.images?.length) {
          const rnd = Math.floor(Math.random() * data.images.length);
          setImageUrl(`/images/simulasyon/${params.simulasyon_name}/positive/${data.images[rnd]}`);
        }
      } catch {}
    })();
  }, [params.simulasyon_name]);

  const radarData = useMemo(() => {
    if (!report?.keys) return [];
    return report.keys.map((k, i) => ({
      subject: k.ad || `Key ${k.index ?? i+1}`,
      puan: Number(k.puan) || 0
    }));
  }, [report]);

  const sanitizedTranscript = useMemo(() => {
    if (!report?.transcript) return [];
    const stopNeedle = "eğitim simülasyonumuz burada bitti";
    const stopIndex = report.transcript.findIndex(t =>
      (t.user || "").toLowerCase().includes(stopNeedle) ||
      (t.ai || "").toLowerCase().includes(stopNeedle)
    );
    return stopIndex === -1 ? report.transcript : report.transcript.slice(0, stopIndex);
  }, [report]);

  const filteredTranscript = useMemo(() => {
    if (!sanitizedTranscript.length) return [];
    if (!q) return sanitizedTranscript;
    const needle = q.toLowerCase();
    return sanitizedTranscript.filter(t =>
      (t.user || "").toLowerCase().includes(needle) ||
      (t.ai || "").toLowerCase().includes(needle)
    );
  }, [sanitizedTranscript, q]);

  const sanitizedFeedback = useMemo(() => {
    const raw = report?.aciklama;
    if (!raw) return "";

    const introRegex = /^\s*"?eğitim simülasyonumuz burada bitti\.[\s\S]*?geri bildiriminizi hazırlıyorum\.?"?\s*/i;

    let text = raw
      .replace(/<br\s*\/?/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\r/g, "");

    text = text.replace(introRegex, "");
    const introCleanupPatterns = [
      /^\s*anlad[ıi]m\.[^\n]*\n?/i,
      /^\s*size\s+sağlıklı\s+bir\s+gün\s+dilerim\.[^\n]*\n?/i,
      /^\s*eğitim\s+simülasyonumuz\s+burada\s+bitti\.[^\n]*\n?/i,
      /^\s*eğitime\s+katılımınız\s+için\s+teşekkürler\.[^\n]*\n?/i,
      /^\s*şimdi\s+size\s+geri\s+bildiriminizi\s+hazırlıyorum\.[^\n]*\n?/i,
      /^\s*lütfen\s+geri\s+bildirimlerinizi\s+gözden\s+geçirin[:：]?\s*\n?/i
    ];
    introCleanupPatterns.forEach((pattern) => {
      text = text.replace(pattern, "");
    });

    const startMarker = "etkili açılış:";
    const lowerText = text.toLocaleLowerCase("tr-TR");
    const startIndex = lowerText.indexOf(startMarker);
    if (startIndex > 0) {
      text = text.slice(startIndex);
    }

    const stripQuotes = (val) =>
      val
        .replace(/^[•\-*\u2022]+\s*/, "")
        .replace(/["'“”]/g, "")
        .replace(/,\s*$/, "")
        .trim();

    const lines = text.split(/\n/);
    const cleaned = lines.reduce((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed) return acc;

      const normalized = trimmed.toLowerCase().replace(/^['"“”\s]+/, "");
      if (/^toplam[ _]?puan/.test(normalized)) return acc;
      if (/^puan/.test(normalized)) return acc;

      let withoutKey = trimmed.replace(/^['"“”]*key\s*\d*['"“”]*[:：]?\s*/i, "");
      withoutKey = withoutKey.replace(/^['"“”]*puan\s*\d*['"“”]*[:：]?\s*/i, "");

      const cleanedLine = stripQuotes(withoutKey);
      if (!cleanedLine) return acc;

      if (/^lütfen\s+geri\s+bildirim/i.test(cleanedLine)) return acc;

      acc.push(cleanedLine);
      return acc;
    }, []);

    const result = cleaned.join("\n\n").trim();
    if (result) return result;

    const fallback = stripQuotes(text).replace(/\n{2,}/g, "\n\n").trim();
    return fallback;
  }, [report]);

  const simulationTitle = report?.simulasyon_showname || report?.simulasyon_name || params.simulasyon_name;
  const simulationDetail = useMemo(() => {
    if (!report?.simulasyon_detail) return null;
    return report.simulasyon_detail
      .replace(/<br\s*\/?/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\r/g, "")
      .trim();
  }, [report]);

  const total = Number(report?.toplam_puan) || 0;
  const starCount = Math.min(5, Math.max(0, Math.round(total / 20))); // 100->5, 80->4...
  const showCongrats = total === 100 && starCount === 5;

  const handlePrint = useCallback(() => {
    if (typeof window !== "undefined") {
      window.print();
    }
  }, []);

  return (
    <>
      <div className="report-page min-h-screen bg-gray-50 overflow-x-hidden print:min-h-0 print:bg-white">
        <div className="no-print">
          <TopNav />
        </div>
        <div className="report-main pt-12 w-full min-h-[calc(100vh-3rem)] flex flex-col md:flex-row md:items-stretch  md:gap-8 print:min-h-0 print:flex-col print:w-full print:min-h-0 print:flex-col print:gap-0">
  {/* Sol: rapor */}
<div className="report-column-left relative w-full p-6 md:w-3/5 md:p-10 print:w-full print:p-6 print:overflow-hidden print:h-auto">    {loading && <div className="text-gray-500">Rapor yükleniyor…</div>}
    {!loading && !report && <div className="text-red-600">Rapor bulunamadı.</div>}

    {!loading && report && (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-4xl font-extrabold tracking-tight">Rapor Detayı</h1>
          <button
            type="button"
            onClick={handlePrint}
            className="no-print inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            <span className="hidden sm:inline">PDF olarak kaydet</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>

         {/* Puan + Yıldız */}
  <div className="flex flex-col gap-4">
  <div className="flex items-center gap-6">
    <div className="text-3xl md:text-3xl font-extrabold tracking-tight">
      Puanınız: {total}
    </div>
    <div className="flex items-center">
      {[...Array(5)].map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" className={`w-8 h-8 ${i < starCount ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor">
          <path d="M12 .587l3.668 7.428L24 9.748l-6 5.848 1.417 8.264L12 19.771l-7.417 4.089L6 15.596 0 9.748l8.332-1.733L12 .587z"/>
        </svg>
      ))}
    </div>
  </div>
  <div className="text-m md:text-m font-bold tracking-tight text-center">
    Puanın Dağılımı
  </div>
</div>

        {/* Tebrikler */}
        {showCongrats && (
          <div className="relative overflow-hidden rounded-xl border bg-white p-4">
            <div className="text-lg font-semibold text-green-600">Tebrikler! Mükemmel skor 🎉</div>
            <div className="pointer-events-none absolute inset-0 animate-[confetti_1.2s_ease-in-out_infinite] opacity-40" />
            <style jsx>{`
              @keyframes confetti {
                0% { background-position: 0 0; }
                100% { background-position: 200px 200px; }
              }
            `}</style>
          </div>
        )}

        {/* Radar */}
        <div className="w-full h-80 rounded-xl border bg-white p-4">
          <RadarScoreChart data={radarData} totalScore={total} />
        </div>

        {/* Açıklama */}
        <div className="rounded-xl border bg-white p-4">
          <div className="text-lg font-semibold text-gray-700 mb-3">Neden bu puanı aldınız?</div>
          <p className="text-gray-800 whitespace-pre-line">{sanitizedFeedback || report?.aciklama || "Açıklama bulunamadı."}</p>
        </div>

        {/* Key – Geri Bildirim – Puan tablosu */}
        <div className="rounded-xl border bg-white p-4">
          <div className="text-lg font-semibold text-gray-700 mb-3">Değerlendirme Detayı</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Başlık</th>
                  <th className="py-2 pr-4">Geri Bildirim</th>
                  <th className="py-2">Puan</th>
                </tr>
              </thead>
              <tbody>
                {(report?.keys || []).map((k, idx) => (
                  <tr key={idx} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-4 text-gray-500">{k.index ?? (idx + 1)}</td>
                    <td className="py-2 pr-4 font-medium text-gray-900">{k.ad || `Key ${k.index ?? idx+1}`}</td>
                    <td className="py-2 pr-4 text-gray-800 whitespace-pre-wrap">{k.aciklama || "—"}</td>
                    <td className="py-2 font-semibold">{k.puan ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Navigasyon */}
        <div className="flex flex-wrap gap-3">
          <button
            className="px-4 py-2 rounded-lg bg-white border hover:bg-gray-50 transition"
            onClick={() => router.push(`/panel`)}
          >
            Ana Sayfaya Dön
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black transition"
            onClick={() => router.push(`/simulations/${courseId}`)}
          >
            Başka Simülasyon Seç
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
            onClick={() => router.push(`/simulations/${courseId}/${params.simulasyon_name}`)}
          >
            Aynı Simülasyonuna Dön
          </button>
        </div>
        <div className="page-break" />
      </div>
    )}
  </div>

  {/* Sağ: Simülasyon / Transcript */}
  <div className="report-column-right flex w-full flex-col  md:w-2/5 md:pt-12 lg:pt-16  md:self-stretch min-h-0 print:w-full print:pt-6  bg-gray-50">
    {(simulationTitle || simulationDetail) && (
      <div className="space-y-3 border-b border-gray-100 px-4 pt-6 pb-5">
        {simulationTitle && (
          <div>
            <div className="text-lg font-semibold text-gray-900 mb-3">Simülasyon Adı</div>
            <div className="text-m font-semibold text-gray-500">{simulationTitle}</div>
          </div>
        )}
        {simulationDetail && (
          <div>
            <div className="text-lg font-semibold text-gray-900 mb-3">Simülasyon Açıklaması</div>
            <p className="text-m leading-relaxed text-gray-500 whitespace-pre-line">{simulationDetail}</p>
          </div>
        )}
      </div>
    )}

  <div className="border-b border-gray-100 bg-white px-4 pt-4 pb-3"> 
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="text-sm font-medium text-gray-700">Görünüm</div>
    <div className="flex gap-2">
      {/* Görüşme Geçmişi solda */}
      <button
        onClick={() => setShowTranscript(true)}
        className={`px-3 py-1 text-sm rounded-lg border transition ${showTranscript ? 'bg-gray-900 text-white' : 'bg-white hover:bg-gray-50'}`}
      >
        Görüşme Geçmişi
      </button>
      <button
        onClick={() => setShowTranscript(false)}
        className={`px-3 py-1 text-sm rounded-lg border transition ${!showTranscript ? 'bg-gray-900 text-white' : 'bg-white hover:bg-gray-50'}`}
      >
        Simülasyon Görseli
      </button>
    </div>
  </div>
</div>


    <div className="relative flex-1 min-h-0 min-h-[60vh] md:min-h-0 print:min-h-0 print:h-auto">
      <div className={`flex min-h-[60vh] md:min-h-0 h-full items-start justify-center  px-4 pb-6 transition-opacity duration-300 ${showTranscript ? 'pointer-events-none opacity-0' : 'opacity-100 print:min-h-0 print:opacity-100 print:pointer-events-auto'}`}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt="Karakter"
            width={600}
            height={900}
            className="h-auto w-auto max-w-full object-contain"
            priority
          />
        ) : (
          <div className="h-[60vh] w-full animate-pulse rounded-xl bg-gray-100" />
        )}
      </div>

      {/* Transcript paneli */}
      {showTranscript && (
        <div className="absolute inset-0 p-4 md:p-6 print:static print:p-0">
          <div className="flex h-full min-h-0 flex-col gap-3 rounded-xl border bg-white/90 p-3 backdrop-blur md:p-4 print:h-auto print:gap-2 print:bg-white print:border-0">
            <div className="flex items-start gap-2">
              <div className="flex flex-1 items-center gap-2">
                <input
                  className="flex-1 rounded-lg border px-3 py-2 text-sm"
                  placeholder="Görüşmede ara…"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                />
                <button className="px-3 py-2 text-sm rounded-lg border" onClick={() => setQ("")}>
                  Temizle
                </button>
              </div>
              <button
                className="px-3 py-2 text-sm rounded-lg border bg-white hover:bg-gray-50"
                onClick={() => setShowTranscript(false)}
              >
                Kapat
              </button>
            </div>
            <div className="text-xs text-gray-500">
              {filteredTranscript.length} mesaj gösteriliyor
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto pr-1 print:overflow-visible print:h-auto print:max-h-none">
              {filteredTranscript.map((t, i) => (
                <div key={i} className="space-y-2">
                  <Msg role="user" text={t.user} />
                  <Msg role="ai" text={t.ai} />
                  <div className="text-[10px] text-gray-400">{new Date(t.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                className="px-3 py-2 text-sm rounded-lg border bg-white hover:bg-gray-50"
                onClick={() => setShowTranscript(false)}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
</div>
      </div>
    </>
  );
}
