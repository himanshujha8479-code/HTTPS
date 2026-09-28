"use client";

import {
  Dispatch,
  SetStateAction,
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
  type: "BUY" | "SELL";
  entry: string;
  sl: string;
  tp: string;
  exit: string;
  lot: string;
  risk: string;
  pnl: string;
};

const emptyForm: FormState = {
  pair: "EURUSD",
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
  { id: "trades", label: "Trades", icon: "↗" },
  { id: "analytics", label: "Analytics", icon: "◒" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

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
  const [display, setDisplay] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const start = display;
    const duration = 800;
    const startTime = performance.now();

    const animate = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (value - start) * eased);

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
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
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{
        y: -3,
        transition: { duration: 0.2 },
      }}
      className={`relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035] backdrop-blur-xl ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent" />
      <div className="relative">{children}</div>
    </motion.div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color = "cyan",
  delay = 0,
  prefix = "",
  suffix = "",
  decimals = 2,
}: {
  title: string;
  value: number;
  icon: string;
  color?: "cyan" | "green" | "purple" | "orange";
  delay?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const colors = {
    cyan: "from-cyan-400/20 to-blue-500/5 text-cyan-300",
    green: "from-emerald-400/20 to-green-500/5 text-emerald-300",
    purple: "from-violet-400/20 to-purple-500/5 text-violet-300",
    orange: "from-orange-400/20 to-amber-500/5 text-orange-300",
  };

  return (
    <GlassCard delay={delay} className="p-5">
      <div
        className={`absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br ${colors[color]} opacity-50 blur-2xl`}
      />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/40">
            {title}
          </p>

          <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
            <AnimatedNumber
              value={value}
              prefix={prefix}
              suffix={suffix}
              decimals={decimals}
            />
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-gradient-to-br ${colors[color]}`}
        >
          <span className="text-lg">{icon}</span>
        </div>
      </div>

      <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/[0.05]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "72%" }}
          transition={{ duration: 1, delay: delay + 0.3 }}
          className={`h-full rounded-full bg-current opacity-60 ${colors[color].split(" ").pop()}`}
        />
      </div>
    </GlassCard>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-white/40">{description}</p>
      )}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "number",
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
      <span className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-white/40">
        {label}
      </span>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-cyan-400/50 focus:bg-white/[0.04] focus:ring-2 focus:ring-cyan-400/10"
      />
    </label>
  );
}

