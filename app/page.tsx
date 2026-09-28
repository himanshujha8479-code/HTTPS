"use client";

import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { supabase } from "@/lib/supabase";

type Trade = {
  id: number;
  pair: string;
  type: string | null;
  entry: number | null;
  sl: number | null;
  tp: number | null;
  exit: number | null;
  lot: number | null;
  risk: number | null;
  pnl: number | null;
  created_at: string | null;
  user_id: string | null;
};

type FormState = {
  pair: string;
  type: string;
  entry: string;
  sl: string;
  tp: string;
  exit: string;
  lot: string;
  risk: string;
  pnl: string;
};

const emptyForm: FormState = {
  pair: "",
  type: "BUY",
  entry: "",
  sl: "",
  tp: "",
  exit: "",
  lot: "",
  risk: "",
  pnl: "",
};

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "⌂" },
  { id: "history", label: "Trade History", icon: "◫" },
];

function money(value: number) {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

function numberValue(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return Number(value).toFixed(2);
}

function dateText(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 2,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const reducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(value);
      return;
    }

    const start = display;
    const difference = value - start;
    const duration = 700;
    const startTime = performance.now();

    let frame = 0;

    const animate = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplay(start + difference * eased);

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reducedMotion]);

  return (
    <>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </>
  );
}

function GlassCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      whileHover={{ y: -2 }}
      className={`rounded-2xl border border-white/[0.07] bg-white/[0.035] backdrop-blur-xl shadow-[0_20px_70px_rgba(0,0,0,0.18)] ${className}`}
    >
      {children}
    </motion.div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  positive,
  icon,
}: {
  title: string;
  value: ReactNode;
  subtitle?: string;
  positive?: boolean;
  icon: string;
}) {
  return (
    <GlassCard className="relative overflow-hidden p-4">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-400/[0.06] blur-2xl" />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            {title}
          </p>

          <div
            className={`mt-3 text-2xl font-semibold tracking-tight ${
              positive === true
                ? "text-emerald-300"
                : positive === false
                  ? "text-rose-300"
                  : "text-white"
            }`}
          >
            {value}
          </div>

          {subtitle && (
            <p className="mt-1 text-[11px] text-zinc-500">{subtitle}</p>
          )}
        </div>

        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.04] text-sm text-zinc-300">
          {icon}
        </div>
      </div>
    </GlassCard>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <h2 className="text-base font-semibold tracking-tight text-white">
        {title}
      </h2>
      {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
    </div>
  );
}

function EquityChart({ trades }: { trades: Trade[] }) {
  const points = useMemo(() => {
    let total = 0;

    const values = trades.map((trade) => {
      total += Number(trade.pnl ?? 0);
      return total;
    });

    if (!values.length) return [0, 0];

    return [0, ...values];
  }, [trades]);

  const width = 800;
  const height = 230;
  const paddingX = 18;
  const paddingY = 25;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((value, index) => {
    const x =
      paddingX +
      (index / Math.max(points.length - 1, 1)) * (width - paddingX * 2);

    const y =
      height -
      paddingY -
      ((value - min) / range) * (height - paddingY * 2);

    return { x, y };
  });

  const line = coords.map((point, index) =>
    `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
  ).join(" ");

  const area = `${line} L ${width - paddingX} ${height - paddingY} L ${paddingX} ${height - paddingY} Z`;

  const finalValue = points[points.length - 1] ?? 0;

  return (
    <GlassCard className="overflow-hidden p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Equity Curve
          </p>
          <p
            className={`mt-2 text-2xl font-semibold ${
              finalValue >= 0 ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {money(finalValue)}
          </p>
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs text-zinc-500">
          Cumulative P&L
        </div>
      </div>

      <div className="mt-4 h-[230px] w-full">
        {trades.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-600">
            Add trades to see your equity curve
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-full w-full overflow-visible"
          >
            <defs>
              <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopOpacity="0.18" />
                <stop offset="100%" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0.25, 0.5, 0.75].map((position) => (
              <line
                key={position}
                x1={paddingX}
                x2={width - paddingX}
                y1={height * position}
                y2={height * position}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="4 8"
              />
            ))}

            <path
              d={area}
              fill="url(#equityFill)"
              opacity="0.8"
            />

            <motion.path
              d={line}
              fill="none"
              stroke="currentColor"
              className={
                finalValue >= 0
                  ? "text-emerald-300"
                  : "text-rose-300"
              }
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />

            {coords.length > 1 && (
              <motion.circle
                cx={coords[coords.length - 1].x}
                cy={coords[coords.length - 1].y}
                r="5"
                className={
                  finalValue >= 0
                    ? "fill-emerald-300"
                    : "fill-rose-300"
                }
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.1 }}
              />
            )}
          </svg>
        )}
      </div>
    </GlassCard>
  );
}

