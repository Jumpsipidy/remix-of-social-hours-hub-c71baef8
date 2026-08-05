import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { BarChart3 } from "lucide-react";

export type ChartPoint = { label: string; hrs: number };
export type PieSlice = { name: string; value: number; color: string };

export function OrgAnalytics({ chartData, pieData, totalHours }: { chartData: ChartPoint[]; pieData: PieSlice[]; totalHours: number }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Valandų srautas (30 d.)</h2>
            <p className="text-xs text-muted-foreground">Užbaigtos savanorystės valandos pagal dieną.</p>
          </div>
          <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            {totalHours} val. per 30 d.
          </span>
        </div>
        <div className="mt-4 h-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="ohrs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
              <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="hrs" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#ohrs)" name="Valandos" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md">
        <h2 className="text-lg font-bold">Rezervacijų būsenos</h2>
        <p className="text-xs text-muted-foreground">Visos gautos užklausos.</p>
        {pieData.length > 0 ? (
          <div className="mt-2 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={38} outerRadius={70} paddingAngle={3} stroke="none">
                  {pieData.map((e) => <Cell key={e.name} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">Nėra duomenų</div>
        )}
      </div>
    </div>
  );
}
