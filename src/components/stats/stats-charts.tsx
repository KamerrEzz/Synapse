"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DayPoint, NamedCount } from "@/lib/stats/types";

const spark = "#d4a054";
const ok = "#6b9e6e";
const mist = "#b7afa4";
const line = "#3a3228";
const PIE = [spark, ok, mist, "#c45c4a", "#8a7a68", "#e0b36a"];

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-ink px-3 py-2 text-xs text-paper shadow-lg">
      <p className="mb-1 text-mist">{label}</p>
      {payload.map((item) => (
        <p key={item.name}>
          <span style={{ color: item.color }}>{item.name}</span>
          {": "}
          {typeof item.value === "number" ? item.value.toLocaleString("es") : item.value}
        </p>
      ))}
    </div>
  );
}

const axis = { fill: mist, fontSize: 11 };
const grid = { stroke: line, strokeDasharray: "3 3" };

export function UsageAreaChart({ data }: { data: DayPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid {...grid} />
          <XAxis dataKey="day" tick={axis} tickFormatter={(d: string) => d.slice(5)} />
          <YAxis tick={axis} width={48} />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="tokens"
            name="Chat / RAG"
            stroke={spark}
            fill={spark}
            fillOpacity={0.25}
          />
          <Area
            type="monotone"
            dataKey="embeddingTokens"
            name="Embeddings"
            stroke={ok}
            fill={ok}
            fillOpacity={0.2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CostBarChart({ data }: { data: DayPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid {...grid} />
          <XAxis dataKey="day" tick={axis} tickFormatter={(d: string) => d.slice(5)} />
          <YAxis tick={axis} width={56} tickFormatter={(v: number) => `$${v.toFixed(3)}`} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const usd = Number(payload[0]?.value ?? 0);
              return (
                <div className="rounded-lg border border-line bg-ink px-3 py-2 text-xs text-paper">
                  <p className="text-mist">{label}</p>
                  <p>USD {usd.toFixed(6)}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="usd" name="USD" fill={spark} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function NamedBarChart({
  data,
  unit,
}: {
  data: NamedCount[];
  unit?: string;
}) {
  if (!data.length) {
    return <p className="py-10 text-center text-sm text-mist">Sin datos en este rango.</p>;
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid {...grid} horizontal={false} />
          <XAxis
            type="number"
            tick={axis}
            tickFormatter={(v: number) => (unit === "USD" ? `$${v.toFixed(3)}` : String(v))}
          />
          <YAxis type="category" dataKey="label" tick={axis} width={110} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const raw = Number(payload[0]?.value ?? 0);
              const shown = unit === "USD" ? `$${raw.toFixed(6)}` : raw.toLocaleString("es");
              return (
                <div className="rounded-lg border border-line bg-ink px-3 py-2 text-xs text-paper shadow-lg">
                  <p className="mb-1 text-mist">{label}</p>
                  <p>
                    {unit || "Tokens"}: {shown}
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="value" name={unit || "Tokens"} radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={entry.key} fill={PIE[i % PIE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ActivityChart({ data }: { data: DayPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid {...grid} />
          <XAxis dataKey="day" tick={axis} tickFormatter={(d: string) => d.slice(5)} />
          <YAxis tick={axis} width={40} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="messages" name="Chat" stroke={mist} fill={mist} fillOpacity={0.2} />
          <Area type="monotone" dataKey="aiTurns" name="Respuestas IA" stroke={spark} fill={spark} fillOpacity={0.25} />
          <Area type="monotone" dataKey="files" name="Archivos" stroke={ok} fill={ok} fillOpacity={0.15} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MixPie({ data }: { data: NamedCount[] }) {
  const rows = data.filter((d) => d.value > 0);
  if (!rows.length) {
    return <p className="py-10 text-center text-sm text-mist">Sin datos en este rango.</p>;
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={rows}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={88}
            paddingAngle={2}
          >
            {rows.map((entry, i) => (
              <Cell key={entry.key} fill={PIE[i % PIE.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: mist }}
            formatter={(value: string) => <span className="text-mist">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
