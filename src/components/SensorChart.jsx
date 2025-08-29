import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { TrendingUp, BarChart3 } from "lucide-react";

/*************** utils ***************/
const isNum = (v) => typeof v === "number" && Number.isFinite(v);

// robust numeric parser (1.234,56 & 1,234.56)
const toNum = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (v == null) return null;
  const s = String(v).trim();
  const dot = s.lastIndexOf(".");
  const comma = s.lastIndexOf(",");
  const decSep = dot > comma ? "." : comma > -1 ? "," : null;
  let cleaned = s.replace(/[^0-9.,-]/g, "");
  if (decSep) {
    const other = decSep === "," ? "." : ",";
    cleaned = cleaned.replace(new RegExp("\\" + other, "g"), "");
    cleaned = cleaned.replace(decSep, ".");
  }
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
};

function parseTsToMs(ts) {
  if (ts == null) return null;
  if (typeof ts === "number") return ts < 1e11 ? ts * 1000 : ts;
  if (ts instanceof Date && !isNaN(ts.getTime())) return ts.getTime();
  if (typeof ts === "string") {
    const s = ts.split("TDate")[0].trim();
    const mDMY = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ ,T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (mDMY) {
      const [, dd, mm, yyyy, hh = "0", mi = "0", ss = "0"] = mDMY;
      const d = new Date(+yyyy, +mm - 1, +dd, +hh, +mi, +ss);
      return isNaN(d) ? null : d.getTime();
    }
    const mDate = s.match(/Date\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+))?\s*\)/i);
    if (mDate) {
      let [, y, mo, d, hh = "0", mi = "0", ss = "0"] = mDate;
      const month = +mo >= 1 && +mo <= 12 ? +mo - 1 : +mo;
      const dt = new Date(+y, month, +d, +hh, +mi, +ss);
      return isNaN(dt) ? null : dt.getTime();
    }
    const d2 = new Date(s);
    if (!isNaN(d2)) return d2.getTime();
  }
  return null;
}

const fmtNum = (v, d = 2) => {
  const n = toNum(v);
  return Number.isFinite(n) ? n.toFixed(d) : "-";
};

const clock = (ms) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2,"0")}.${String(d.getMinutes()).padStart(2,"0")}.${String(d.getSeconds()).padStart(2,"0")}`;
};

const normalizeRows = (data = []) => (Array.isArray(data) ? data : []).map((r, i) => ({
  __i: i,
  ts: parseTsToMs(r?.timestamp ?? r?.Timestamp ?? r?.time ?? r?.waktu),
  suhu: toNum(r?.suhu ?? r?.Suhu ?? r?.["Suhu (°C)"] ?? r?.temperature),
  pH: toNum(r?.pH ?? r?.PH ?? r?.Ph),
  flow: toNum(r?.flowRate ?? r?.flow ?? r?.Flow ?? r?.["FlowL/M"] ?? r?.flow_lm),
})).filter(r => r.ts != null).sort((a,b)=>a.ts-b.ts);

const domainFrom = (vals, padPct = 0.06) => {
  const arr = vals.filter(isNum);
  if (!arr.length) return [0, 1];
  let min = Math.min(...arr), max = Math.max(...arr);
  if (min === max) { const pad = Math.max(0.2, Math.abs(min)*padPct||0.5); min -= pad; max += pad; }
  else { const rng = max-min; min -= rng*padPct; max += rng*padPct; }
  return [min, max];
};

/****************** combined chart ******************/
const SensorChart = ({ data = [], maxPoints = 60, title = "Grafik Sensor Hidroponik" }) => {
  const rows = useMemo(() => normalizeRows(data), [data]);
  const series = useMemo(() => rows.slice(-maxPoints), [rows, maxPoints]);

  // domains
  const suhuDomain = useMemo(() => domainFrom(series.map(d=>d.suhu)), [series]);
  const flowTop = useMemo(() => {
    const vals = series.map(d=>d.flow).filter(isNum);
    const m = vals.length ? Math.max(...vals) : 0; return m>0 ? m*1.1 : 0.1;
  }, [series]);

  // last values (sinkron dengan DataLogger)
  const last = series[series.length - 1];
  const latestSig = last ? `${last.ts}-${last.suhu ?? 'x'}-${last.pH ?? 'x'}-${last.flow ?? 'x'}` : 'empty';

  return (
    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1,y:0}} transition={{duration:0.4}} className="glass-effect p-8 rounded-2xl shadow-xl">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-3 bg-green-500 rounded-xl">
          <TrendingUp className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <p className="text-gray-600">Grafik: {series.length} titik • Auto-zoom • Waktu HH.MM.SS</p>
        </div>
      </div>

      {series.length ? (
        <div className="chart-container p-6">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={series} key={latestSig} margin={{ top: 16, right: 24, left: 8, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="ts" domain={["dataMin","dataMax"]} tickFormatter={clock} angle={-45} textAnchor="end" height={70} />

              {/* Suhu axis (kiri) */}
              <YAxis yAxisId="temp" orientation="left" domain={suhuDomain} fontSize={12} label={{ value: "Suhu (°C)", angle: -90, position: "insideLeft" }} />
              {/* pH axis (0–14, hidden) */}
              <YAxis yAxisId="ph" domain={[0,14]} hide />
              {/* Flow axis (kanan) */}
              <YAxis yAxisId="flow" orientation="right" domain={[0, flowTop]} fontSize={12} label={{ value: "Flow (L/min)", angle: 90, position: "insideRight" }} />

              <Tooltip
                labelFormatter={(ts)=>{
                  const d = new Date(ts);
                  const dd = String(d.getDate());
                  const mm = String(d.getMonth()+1);
                  const yyyy = d.getFullYear();
                  const hh = String(d.getHours()).padStart(2,'0');
                  const mi = String(d.getMinutes()).padStart(2,'0');
                  const ss = String(d.getSeconds()).padStart(2,'0');
                  return `${dd}/${mm}/${yyyy}, ${hh}.${mi}.${ss}`;
                }}
                formatter={(val, name)=>{
                  if (name === 'suhu') return [fmtNum(val,2), 'Suhu (°C)'];
                  if (name === 'pH')   return [fmtNum(val,2), 'pH'];
                  if (name === 'flow') return [fmtNum(val,2), 'Flow (L/min)'];
                  return [val, name];
                }}
              />
              <Legend />

              <Line yAxisId="temp" type="monotone" dataKey="suhu" stroke="#22c55e" strokeWidth={2} dot={false} name="Suhu (°C)" animationDuration={240} />
              <Line yAxisId="ph"   type="monotone" dataKey="pH"   stroke="#8b5cf6" strokeWidth={2} dot={false} name="pH" animationDuration={240} />
              <Line yAxisId="flow" type="monotone" dataKey="flow" stroke="#f59e0b" strokeWidth={2} dot={false} name="Flow (L/min)" animationDuration={240} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="text-center py-12">
          <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Menunggu data...</p>
        </div>
      )}

      {/* cards (optional, hapus jika sudah ada di tempat lain) */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{fmtNum(last?.suhu, 1)}°C</div>
          <div className="text-sm text-green-700">Suhu (last)</div>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{fmtNum(last?.pH, 2)}</div>
          <div className="text-sm text-purple-700">pH (last)</div>
        </div>
        <div className="text-center p-4 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{fmtNum(last?.flow, 2)} L/min</div>
          <div className="text-sm text-orange-700">Flow Rate (last)</div>
        </div>
      </div>
    </motion.div>
  );
};

export default SensorChart;
