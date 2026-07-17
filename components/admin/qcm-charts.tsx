"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { matiereLabel } from "@/lib/qcm/labels";

/**
 * Graphiques du tableau de bord Analytics QCM (Recharts). Client uniquement.
 * Palette fixe lisible en thème clair comme sombre ; axes et grille en
 * `currentColor` atténué pour s'accorder au thème via la classe Tailwind du
 * conteneur.
 */

export const CHART_PALETTE = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#db2777",
  "#7c3aed",
  "#0891b2",
];

const AXIS_PROPS = {
  stroke: "currentColor",
  tick: { fontSize: 12, fill: "currentColor" },
  className: "text-muted-foreground",
} as const;

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="text-muted-foreground flex h-[260px] items-center justify-center text-sm">
      {message}
    </div>
  );
}

export function ScoreLineChart({
  data,
}: {
  data: { date: string; avgScore: number | null }[];
}) {
  const points = data.filter((d) => d.avgScore !== null);
  if (points.length === 0)
    return <ChartEmpty message="Pas encore de score enregistré." />;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          className="text-border"
          stroke="currentColor"
        />
        <XAxis dataKey="date" {...AXIS_PROPS} tickFormatter={(d: string) => d.slice(5)} />
        <YAxis domain={[0, 100]} {...AXIS_PROPS} />
        <Tooltip
          formatter={(value) => [`${String(value)}%`, "Score moyen"]}
          labelClassName="text-foreground"
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Line
          type="monotone"
          dataKey="avgScore"
          stroke={CHART_PALETTE[0]}
          strokeWidth={2}
          dot={{ r: 3 }}
          name="Score moyen"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ScoreProgressionChart({
  data,
}: {
  data: { completedAt: string; scorePercent: number | null }[];
}) {
  const points = data
    .filter((d) => d.scorePercent !== null)
    .map((d, i) => ({
      index: i + 1,
      score: d.scorePercent as number,
      date: d.completedAt.slice(0, 10),
    }));
  if (points.length === 0) return <ChartEmpty message="Aucune tentative notée." />;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          className="text-border"
          stroke="currentColor"
        />
        <XAxis dataKey="index" {...AXIS_PROPS} />
        <YAxis domain={[0, 100]} {...AXIS_PROPS} />
        <Tooltip
          formatter={(value) => [`${String(value)}%`, "Score"]}
          labelFormatter={(label) => `Tentative ${String(label)}`}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke={CHART_PALETTE[4]}
          strokeWidth={2}
          dot={{ r: 3 }}
          name="Score"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function MatierePieChart({
  data,
}: {
  data: { matiere: string; count: number }[];
}) {
  if (data.length === 0) return <ChartEmpty message="Aucune donnée." />;
  const chartData = data.map((d) => ({ name: matiereLabel(d.matiere), value: d.count }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [`${String(value)} QCM`, String(name)]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function DepartementBarChart({
  data,
}: {
  data: { label: string; count: number }[];
}) {
  if (data.length === 0) return <ChartEmpty message="Aucune donnée." />;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          className="text-border"
          stroke="currentColor"
        />
        <XAxis dataKey="label" {...AXIS_PROPS} />
        <YAxis {...AXIS_PROPS} allowDecimals={false} />
        <Tooltip
          formatter={(value) => [`${String(value)} QCM`, "Tentatives"]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Bar
          dataKey="count"
          fill={CHART_PALETTE[1]}
          radius={[4, 4, 0, 0]}
          name="Tentatives"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TimeByMatiereChart({
  data,
}: {
  data: { matiere: string; avgDurationSeconds: number | null }[];
}) {
  const chartData = data
    .filter((d) => d.avgDurationSeconds !== null)
    .map((d) => ({
      name: matiereLabel(d.matiere),
      minutes: Math.round((d.avgDurationSeconds! / 60) * 10) / 10,
    }));
  if (chartData.length === 0) return <ChartEmpty message="Aucune durée enregistrée." />;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          className="text-border"
          stroke="currentColor"
        />
        <XAxis dataKey="name" {...AXIS_PROPS} />
        <YAxis {...AXIS_PROPS} />
        <Tooltip
          formatter={(value) => [`${String(value)} min`, "Temps moyen"]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Bar
          dataKey="minutes"
          fill={CHART_PALETTE[2]}
          radius={[4, 4, 0, 0]}
          name="Temps moyen"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PeriodEvolutionChart({
  data,
}: {
  data: { label: string; count: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          className="text-border"
          stroke="currentColor"
        />
        <XAxis dataKey="label" {...AXIS_PROPS} />
        <YAxis {...AXIS_PROPS} allowDecimals={false} />
        <Tooltip
          formatter={(value) => [`${String(value)} QCM`, "Réalisés"]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Bar
          dataKey="count"
          fill={CHART_PALETTE[0]}
          radius={[4, 4, 0, 0]}
          name="Réalisés"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