function WinLossCircle({
  wins,
  losses,
}: {
  wins: number;
  losses: number;
}) {
  const total = wins + losses;
  const winRate = total ? (wins / total) * 100 : 0;

  const circumference = 2 * Math.PI * 70;
  const dash = (winRate / 100) * circumference;

  return (
    <GlassCard className="p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        Performance
      </p>

      <div className="mt-3 flex items-center justify-center">
        <div className="relative h-36 w-36">
          <svg
            viewBox="0 0 180 180"
            className="h-full w-full -rotate-90"
          >
            <circle
              cx="90"
              cy="90"
              r="70"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="13"
            />

            <motion.circle
              cx="90"
              cy="90"
              r="70"
              fill="none"
              stroke="currentColor"
              className="text-emerald-300"
              strokeWidth="13"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: `${dash} ${circumference}` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white">
              <AnimatedNumber value={winRate} decimals={1} suffix="%" />
            </span>
            <span className="mt-1 text-xs text-zinc-500">Win Rate</span>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/[0.05] bg-white/[0.025] p-2.5">
          <p className="text-xs text-zinc-500">Wins</p>
          <p className="mt-0.5 text-sm font-semibold text-emerald-300">{wins}</p>
        </div>

        <div className="rounded-lg border border-white/[0.05] bg-white/[0.025] p-2.5">
          <p className="text-xs text-zinc-500">Losses</p>
          <p className="mt-0.5 text-sm font-semibold text-rose-300">{losses}</p>
        </div>
      </div>
    </GlassCard>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-zinc-400">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-white/[0.08] bg-black/20 px-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-cyan-300/40 focus:bg-white/[0.035]"
      />
    </label>
  );
}


function MotivationHero() {
  const candles: Array<[number, number, number, boolean]> = [
    [6, 54, 18, true], [12, 42, 28, false], [18, 58, 22, true],
    [25, 35, 34, true], [32, 48, 20, false], [39, 30, 38, true],
    [47, 50, 24, false], [54, 28, 42, true], [62, 43, 25, true],
    [69, 32, 36, false], [76, 52, 22, true], [84, 26, 44, true],
    [91, 44, 30, false],
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative isolate overflow-hidden rounded-3xl border border-white/[0.08] bg-[#05080d] shadow-[0_30px_100px_rgba(0,0,0,0.42)]"
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "46px 46px",
        }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(34,211,238,0.10),transparent_38%),radial-gradient(circle_at_8%_50%,rgba(16,185,129,0.08),transparent_28%),radial-gradient(circle_at_92%_50%,rgba(244,63,94,0.07),transparent_28%)]" />

      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full opacity-70"
        aria-hidden="true"
      >
        {candles.map(([x, y, height, bullish], index) => {
          const wickTop = Math.max(8, y - 9);
          const wickBottom = Math.min(92, y + height + 9);
          return (
            <g key={index}>
              <line
                x1={x}
                x2={x}
                y1={wickTop}
                y2={wickBottom}
                stroke={bullish ? "#34d399" : "#fb7185"}
                strokeWidth="0.7"
                opacity="0.72"
              />
              <rect
                x={x - 1.5}
                y={y}
                width="3"
                height={height}
                rx="0.55"
                fill={bullish ? "#10b981" : "#ef4444"}
                opacity="0.58"
              />
              <rect
                x={x - 1.5}
                y={y}
                width="3"
                height="2"
                rx="0.55"
                fill={bullish ? "#6ee7b7" : "#fda4af"}
                opacity="0.9"
              />
            </g>
          );
        })}
      </svg>

      <div className="absolute inset-0 bg-gradient-to-r from-[#05080d]/80 via-[#05080d]/35 to-[#05080d]/80" />

      <div className="relative flex min-h-[310px] items-center justify-center px-6 py-14 text-center sm:min-h-[350px] sm:px-12">
        <div className="max-w-5xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-black/25 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-300/80 backdrop-blur-md">
            Trader Mindset
          </div>

          <h2 className="font-sans text-4xl font-black uppercase leading-[1.05] tracking-[-0.035em] text-white drop-shadow-[0_8px_35px_rgba(0,0,0,0.65)] sm:text-5xl md:text-6xl lg:text-7xl">
            GIVE UP IS NOT IN THE BLOOD <span className="text-emerald-300">SIRR</span>
          </h2>

          <div className="mx-auto mt-8 h-px w-32 bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent" />
        </div>
      </div>
    </motion.section>
  );
}

