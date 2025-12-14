'use client';

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer
} from 'recharts';

const formatScore = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value ?? '—';
};

const wrapLabel = (text = '', maxLength = 18) => {
  if (!text) return [''];

  const words = String(text).split(/\s+/);
  const lines = [];
  let current = '';

  for (const word of words) {
    if (!word) continue;
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxLength) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines : [''];
};

const LABEL_LINE_HEIGHT = 14;

const AngleTick = ({ payload, x, y, textAnchor, score }) => {
  const rawScore = score ?? payload?.payload?.puan;
  const hasScore = rawScore !== undefined && rawScore !== null && rawScore !== '';
  const displayScore = formatScore(rawScore);
  const labelLines = wrapLabel(payload?.value ?? '');
  const initialDy = labelLines.length > 1 ? -((labelLines.length - 1) * LABEL_LINE_HEIGHT) / 2 : 0;

  return (
    <text x={x} y={y} textAnchor={textAnchor} fill="#334155" fontSize={12}>
      {labelLines.map((line, index) => (
        <tspan
          key={`${payload?.value ?? ''}-${index}`}
          x={x}
          dy={index === 0 ? initialDy : LABEL_LINE_HEIGHT}
        >
          {line}
        </tspan>
      ))}
      {hasScore && (
        <tspan x={x} dy={LABEL_LINE_HEIGHT} fontSize={11} fill="#0f172a" fontWeight="600">
          {displayScore}
        </tspan>
      )}
    </text>
  );
};

export default function RadarScoreChart({ data = [] }) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Gösterilecek puan bulunamadı.
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col">
      <div className="relative flex-1 min-h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            data={data}
            outerRadius="78%"
            margin={{ top: 24, right: 48, bottom: 112, left: 48 }}
            cx="50%"
            cy="38%"
          >
            <PolarGrid />
            <PolarAngleAxis
              dataKey="subject"
              tick={(props) => {
                const tickIndex = typeof props?.payload?.index === 'number' ? props.payload.index : undefined;
                const item = tickIndex !== undefined ? data?.[tickIndex] : undefined;
                return <AngleTick {...props} score={item?.puan} />;
              }}
            />
            <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fontSize: 10 }} />
            <Radar
              name="Puan"
              dataKey="puan"
              stroke="#1f2937"
              fill="#ef4444"
              fillOpacity={0.5}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