export default function Home() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [pairFilter, setPairFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [monthFilter, setMonthFilter] = useState("ALL");

  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const updateForm = (key: keyof FormState, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  useEffect(() => {
    let mounted = true;

    async function loadTrades() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      if (!mounted) return;

      setUserEmail(user.email || "");

      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error(error);
      } else if (mounted) {
        setTrades((data || []) as Trade[]);
      }

      setLoading(false);
    }

    loadTrades();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (!toast) return;

    const timeout = setTimeout(() => {
      setToast("");
    }, 2800);

    return () => clearTimeout(timeout);
  }, [toast]);

  const availablePairs = useMemo(() => {
    return Array.from(new Set(trades.map((t) => t.pair).filter(Boolean)));
  }, [trades]);

  const availableMonths = useMemo(() => {
    return Array.from(
      new Set(
        trades
          .map((t) => {
            if (!t.created_at) return null;
            return t.created_at.slice(0, 7);
          })
          .filter(Boolean)
      )
    ).sort((a, b) => String(b).localeCompare(String(a)));
  }, [trades]);

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      const pairOk =
        pairFilter === "ALL" || trade.pair === pairFilter;

      const typeOk =
        typeFilter === "ALL" || trade.type === typeFilter;

      const monthOk =
        monthFilter === "ALL" ||
        trade.created_at?.slice(0, 7) === monthFilter;

      return pairOk && typeOk && monthOk;
    });
  }, [trades, pairFilter, typeFilter, monthFilter]);

  const totalPnl = useMemo(
    () =>
      filteredTrades.reduce(
        (sum, trade) => sum + Number(trade.pnl || 0),
        0
      ),
    [filteredTrades]
  );

  const wins = useMemo(
    () => filteredTrades.filter((t) => Number(t.pnl || 0) > 0),
    [filteredTrades]
  );

  const losses = useMemo(
    () => filteredTrades.filter((t) => Number(t.pnl || 0) < 0),
    [filteredTrades]
  );

  const winRate =
    filteredTrades.length > 0
      ? (wins.length / filteredTrades.length) * 100
      : 0;

  const averageWin =
    wins.length > 0
      ? wins.reduce((s, t) => s + Number(t.pnl || 0), 0) / wins.length
      : 0;

  const averageLoss =
    losses.length > 0
      ? Math.abs(
          losses.reduce((s, t) => s + Number(t.pnl || 0), 0) /
            losses.length
        )
      : 0;

  const grossProfit = wins.reduce(
    (s, t) => s + Number(t.pnl || 0),
    0
  );

  const grossLoss = Math.abs(
    losses.reduce((s, t) => s + Number(t.pnl || 0), 0)
  );

  const profitFactor =
    grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0;

  const equityCurve = useMemo(() => {
    let running = 0;

    return filteredTrades.map((trade) => {
      running += Number(trade.pnl || 0);
      return running;
    });
  }, [filteredTrades]);

  const maxDrawdown = useMemo(() => {
    let peak = 0;
    let maxDD = 0;

    equityCurve.forEach((value) => {
      peak = Math.max(peak, value);
      maxDD = Math.max(maxDD, peak - value);
    });

    return maxDD;
  }, [equityCurve]);

  const currentStreak = useMemo(() => {
    if (!filteredTrades.length) return { value: 0, type: "NONE" };

    let streak = 0;
    let type = Number(filteredTrades[filteredTrades.length - 1].pnl || 0) >= 0
      ? "WIN"
      : "LOSS";

    for (let i = filteredTrades.length - 1; i >= 0; i--) {
      const pnl = Number(filteredTrades[i].pnl || 0);

      if (
        (type === "WIN" && pnl > 0) ||
        (type === "LOSS" && pnl < 0)
      ) {
        streak++;
      } else {
        break;
      }
    }

    return { value: streak, type };
  }, [filteredTrades]);

  const monthlyPerformance = useMemo(() => {
    const map: Record<string, number> = {};

    filteredTrades.forEach((trade) => {
      if (!trade.created_at) return;

      const month = trade.created_at.slice(0, 7);

      map[month] = (map[month] || 0) + Number(trade.pnl || 0);
    });

    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6);
  }, [filteredTrades]);

  const rr = useMemo(() => {
    const entry = Number(form.entry);
    const sl = Number(form.sl);
    const tp = Number(form.tp);

    if (!entry || !sl || !tp || entry === sl) return null;

    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);

    return risk > 0 ? reward / risk : null;
  }, [form.entry, form.sl, form.tp]);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    setSidebarOpen(false);

    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const clearForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const saveTrade = async () => {
    if (
      !form.pair ||
      !form.type ||
      !form.entry ||
      !form.sl ||
      !form.tp ||
      !form.exit ||
      !form.lot ||
      !form.risk ||
      !form.pnl
    ) {
      setToast("Please fill all trade fields");
      return;
    }

    const entry = Number(form.entry);
    const sl = Number(form.sl);
    const tp = Number(form.tp);
    const exit = Number(form.exit);
    const lot = Number(form.lot);
    const risk = Number(form.risk);
    const pnl = Number(form.pnl);

    if ([entry, sl, tp, exit, lot, risk, pnl].some((n) => Number.isNaN(n))) {
      setToast("Please enter valid numbers");
      return;
    }

    if (entry === sl) {
      setToast("Entry and Stop Loss cannot be same");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const payload = {
      pair: form.pair,
      type: form.type,
      entry,
      sl,
      tp,
      exit,
      lot,
      risk,
      pnl,
    };

    if (editingId !== null) {
      const { data, error } = await supabase
        .from("trades")
        .update(payload)
        .eq("id", editingId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        console.error(error);
        setToast("Could not update trade");
      } else {
        setTrades((prev) =>
          prev.map((trade) =>
            trade.id === editingId ? (data as Trade) : trade
          )
        );

        setToast(
          rr !== null
            ? `Trade updated • R:R ${rr.toFixed(2)}`
            : "Trade updated successfully"
        );

        clearForm();
      }
    } else {
      const { data, error } = await supabase
        .from("trades")
        .insert({
          ...payload,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error(error);
        setToast("Could not save trade");
      } else {
        setTrades((prev) => [...prev, data as Trade]);

        setToast(
          rr !== null
            ? `Trade saved • R:R ${rr.toFixed(2)}`
            : "Trade saved successfully"
        );

        clearForm();
      }
    }

    setSaving(false);
  };

  const editTrade = (trade: Trade) => {
    setEditingId(trade.id);

    setForm({
      pair: trade.pair || "EURUSD",
      type: trade.type === "SELL" ? "SELL" : "BUY",
      entry: String(trade.entry ?? ""),
      sl: String(trade.sl ?? ""),
      tp: String(trade.tp ?? ""),
      exit: String(trade.exit ?? ""),
      lot: String(trade.lot ?? ""),
      risk: String(trade.risk ?? ""),
      pnl: String(trade.pnl ?? ""),
    });

    scrollTo("trades");
  };

  const deleteTrade = async (id: number) => {
    if (!confirm("Delete this trade?")) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { error } = await supabase
      .from("trades")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error(error);
      setToast("Could not delete trade");
      return;
    }

    setTrades((prev) => prev.filter((trade) => trade.id !== id));
    setToast("Trade deleted");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const formatMonth = (month: string) => {
    const [year, m] = month.split("-");
    const date = new Date(Number(year), Number(m) - 1);

    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  const maxMonthly = Math.max(
    ...monthlyPerformance.map(([, value]) => Math.abs(value)),
    1
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#06070a] text-white">
        <div className="text-center">
          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "linear",
            }}
            className="mx-auto h-10 w-10 rounded-full border-2 border-white/10 border-t-cyan-400"
          />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-sm text-white/40"
          >
            Loading your trading journal...
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#06070a] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          animate={
            reducedMotion
              ? {}
              : {
                  x: [0, 80, 0],
                  y: [0, -40, 0],
                }
          }
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-cyan-500/[0.06] blur-[120px]"
        />

        <motion.div
          animate={
            reducedMotion
              ? {}
              : {
                  x: [0, -70, 0],
                  y: [0, 50, 0],
                }
          }
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -right-40 top-1/3 h-[500px] w-[500px] rounded-full bg-violet-500/[0.05] blur-[120px]"
        />

        <div className="absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:50px_50px]" />
      </div>

      {/* Mobile header */}
      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-white/[0.08] bg-[#06070a]/80 px-4 backdrop-blur-xl lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-lg"
        >
          ☰
        </button>

        <div className="text-center">
          <p className="text-sm font-semibold">Trade Journal</p>
          <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-400">
            Analytics
          </p>
        </div>

        <div className="h-10 w-10 rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-center text-lg leading-10">
          ●
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm lg:hidden"
            />

            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 top-0 z-[60] w-72 border-r border-white/[0.08] bg-[#0a0c10] p-5 lg:hidden"
            >
              <SidebarContent
                activeSection={activeSection}
                scrollTo={scrollTo}
                userEmail={userEmail}
                tradesCount={trades.length}
                totalPnl={totalPnl}
                logout={logout}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-64 border-r border-white/[0.07] bg-[#08090d]/90 p-5 backdrop-blur-2xl lg:block">
        <SidebarContent
          activeSection={activeSection}
          scrollTo={scrollTo}
          userEmail={userEmail}
          tradesCount={trades.length}
          totalPnl={totalPnl}
          logout={logout}
        />
      </aside>

      {/* Main */}
      <div className="relative lg:ml-64">
        <div className="mx-auto max-w-[1600px] px-4 pb-16 pt-24 sm:px-6 lg:px-10 lg:pt-10">
          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-center"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-400">
                  Journal online
                </span>
              </div>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Good Trading<span className="text-cyan-400">.</span>
              </h1>

              <p className="mt-1 text-sm text-white/35">
                Track your performance. Improve your process.
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                clearForm();
                scrollTo("trades");
              }}
              className="group flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-black shadow-lg shadow-cyan-400/10 transition hover:bg-cyan-300"
            >
              <span className="text-lg transition-transform group-hover:rotate-90">
                +
              </span>
              Add Trade
            </motion.button>
          </motion.header>

          {/* Dashboard */}
          <section id="dashboard" className="scroll-mt-8">
            {/* Filters */}
            <GlassCard className="mb-6 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold text-white/70">
                    Performance Overview
                  </p>
                  <p className="mt-1 text-[11px] text-white/30">
                    Analyze your selected trading data
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={pairFilter}
                    onChange={(e) => setPairFilter(e.target.value)}
                    className="h-10 rounded-lg border border-white/[0.08] bg-black/30 px-2 text-xs text-white outline-none"
                  >
                    <option value="ALL">All Pairs</option>
                    {availablePairs.map((pair) => (
                      <option key={pair} value={pair}>
                        {pair}
                      </option>
                    ))}
                  </select>

                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="h-10 rounded-lg border border-white/[0.08] bg-black/30 px-2 text-xs text-white outline-none"
                  >
                    <option value="ALL">All Types</option>
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>

                  <select
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    className="h-10 rounded-lg border border-white/[0.08] bg-black/30 px-2 text-xs text-white outline-none"
                  >
                    <option value="ALL">All Months</option>
                    {availableMonths.map((month) => (
                      <option key={month} value={month}>
                        {formatMonth(month)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </GlassCard>

            {/* Main stats */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total P&L"
                value={totalPnl}
                prefix={totalPnl >= 0 ? "+$" : "-$"}
                icon="↗"
                color={totalPnl >= 0 ? "green" : "orange"}
                delay={0.05}
              />

              <StatCard
                title="Win Rate"
                value={winRate}
                suffix="%"
                icon="%"
                color="cyan"
                delay={0.1}
              />

              <StatCard
                title="Profit Factor"
                value={profitFactor}
                icon="◆"
                color="purple"
                delay={0.15}
              />

              <StatCard
                title="Max Drawdown"
                value={maxDrawdown}
                prefix="-$"
                icon="↓"
                color="orange"
                delay={0.2}
              />
            </div>

            {/* Secondary stats */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Winning Trades", wins.length, "↑", "text-emerald-300"],
                ["Losing Trades", losses.length, "↓", "text-rose-300"],
                ["Average Win", averageWin, "+$", "text-cyan-300"],
                ["Average Loss", averageLoss, "-$", "text-orange-300"],
              ].map(([title, value, icon, textColor], index) => (
                <GlassCard key={String(title)} delay={0.25 + index * 0.05} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/30">
                        {String(title)}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {typeof value === "number" && (
                          <AnimatedNumber
                            value={value}
                            prefix={
                              title === "Average Win"
                                ? "+$"
                                : title === "Average Loss"
                                ? "-$"
                                : ""
                            }
                          />
                        )}
                      </p>
                    </div>

                    <span className={`text-lg ${textColor}`}>{String(icon)}</span>
                  </div>
                </GlassCard>
              ))}
            </div>
          </section>

          {/* Analytics */}
          <section id="analytics" className="mt-14 scroll-mt-8">
            <SectionTitle
              eyebrow="Performance"
              title="Analytics"
              description="A visual overview of your trading performance."
            />

            <div className="grid gap-5 xl:grid-cols-3">
              {/* Equity */}
              <GlassCard className="xl:col-span-2 p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Equity Curve
                    </p>
                    <p className="mt-1 text-xs text-white/30">
                      Cumulative P&L
                    </p>
                  </div>

                  <div
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                      totalPnl >= 0
                        ? "bg-emerald-400/10 text-emerald-300"
                        : "bg-rose-400/10 text-rose-300"
                    }`}
                  >
                    {totalPnl >= 0 ? "+" : "-"}$
                    {Math.abs(totalPnl).toFixed(2)}
                  </div>
                </div>

                <div className="mt-8 h-64">
                  {equityCurve.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-white/25">
                      Add trades to build your equity curve
                    </div>
                  ) : (
                    <div className="relative h-full">
                      <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-white/[0.08]" />

                      <div className="flex h-full items-end gap-1 sm:gap-2">
                        {equityCurve.map((value, index) => {
                          const min = Math.min(...equityCurve, 0);
                          const max = Math.max(...equityCurve, 0);
                          const range = Math.max(max - min, 1);

                          const normalized =
                            ((value - min) / range) * 88 + 6;

                          return (
                            <motion.div
                              key={index}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{
                                height: `${normalized}%`,
                                opacity: 1,
                              }}
                              transition={{
                                duration: 0.6,
                                delay: index * 0.035,
                              }}
                              whileHover={{
                                scaleX: 1.5,
                                opacity: 0.85,
                              }}
                              className={`min-w-[3px] flex-1 rounded-t-md ${
                                value >= 0
                                  ? "bg-gradient-to-t from-cyan-500/30 to-cyan-300"
                                  : "bg-gradient-to-t from-rose-500/30 to-rose-300"
                              }`}
                              title={`$${value.toFixed(2)}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </GlassCard>

              {/* Win Loss */}
              <GlassCard className="p-6">
                <p className="text-sm font-semibold text-white">
                  Win / Loss
                </p>
                <p className="mt-1 text-xs text-white/30">
                  Trade distribution
                </p>

                <div className="flex flex-col items-center py-7">
                  <div
                    className="relative flex h-44 w-44 items-center justify-center rounded-full"
                    style={{
                      background:
                        filteredTrades.length === 0
                          ? "conic-gradient(rgba(255,255,255,.06) 0deg 360deg)"
                          : `conic-gradient(#34d399 0deg ${
                              winRate * 3.6
                            }deg, #fb7185 ${
                              winRate * 3.6
                            }deg 360deg)`,
                    }}
                  >
                    <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-[#0b0d11]">
                      <span className="text-3xl font-semibold">
                        <AnimatedNumber
                          value={winRate}
                          decimals={0}
                          suffix="%"
                        />
                      </span>
                      <span className="mt-1 text-[10px] uppercase tracking-widest text-white/30">
                        Win rate
                      </span>
                    </div>
                  </div>

                  <div className="mt-7 grid w-full grid-cols-2 gap-3">
                    <div className="rounded-xl bg-emerald-400/[0.06] p-3">
                      <p className="text-xs text-white/40">Wins</p>
                      <p className="mt-1 text-lg font-semibold text-emerald-300">
                        {wins.length}
                      </p>
                    </div>

                    <div className="rounded-xl bg-rose-400/[0.06] p-3">
                      <p className="text-xs text-white/40">Losses</p>
                      <p className="mt-1 text-lg font-semibold text-rose-300">
                        {losses.length}
                      </p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Monthly + streak */}
            <div className="mt-5 grid gap-5 lg:grid-cols-3">
              <GlassCard className="lg:col-span-2 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Monthly Performance</p>
                    <p className="mt-1 text-xs text-white/30">
                      Last 6 active months
                    </p>
                  </div>
                </div>

                <div className="mt-8 space-y-5">
                  {monthlyPerformance.length === 0 ? (
                    <p className="py-10 text-center text-sm text-white/25">
                      No monthly data yet
                    </p>
                  ) : (
                    monthlyPerformance.map(([month, value], index) => {
                      const positive = value >= 0;
                      const width =
                        (Math.abs(value) / maxMonthly) * 100;

                      return (
                        <div key={month}>
                          <div className="mb-2 flex items-center justify-between text-xs">
                            <span className="text-white/45">
                              {formatMonth(month)}
                            </span>
                            <span
                              className={
                                positive
                                  ? "text-emerald-300"
                                  : "text-rose-300"
                              }
                            >
                              {positive ? "+" : "-"}$
                              {Math.abs(value).toFixed(2)}
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${width}%` }}
                              transition={{
                                duration: 0.8,
                                delay: index * 0.08,
                              }}
                              className={`h-full rounded-full ${
                                positive
                                  ? "bg-gradient-to-r from-emerald-500/40 to-emerald-300"
                                  : "bg-gradient-to-r from-rose-500/40 to-rose-300"
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </GlassCard>

              <GlassCard className="flex flex-col justify-between p-6">
                <div>
                  <p className="text-sm font-semibold">Current Streak</p>
                  <p className="mt-1 text-xs text-white/30">
                    Consecutive recent trades
                  </p>
                </div>

                <div className="py-8 text-center">
                  <motion.div
                    key={`${currentStreak.type}-${currentStreak.value}`}
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`text-6xl font-bold ${
                      currentStreak.type === "WIN"
                        ? "text-emerald-300"
                        : currentStreak.type === "LOSS"
                        ? "text-rose-300"
                        : "text-white/30"
                    }`}
                  >
                    {currentStreak.value}
                  </motion.div>

                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-white/30">
                    {currentStreak.type === "WIN"
                      ? "Winning streak"
                      : currentStreak.type === "LOSS"
                      ? "Losing streak"
                      : "No streak"}
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-center text-xs text-white/30">
                  Stay focused on process, not individual outcomes.
                </div>
              </GlassCard>
            </div>
          </section>

          {/* Trades */}
          <section id="trades" className="mt-14 scroll-mt-8">
            <SectionTitle
              eyebrow="Journal"
              title="Trade Management"
              description="Record and review every trade."
            />

            <div className="grid gap-5 xl:grid-cols-5">
              {/* Form */}
              <GlassCard className="xl:col-span-2">
                <div className="border-b border-white/[0.07] p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        {editingId ? "Edit Trade" : "Add New Trade"}
                      </p>
                      <p className="mt-1 text-xs text-white/30">
                        Keep your journal consistent.
                      </p>
                    </div>

                    {editingId && (
                      <button
                        onClick={clearForm}
                        className="text-xs text-white/40 transition hover:text-white"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-5 p-6">
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-white/40">
                      Pair
                    </span>

                    <input
                      value={form.pair}
                      onChange={(e) =>
                        updateForm("pair", e.target.value.toUpperCase())
                      }
                      placeholder="EURUSD"
                      className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-cyan-400/50"
                    />
                  </label>

                  <div>
                    <span className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-white/40">
                      Direction
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      {(["BUY", "SELL"] as const).map((type) => (
                        <motion.button
                          key={type}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => updateForm("type", type)}
                          className={`h-11 rounded-xl border text-sm font-semibold transition ${
                            form.type === type
                              ? type === "BUY"
                                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                                : "border-rose-400/30 bg-rose-400/10 text-rose-300"
                              : "border-white/[0.08] bg-white/[0.02] text-white/35 hover:bg-white/[0.05]"
                          }`}
                        >
                          {type}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Entry"
                      value={form.entry}
                      onChange={(v) => updateForm("entry", v)}
                    />

                    <Input
                      label="Stop Loss"
                      value={form.sl}
                      onChange={(v) => updateForm("sl", v)}
                    />

                    <Input
                      label="Take Profit"
                      value={form.tp}
                      onChange={(v) => updateForm("tp", v)}
                    />

                    <Input
                      label="Exit"
                      value={form.exit}
                      onChange={(v) => updateForm("exit", v)}
                    />

                    <Input
                      label="Lot Size"
                      value={form.lot}
                      onChange={(v) => updateForm("lot", v)}
                    />

                    <Input
                      label="Risk"
                      value={form.risk}
                      onChange={(v) => updateForm("risk", v)}
                    />
                  </div>

                  <Input
                    label="P&L"
                    value={form.pnl}
                    onChange={(v) => updateForm("pnl", v)}
                    placeholder="e.g. 25.50 or -12.30"
                  />

                  <AnimatePresence>
                    {rr !== null && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -5 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -5 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center justify-between rounded-xl border border-cyan-400/10 bg-cyan-400/[0.05] p-3">
                          <span className="text-xs text-white/40">
                            Calculated Risk / Reward
                          </span>

                          <span className="font-semibold text-cyan-300">
                            1 : {rr.toFixed(2)}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={saving}
                    onClick={saveTrade}
                    className="h-12 w-full rounded-xl bg-cyan-400 font-semibold text-black shadow-lg shadow-cyan-400/10 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : editingId
                      ? "Update Trade"
                      : "Save Trade"}
                  </motion.button>
                </div>
              </GlassCard>

              {/* Trade history */}
              <GlassCard className="xl:col-span-3">
                <div className="flex items-center justify-between border-b border-white/[0.07] p-6">
                  <div>
                    <p className="text-sm font-semibold">Trade History</p>
                    <p className="mt-1 text-xs text-white/30">
                      {filteredTrades.length} trades shown
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs text-white/40">
                    {filteredTrades.length} / {trades.length}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {filteredTrades.length === 0 ? (
                    <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-2xl">
                        ↗
                      </div>
                      <p className="mt-4 text-sm font-medium text-white/60">
                        No trades found
                      </p>
                      <p className="mt-1 max-w-xs text-xs text-white/25">
                        Add your first trade to start building your journal.
                      </p>
                    </div>
                  ) : (
                    <table className="w-full min-w-[760px] text-left">
                      <thead>
                        <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-white/25">
                          <th className="px-6 py-4">Pair</th>
                          <th className="px-4 py-4">Type</th>
                          <th className="px-4 py-4">Entry</th>
                          <th className="px-4 py-4">SL</th>
                          <th className="px-4 py-4">TP</th>
                          <th className="px-4 py-4">Exit</th>
                          <th className="px-4 py-4">P&L</th>
                          <th className="px-4 py-4">Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        <AnimatePresence initial={false}>
                          {filteredTrades
                            .slice()
                            .reverse()
                            .map((trade, index) => {
                              const pnl = Number(trade.pnl || 0);

                              return (
                                <motion.tr
                                  layout
                                  key={trade.id}
                                  initial={{
                                    opacity: 0,
                                    x: 20,
                                  }}
                                  animate={{
                                    opacity: 1,
                                    x: 0,
                                  }}
                                  exit={{
                                    opacity: 0,
                                    x: -20,
                                  }}
                                  transition={{
                                    delay: index * 0.025,
                                  }}
                                  className="border-b border-white/[0.04] transition hover:bg-white/[0.025]"
                                >
                                  <td className="px-6 py-4">
                                    <span className="font-semibold text-white">
                                      {trade.pair}
                                    </span>
                                  </td>

                                  <td className="px-4 py-4">
                                    <span
                                      className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${
                                        trade.type === "BUY"
                                          ? "bg-emerald-400/10 text-emerald-300"
                                          : "bg-rose-400/10 text-rose-300"
                                      }`}
                                    >
                                      {trade.type || "-"}
                                    </span>
                                  </td>

                                  <td className="px-4 py-4 text-xs text-white/50">
                                    {trade.entry ?? "-"}
                                  </td>

                                  <td className="px-4 py-4 text-xs text-white/50">
                                    {trade.sl ?? "-"}
                                  </td>

                                  <td className="px-4 py-4 text-xs text-white/50">
                                    {trade.tp ?? "-"}
                                  </td>

                                  <td className="px-4 py-4 text-xs text-white/50">
                                    {trade.exit ?? "-"}
                                  </td>

                                  <td
                                    className={`px-4 py-4 text-xs font-semibold ${
                                      pnl > 0
                                        ? "text-emerald-300"
                                        : pnl < 0
                                        ? "text-rose-300"
                                        : "text-white/40"
                                    }`}
                                  >
                                    {pnl > 0 ? "+" : ""}
                                    {pnl.toFixed(2)}
                                  </td>

                                  <td className="px-4 py-4">
                                    <div className="flex gap-1">
                                      <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => editTrade(trade)}
                                        className="rounded-lg px-2 py-1.5 text-xs text-white/40 transition hover:bg-white/[0.06] hover:text-white"
                                      >
                                        Edit
                                      </motion.button>

                                      <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => deleteTrade(trade.id)}
                                        className="rounded-lg px-2 py-1.5 text-xs text-rose-300/50 transition hover:bg-rose-400/10 hover:text-rose-300"
                                      >
                                        Delete
                                      </motion.button>
                                    </div>
                                  </td>
                                </motion.tr>
                              );
                            })}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  )}
                </div>
              </GlassCard>
            </div>
          </section>

          {/* Settings */}
          <section id="settings" className="mt-14 scroll-mt-8">
            <SectionTitle
              eyebrow="System"
              title="Settings"
              description="Your journal account and connection status."
            />

            <div className="grid gap-5 md:grid-cols-2">
              <GlassCard className="p-6">
                <p className="text-sm font-semibold">Database</p>

                <div className="mt-5 space-y-3">
                  <StatusRow
                    label="Supabase"
                    value="Connected"
                    good
                  />
                  <StatusRow
                    label="Trade storage"
                    value="Active"
                    good
                  />
                  <StatusRow
                    label="User isolation"
                    value="Enabled"
                    good
                  />
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <p className="text-sm font-semibold">Account</p>

                <div className="mt-5">
                  <p className="text-xs text-white/30">Signed in as</p>
                  <p className="mt-1 break-all text-sm text-white/70">
                    {userEmail}
                  </p>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={logout}
                    className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] px-4 py-2.5 text-xs font-medium text-rose-300 transition hover:bg-rose-400/10"
                  >
                    Sign out
                  </motion.button>
                </div>
              </GlassCard>
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-16 border-t border-white/[0.06] pt-6 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/20">
              Trade Journal • Professional Analytics
            </p>
          </footer>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{
              opacity: 0,
              y: 30,
              scale: 0.95,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 20,
              scale: 0.95,
            }}
            className="fixed bottom-5 left-1/2 z-[100] -translate-x-1/2"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.1] bg-[#11141a]/95 px-5 py-3 text-sm text-white shadow-2xl shadow-black/50 backdrop-blur-xl">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300">
                ✓
              </span>
              {toast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function StatusRow({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
      <span className="text-xs text-white/40">{label}</span>

      <span className="flex items-center gap-2 text-xs text-white/60">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            good ? "bg-emerald-400" : "bg-orange-400"
          }`}
        />
        {value}
      </span>
    </div>
  );
}

function SidebarContent({
  activeSection,
  scrollTo,
  userEmail,
  tradesCount,
  totalPnl,
  logout,
}: {
  activeSection: string;
  scrollTo: (id: string) => void;
  userEmail: string;
  tradesCount: number;
  totalPnl: number;
  logout: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="mb-10 flex items-center gap-3">
        <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-cyan-400 text-black shadow-lg shadow-cyan-400/10">
          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute h-20 w-20 rounded-full border-2 border-dashed border-black/20"
          />

          <span className="relative text-lg font-bold">T</span>
        </div>

        <div>
          <p className="text-sm font-semibold">Trade Journal</p>
          <p className="text-[9px] uppercase tracking-[0.18em] text-cyan-400">
            Professional
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div>
        <p className="mb-3 px-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/20">
          Workspace
        </p>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = activeSection === item.id;

            return (
              <motion.button
                key={item.id}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => scrollTo(item.id)}
                className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                  active
                    ? "bg-cyan-400/[0.08] text-cyan-300"
                    : "text-white/35 hover:bg-white/[0.035] hover:text-white/70"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="active-nav"
                    className="absolute left-0 h-5 w-0.5 rounded-full bg-cyan-400"
                  />
                )}

                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.03] text-sm">
                  {item.icon}
                </span>

                {item.label}
              </motion.button>
            );
          })}
        </nav>
      </div>

      {/* Account */}
      <div className="mt-auto">
        <div className="mb-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400/30 to-violet-400/30 text-xs font-semibold">
              {userEmail?.charAt(0).toUpperCase() || "U"}
            </div>

            <div className="min-w-0">
              <p className="text-xs font-medium text-white/70">
                My Account
              </p>
              <p className="truncate text-[10px] text-white/25">
                {userEmail}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-black/20 p-2.5">
              <p className="text-[9px] uppercase text-white/20">Trades</p>
              <p className="mt-1 text-sm font-semibold">{tradesCount}</p>
            </div>

            <div className="rounded-xl bg-black/20 p-2.5">
              <p className="text-[9px] uppercase text-white/20">P&L</p>
              <p
                className={`mt-1 text-sm font-semibold ${
                  totalPnl >= 0
                    ? "text-emerald-300"
                    : "text-rose-300"
                }`}
              >
                {totalPnl >= 0 ? "+" : "-"}$
                {Math.abs(totalPnl).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full rounded-xl px-3 py-2.5 text-left text-xs text-white/30 transition hover:bg-white/[0.035] hover:text-white/70"
        >
          ↪ Sign out
        </button>
      </div>
    </div>
  );
}