export default function Home() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState<"all" | "day" | "month">("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.replace("/login");
        return;
      }

      if (!mounted) return;

      setUserEmail(data.session.user.email ?? "");

      const { data: rows, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", data.session.user.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error(error);
      } else {
        setTrades((rows ?? []) as Trade[]);
      }

      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => setToast(""), 2500);

    return () => clearTimeout(timer);
  }, [toast]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();

    trades.forEach((trade) => {
      if (trade.created_at) {
        months.add(trade.created_at.slice(0, 7));
      }
    });

    return Array.from(months).sort().reverse();
  }, [trades]);

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      if (!trade.created_at) return false;

      const date = trade.created_at.slice(0, 10);
      const month = trade.created_at.slice(0, 7);

      if (filter === "day") {
        return selectedDate ? date === selectedDate : true;
      }

      if (filter === "month") {
        return selectedMonth ? month === selectedMonth : true;
      }

      return true;
    });
  }, [trades, filter, selectedDate, selectedMonth]);

  const stats = useMemo(() => {
    const pnlValues = filteredTrades.map((t) => Number(t.pnl ?? 0));

    const totalPnl = pnlValues.reduce((sum, value) => sum + value, 0);

    const wins = filteredTrades.filter((t) => Number(t.pnl ?? 0) > 0);
    const losses = filteredTrades.filter((t) => Number(t.pnl ?? 0) < 0);

    const total = wins.length + losses.length;

    const averageWin = wins.length
      ? wins.reduce((sum, t) => sum + Number(t.pnl ?? 0), 0) /
        wins.length
      : 0;

    const averageLoss = losses.length
      ? Math.abs(
          losses.reduce((sum, t) => sum + Number(t.pnl ?? 0), 0) /
            losses.length
        )
      : 0;

    const totalProfit = wins.reduce(
      (sum, t) => sum + Number(t.pnl ?? 0),
      0
    );

    const totalLoss = Math.abs(
      losses.reduce((sum, t) => sum + Number(t.pnl ?? 0), 0)
    );

    const profitFactor =
      totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;

    let currentStreak = 0;
    let streakType: "WIN" | "LOSS" | "NONE" = "NONE";

    for (let i = filteredTrades.length - 1; i >= 0; i--) {
      const pnl = Number(filteredTrades[i].pnl ?? 0);

      if (pnl === 0) continue;

      const type = pnl > 0 ? "WIN" : "LOSS";

      if (streakType === "NONE") {
        streakType = type;
        currentStreak = 1;
      } else if (type === streakType) {
        currentStreak++;
      } else {
        break;
      }
    }

    const largestWin = wins.length
      ? Math.max(...wins.map((t) => Number(t.pnl ?? 0)))
      : 0;

    const largestLoss = losses.length
      ? Math.min(...losses.map((t) => Number(t.pnl ?? 0)))
      : 0;

    const riskValues = filteredTrades
      .map((t) => Number(t.risk ?? 0))
      .filter((v) => v > 0);

    const averageRisk = riskValues.length
      ? riskValues.reduce((a, b) => a + b, 0) / riskValues.length
      : 0;

    return {
      totalPnl,
      wins: wins.length,
      losses: losses.length,
      total,
      winRate: total ? (wins.length / total) * 100 : 0,
      averageWin,
      averageLoss,
      totalProfit,
      totalLoss,
      profitFactor,
      currentStreak,
      streakType,
      largestWin,
      largestLoss,
      averageRisk,
    };
  }, [filteredTrades]);

  const recentTrades = useMemo(() => {
    return [...filteredTrades].reverse().slice(0, 8);
  }, [filteredTrades]);

  function openAddTrade() {
    setEditingTrade(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEditTrade(trade: Trade) {
    setEditingTrade(trade);

    setForm({
      pair: trade.pair ?? "",
      type: trade.type ?? "BUY",
      entry: trade.entry?.toString() ?? "",
      sl: trade.sl?.toString() ?? "",
      tp: trade.tp?.toString() ?? "",
      exit: trade.exit?.toString() ?? "",
      lot: trade.lot?.toString() ?? "",
      risk: trade.risk?.toString() ?? "",
      pnl: trade.pnl?.toString() ?? "",
    });

    setModalOpen(true);
  }

  async function saveTrade(event: FormEvent) {
    event.preventDefault();

    if (!form.pair.trim()) {
      setToast("Please enter a trading pair");
      return;
    }

    setSaving(true);

    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      router.replace("/login");
      return;
    }

    const payload = {
      pair: form.pair.trim().toUpperCase(),
      type: form.type,
      entry: form.entry ? Number(form.entry) : null,
      sl: form.sl ? Number(form.sl) : null,
      tp: form.tp ? Number(form.tp) : null,
      exit: form.exit ? Number(form.exit) : null,
      lot: form.lot ? Number(form.lot) : null,
      risk: form.risk ? Number(form.risk) : null,
      pnl: form.pnl ? Number(form.pnl) : null,
      user_id: data.session.user.id,
    };

    if (editingTrade) {
      const { data: updated, error } = await supabase
        .from("trades")
        .update(payload)
        .eq("id", editingTrade.id)
        .eq("user_id", data.session.user.id)
        .select()
        .single();

      if (error) {
        console.error(error);
        setToast("Could not update trade");
      } else {
        setTrades((current) =>
          current.map((trade) =>
            trade.id === editingTrade.id
              ? (updated as Trade)
              : trade
          )
        );

        setToast("Trade updated");
        setModalOpen(false);
      }
    } else {
      const { data: inserted, error } = await supabase
        .from("trades")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error(error);
        setToast("Could not save trade");
      } else {
        setTrades((current) => [...current, inserted as Trade]);
        setToast("Trade added");
        setModalOpen(false);
      }
    }

    setSaving(false);
  }

  async function deleteTrade(id: number) {
    if (!confirm("Delete this trade?")) return;

    const { data } = await supabase.auth.getSession();

    if (!data.session) return;

    const { error } = await supabase
      .from("trades")
      .delete()
      .eq("id", id)
      .eq("user_id", data.session.user.id);

    if (error) {
      console.error(error);
      setToast("Could not delete trade");
      return;
    }

    setTrades((current) => current.filter((trade) => trade.id !== id));
    setToast("Trade deleted");
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function clearFilters() {
    setFilter("all");
    setSelectedDate("");
    setSelectedMonth("");
  }

  function formatMonth(month: string) {
    const date = new Date(`${month}-01T00:00:00`);

    return date.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
  }

  const filterTitle =
    filter === "day" && selectedDate
      ? `Trading Activity — ${dateText(selectedDate)}`
      : filter === "month" && selectedMonth
        ? `Trading Activity — ${formatMonth(selectedMonth)}`
        : "All Trading Activity";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090d] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
            Loading trading journal...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#07090d] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[15%] top-[-10%] h-96 w-96 rounded-full bg-cyan-400/[0.035] blur-[120px]" />
        <div className="absolute right-[-5%] top-[25%] h-96 w-96 rounded-full bg-emerald-400/[0.025] blur-[120px]" />
      </div>

      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-56 border-r border-white/[0.06] bg-[#080a0f]/90 px-5 py-6 backdrop-blur-2xl lg:block">
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/[0.08] text-sm text-cyan-200">
              ◈
            </div>

            <div>
              <p className="text-sm font-semibold tracking-wide text-white">
                Trading Journal
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                Terminal
              </p>
            </div>
          </div>

          <div className="mt-7 space-y-1">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="group flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
              >
                <span className="text-sm text-zinc-500 transition group-hover:text-cyan-300">
                  {item.icon}
                </span>
                {item.label}
              </a>
            ))}

            <button
              onClick={openAddTrade}
              className="mt-2 flex w-full items-center gap-2.5 rounded-lg border border-cyan-300/10 bg-cyan-300/[0.07] px-3 py-3 text-sm text-cyan-100 transition hover:bg-cyan-300/[0.12]"
            >
              <span className="text-sm">＋</span>
              Add Trade
            </button>
          </div>

          <div className="mt-auto border-t border-white/[0.06] pt-5">
            <div className="mb-4 truncate px-2 text-xs text-zinc-600">
              {userEmail}
            </div>

            <button
              onClick={logout}
              className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-zinc-500 transition hover:bg-rose-300/[0.05] hover:text-rose-300"
            >
              ↪ Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="relative lg:ml-56">
        <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#07090d]/75 backdrop-blur-2xl">
          <div className="flex h-16 items-center justify-between px-5 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.035] text-cyan-200 lg:hidden">
                ◈
              </div>

              <div>
                <p className="text-sm font-semibold text-white">
                  Trading Journal
                </p>
                <p className="hidden text-[10px] uppercase tracking-[0.18em] text-zinc-600 sm:block">
                  Personal Trading Terminal
                </p>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={openAddTrade}
              className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.09] px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/[0.14]"
            >
              <span className="mr-1">＋</span>
              Add Trade
            </motion.button>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] px-5 py-6 sm:px-7 lg:px-8">
          <section id="dashboard">
            <MotivationHero />

            <div className="mb-5 mt-12">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-300/70">
                Dashboard
              </p>

              <div className="mt-1.5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    Your trading performance
                  </h1>
                  <p className="mt-2 text-sm text-zinc-500">
                    Track your execution, risk and P&L in one place.
                  </p>
                </div>

                <div className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-1.5 text-[11px] text-zinc-500">
                  {filteredTrades.length} trade
                  {filteredTrades.length === 1 ? "" : "s"} in view
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total P&L"
                value={
                  <AnimatedNumber
                    value={stats.totalPnl}
                    prefix={stats.totalPnl >= 0 ? "+$" : "-$"}
                  />
                }
                subtitle="Selected period"
                positive={stats.totalPnl >= 0}
                icon="↗"
              />

              <StatCard
                title="Win Rate"
                value={
                  <AnimatedNumber
                    value={stats.winRate}
                    suffix="%"
                    decimals={1}
                  />
                }
                subtitle={`${stats.wins} wins / ${stats.losses} losses`}
                icon="%"
              />

              <StatCard
                title="Total Trades"
                value={stats.total}
                subtitle="Executed trades"
                icon="◫"
              />

              <StatCard
                title="Current Streak"
                value={`${stats.currentStreak} ${
                  stats.streakType === "NONE" ? "" : stats.streakType
                }`}
                subtitle="Consecutive result"
                positive={
                  stats.streakType === "WIN"
                    ? true
                    : stats.streakType === "LOSS"
                      ? false
                      : undefined
                }
                icon="🔥"
              />
            </div>

            <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.7fr)]">
              <EquityChart trades={filteredTrades} />

              <WinLossCircle
                wins={stats.wins}
                losses={stats.losses}
              />
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Average Win"
                value={
                  <AnimatedNumber
                    value={stats.averageWin}
                    prefix="+$"
                  />
                }
                positive
                icon="↑"
              />

              <StatCard
                title="Average Loss"
                value={
                  <AnimatedNumber
                    value={stats.averageLoss}
                    prefix="-$"
                  />
                }
                positive={false}
                icon="↓"
              />

              <StatCard
                title="Profit Factor"
                value={
                  Number.isFinite(stats.profitFactor)
                    ? stats.profitFactor.toFixed(2)
                    : "∞"
                }
                subtitle="Gross profit / gross loss"
                icon="◆"
              />

              <StatCard
                title="Average Risk"
                value={
                  <AnimatedNumber
                    value={stats.averageRisk}
                    prefix="$"
                  />
                }
                subtitle="Per recorded trade"
                icon="◉"
              />
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              <GlassCard className="p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Total Profit
                </p>
                <p className="mt-2 text-xl font-semibold text-emerald-300">
                  +${stats.totalProfit.toFixed(2)}
                </p>
              </GlassCard>

              <GlassCard className="p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Total Loss
                </p>
                <p className="mt-2 text-xl font-semibold text-rose-300">
                  -${stats.totalLoss.toFixed(2)}
                </p>
              </GlassCard>

              <GlassCard className="p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Largest Win / Loss
                </p>
                <div className="mt-3 flex gap-5">
                  <div>
                    <p className="text-xs text-zinc-600">Win</p>
                    <p className="mt-0.5 text-sm font-semibold text-emerald-300">
                      +${stats.largestWin.toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-600">Loss</p>
                    <p className="mt-0.5 text-sm font-semibold text-rose-300">
                      ${stats.largestLoss.toFixed(2)}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </section>

          <section id="history" className="mt-9 scroll-mt-24">
            <GlassCard className="overflow-hidden">
              <div className="border-b border-white/[0.06] p-4 sm:p-5">
                <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
                  <SectionTitle
                    title={filterTitle}
                    subtitle="Review and manage your recorded trades."
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setFilter("all");
                        setSelectedDate("");
                        setSelectedMonth("");
                      }}
                      className={`rounded-lg px-3 py-2 text-xs transition ${
                        filter === "all"
                          ? "bg-white/[0.08] text-white"
                          : "text-zinc-500 hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      All Time
                    </button>

                    <button
                      onClick={() => setFilter("day")}
                      className={`rounded-lg px-3 py-2 text-xs transition ${
                        filter === "day"
                          ? "bg-cyan-300/[0.1] text-cyan-200"
                          : "text-zinc-500 hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      Single Day
                    </button>

                    <button
                      onClick={() => setFilter("month")}
                      className={`rounded-lg px-3 py-2 text-xs transition ${
                        filter === "month"
                          ? "bg-cyan-300/[0.1] text-cyan-200"
                          : "text-zinc-500 hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      Single Month
                    </button>

                    <button
                      onClick={clearFilters}
                      className="rounded-lg px-3 py-2 text-xs text-zinc-600 transition hover:text-zinc-300"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {filter === "day" && (
                    <motion.div
                      key="day"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 overflow-hidden"
                    >
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40"
                      />
                    </motion.div>
                  )}

                  {filter === "month" && (
                    <motion.div
                      key="month"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 overflow-hidden"
                    >
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="rounded-xl border border-white/[0.08] bg-[#0b0e13] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40"
                      >
                        <option value="">Select month</option>

                        {availableMonths.map((month) => (
                          <option key={month} value={month}>
                            {formatMonth(month)}
                          </option>
                        ))}
                      </select>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="overflow-x-auto">
                {recentTrades.length === 0 ? (
                  <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] text-base text-zinc-600">
                      ◫
                    </div>

                    <p className="mt-4 text-sm font-medium text-zinc-400">
                      No trades found
                    </p>

                    <p className="mt-1 text-xs text-zinc-600">
                      Try another filter or add your first trade.
                    </p>

                    <button
                      onClick={openAddTrade}
                      className="mt-4 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.07] px-4 py-2.5 text-xs text-cyan-200 transition hover:bg-cyan-300/[0.12]"
                    >
                      Add Trade
                    </button>
                  </div>
                ) : (
                  <table className="w-full min-w-[950px] text-left">
                    <thead>
                      <tr className="border-b border-white/[0.05] text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                        <th className="px-4 py-3 font-medium">Pair</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Entry</th>
                        <th className="px-4 py-3 font-medium">SL</th>
                        <th className="px-4 py-3 font-medium">TP</th>
                        <th className="px-4 py-3 font-medium">Exit</th>
                        <th className="px-4 py-3 font-medium">Lot</th>
                        <th className="px-4 py-3 font-medium">Risk</th>
                        <th className="px-4 py-3 font-medium">P&L</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentTrades.map((trade, index) => {
                        const pnl = Number(trade.pnl ?? 0);
                        const isWin = pnl > 0;

                        return (
                          <motion.tr
                            key={trade.id}
                            initial={
                              reducedMotion
                                ? false
                                : { opacity: 0, y: 8 }
                            }
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: Math.min(index * 0.035, 0.25),
                            }}
                            className="border-b border-white/[0.04] transition hover:bg-white/[0.025]"
                          >
                            <td className="px-5 py-4">
                              <span className="font-medium text-white">
                                {trade.pair}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${
                                  trade.type === "BUY"
                                    ? "bg-emerald-300/[0.08] text-emerald-300"
                                    : "bg-rose-300/[0.08] text-rose-300"
                                }`}
                              >
                                {trade.type ?? "-"}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-sm text-zinc-400">
                              {numberValue(trade.entry)}
                            </td>

                            <td className="px-4 py-3 text-sm text-zinc-500">
                              {numberValue(trade.sl)}
                            </td>

                            <td className="px-4 py-3 text-sm text-zinc-500">
                              {numberValue(trade.tp)}
                            </td>

                            <td className="px-4 py-3 text-sm text-zinc-400">
                              {numberValue(trade.exit)}
                            </td>

                            <td className="px-4 py-3 text-sm text-zinc-500">
                              {numberValue(trade.lot)}
                            </td>

                            <td className="px-4 py-3 text-sm text-zinc-500">
                              {trade.risk !== null
                                ? `$${numberValue(trade.risk)}`
                                : "-"}
                            </td>

                            <td
                              className={`px-5 py-4 text-sm font-semibold ${
                                isWin
                                  ? "text-emerald-300"
                                  : pnl < 0
                                    ? "text-rose-300"
                                    : "text-zinc-500"
                              }`}
                            >
                              {pnl === 0 ? "$0.00" : money(pnl)}
                            </td>

                            <td className="px-4 py-3 text-xs text-zinc-600">
                              {dateText(trade.created_at)}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => openEditTrade(trade)}
                                  className="rounded-md border border-white/[0.06] px-2 py-1 text-[11px] text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
                                >
                                  Edit
                                </button>

                                <button
                                  onClick={() => deleteTrade(trade.id)}
                                  className="rounded-md border border-rose-300/[0.08] px-2 py-1 text-[11px] text-rose-300/60 transition hover:bg-rose-300/[0.06] hover:text-rose-300"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {filteredTrades.length > 8 && (
                <div className="border-t border-white/[0.05] px-5 py-4 text-center text-xs text-zinc-600">
                  Showing the latest 8 trades from the selected period.
                </div>
              )}
            </GlassCard>
          </section>
        </div>
      </main>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                setModalOpen(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              transition={{ duration: 0.25 }}
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#0b0e13] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-300/70">
                    Trading Journal
                  </p>

                  <h2 className="mt-1 text-xl font-semibold text-white">
                    {editingTrade ? "Edit Trade" : "Add New Trade"}
                  </h2>
                </div>

                <button
                  onClick={() => setModalOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
                >
                  ×
                </button>
              </div>

              <form onSubmit={saveTrade} className="space-y-4 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Pair"
                    value={form.pair}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        pair: value,
                      }))
                    }
                    placeholder="EURUSD"
                  />

                  <label className="block">
                    <span className="mb-2 block text-xs font-medium text-zinc-400">
                      Type
                    </span>

                    <select
                      value={form.type}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          type: e.target.value,
                        }))
                      }
                      className="h-10 w-full rounded-lg border border-white/[0.08] bg-black/20 px-3 text-sm text-white outline-none focus:border-cyan-300/40"
                    >
                      <option value="BUY">BUY</option>
                      <option value="SELL">SELL</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Entry"
                    type="number"
                    value={form.entry}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        entry: value,
                      }))
                    }
                    placeholder="1.08250"
                  />

                  <Input
                    label="Exit"
                    type="number"
                    value={form.exit}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        exit: value,
                      }))
                    }
                    placeholder="1.08620"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Stop Loss"
                    type="number"
                    value={form.sl}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        sl: value,
                      }))
                    }
                    placeholder="1.07900"
                  />

                  <Input
                    label="Take Profit"
                    type="number"
                    value={form.tp}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        tp: value,
                      }))
                    }
                    placeholder="1.08800"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Input
                    label="Lot Size"
                    type="number"
                    value={form.lot}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        lot: value,
                      }))
                    }
                    placeholder="0.01"
                  />

                  <Input
                    label="Risk ($)"
                    type="number"
                    value={form.risk}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        risk: value,
                      }))
                    }
                    placeholder="10"
                  />

                  <Input
                    label="P&L ($)"
                    type="number"
                    value={form.pnl}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        pnl: value,
                      }))
                    }
                    placeholder="25"
                  />
                </div>

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-xl border border-white/[0.07] px-5 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
                  >
                    Cancel
                  </button>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    disabled={saving}
                    type="submit"
                    className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.1] px-5 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/[0.15] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : editingTrade
                        ? "Update Trade"
                        : "Save Trade"}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className="fixed bottom-5 right-5 z-[60] rounded-xl border border-white/[0.08] bg-[#11151c] px-4 py-3 text-sm text-white shadow-2xl"
          >
            <span className="mr-2 text-emerald-300">✓</span>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}