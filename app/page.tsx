"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
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

    let frame = 0;
    const start = display;
    const startTime = performance.now();
    const duration = 700;

    const animate = (time: number) => {
      const progress = Math.min(
        (time - startTime) / duration,
        1
      );

      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplay(
        start + (value - start) * eased
      );

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
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay,
      }}
      whileHover={{ y: -2 }}
      className={`relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035] backdrop-blur-xl ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent" />

      <div className="relative">
        {children}
      </div>
    </motion.div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
  prefix = "",
  suffix = "",
}: {
  title: string;
  value: number;
  icon: string;
  color: "green" | "cyan" | "purple" | "orange";
  prefix?: string;
  suffix?: string;
}) {
  const styles = {
    green:
      "text-emerald-300 bg-emerald-400/10",
    cyan:
      "text-cyan-300 bg-cyan-400/10",
    purple:
      "text-violet-300 bg-violet-400/10",
    orange:
      "text-orange-300 bg-orange-400/10",
  };

  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/35">
            {title}
          </p>

          <p className="mt-3 text-2xl font-semibold text-white">
            <AnimatedNumber
              value={value}
              prefix={prefix}
              suffix={suffix}
            />
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles[color]}`}
        >
          {icon}
        </div>
      </div>
    </GlassCard>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadTrades = async () => {
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
        .order("created_at", {
          ascending: true,
        });

      if (!error && mounted) {
        setTrades((data || []) as Trade[]);
      }

      setLoading(false);
    };

    loadTrades();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          router.replace("/login");
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const totalPnl = useMemo(() => {
    return trades.reduce(
      (sum, trade) =>
        sum + Number(trade.pnl || 0),
      0
    );
  }, [trades]);

  const wins = useMemo(
    () =>
      trades.filter(
        (trade) => Number(trade.pnl || 0) > 0
      ),
    [trades]
  );

  const losses = useMemo(
    () =>
      trades.filter(
        (trade) => Number(trade.pnl || 0) < 0
      ),
    [trades]
  );

  const winRate =
    trades.length > 0
      ? (wins.length / trades.length) * 100
      : 0;

  const grossProfit = wins.reduce(
    (sum, trade) =>
      sum + Number(trade.pnl || 0),
    0
  );

  const grossLoss = Math.abs(
    losses.reduce(
      (sum, trade) =>
        sum + Number(trade.pnl || 0),
      0
    )
  );

  const profitFactor =
    grossLoss > 0
      ? grossProfit / grossLoss
      : grossProfit > 0
      ? grossProfit
      : 0;

  const maxDrawdown = useMemo(() => {
    let equity = 0;
    let peak = 0;
    let maxDD = 0;

    trades.forEach((trade) => {
      equity += Number(trade.pnl || 0);

      peak = Math.max(peak, equity);

      maxDD = Math.max(
        maxDD,
        peak - equity
      );
    });

    return maxDD;
  }, [trades]);

  const recentTrades = [...trades]
    .reverse()
    .slice(0, 5);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#06070a] text-white">
        <motion.div
          animate={
            reducedMotion
              ? {}
              : { rotate: 360 }
          }
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear",
          }}
          className="h-9 w-9 rounded-full border-2 border-white/10 border-t-cyan-400"
        />
      </div>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#06070a] text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          animate={
            reducedMotion
              ? {}
              : {
                  x: [0, 70, 0],
                  y: [0, -35, 0],
                }
          }
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -left-40 -top-40 h-[550px] w-[550px] rounded-full bg-cyan-400/[0.045] blur-[130px]"
        />

        <motion.div
          animate={
            reducedMotion
              ? {}
              : {
                  x: [0, -60, 0],
                  y: [0, 40, 0],
                }
          }
          transition={{
            duration: 17,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -right-40 top-1/3 h-[550px] w-[550px] rounded-full bg-violet-400/[0.035] blur-[130px]"
        />

        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(170,220,255,.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(170,220,255,.5) 1px, transparent 1px)
            `,
            backgroundSize: "55px 55px",
          }}
        />
      </div>

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-white/[0.07] bg-[#08090d]/90 p-5 backdrop-blur-2xl lg:block">
        <div className="flex h-full flex-col">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400 font-bold text-black">
              T
            </div>

            <div>
              <p className="text-sm font-semibold">
                Trade Journal
              </p>

              <p className="text-[9px] uppercase tracking-[0.18em] text-cyan-400">
                Professional
              </p>
            </div>
          </div>

          <nav className="space-y-1">
            <NavButton
              active
              icon="⌂"
              label="Dashboard"
              onClick={() => router.push("/")}
            />

            <NavButton
              icon="↗"
              label="Trades"
              onClick={() =>
                router.push("/trades")
              }
            />

            <NavButton
              icon="◒"
              label="Analytics"
              onClick={() =>
                router.push("/analytics")
              }
            />

            <NavButton
              icon="⚙"
              label="Settings"
              onClick={() =>
                router.push("/setting")
              }
            />
          </nav>

          <div className="mt-auto rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <p className="truncate text-xs text-white/35">
              {userEmail}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-black/20 p-2.5">
                <p className="text-[9px] uppercase text-white/20">
                  Trades
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {trades.length}
                </p>
              </div>

              <div className="rounded-xl bg-black/20 p-2.5">
                <p className="text-[9px] uppercase text-white/20">
                  P&L
                </p>

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

            <button
              onClick={logout}
              className="mt-4 w-full rounded-lg py-2 text-xs text-white/30 transition hover:bg-white/[0.04] hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="relative lg:ml-64">
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-10">
          <header className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

                <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-400">
                  Journal online
                </span>
              </div>

              <h1 className="mt-2 text-4xl font-semibold tracking-tight">
                Good Trading
                <span className="text-cyan-400">
                  .
                </span>
              </h1>

              <p className="mt-1 text-sm text-white/35">
                Your trading performance at a glance.
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() =>
                router.push("/trades")
              }
              className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-black shadow-lg shadow-cyan-400/10 hover:bg-cyan-300"
            >
              + Add Trade
            </motion.button>
          </header>

          {/* Stats */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total P&L"
              value={totalPnl}
              prefix={
                totalPnl >= 0 ? "+$" : "-$"
              }
              color={
                totalPnl >= 0
                  ? "green"
                  : "orange"
              }
              icon="↗"
            />

            <StatCard
              title="Win Rate"
              value={winRate}
              suffix="%"
              color="cyan"
              icon="%"
            />

            <StatCard
              title="Profit Factor"
              value={profitFactor}
              color="purple"
              icon="◆"
            />

            <StatCard
              title="Max Drawdown"
              value={maxDrawdown}
              prefix="-$"
              color="orange"
              icon="↓"
            />
          </section>

          {/* Quick stats */}
          <section className="mt-4 grid gap-4 sm:grid-cols-3">
            <GlassCard className="p-5">
              <p className="text-xs uppercase tracking-wider text-white/30">
                Total Trades
              </p>

              <p className="mt-2 text-2xl font-semibold">
                {trades.length}
              </p>
            </GlassCard>

            <GlassCard className="p-5">
              <p className="text-xs uppercase tracking-wider text-white/30">
                Winning Trades
              </p>

              <p className="mt-2 text-2xl font-semibold text-emerald-300">
                {wins.length}
              </p>
            </GlassCard>

            <GlassCard className="p-5">
              <p className="text-xs uppercase tracking-wider text-white/30">
                Losing Trades
              </p>

              <p className="mt-2 text-2xl font-semibold text-rose-300">
                {losses.length}
              </p>
            </GlassCard>
          </section>

          {/* Equity preview */}
          <GlassCard className="mt-6 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/30">
                  Performance
                </p>

                <h2 className="mt-1 text-lg font-semibold">
                  Equity Overview
                </h2>
              </div>

              <button
                onClick={() =>
                  router.push("/analytics")
                }
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                Full analytics →
              </button>
            </div>

            <div className="mt-8 h-52">
              {trades.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-white/25">
                  Add trades to build your equity curve.
                </div>
              ) : (
                <div className="flex h-full items-end gap-1">
                  {trades
                    .slice(-40)
                    .map((trade, index) => {
                      const pnl = Number(
                        trade.pnl || 0
                      );

                      const height = Math.min(
                        Math.max(
                          Math.abs(pnl) * 3,
                          8
                        ),
                        100
                      );

                      return (
                        <motion.div
                          key={trade.id}
                          initial={{
                            height: 0,
                            opacity: 0,
                          }}
                          animate={{
                            height: `${height}%`,
                            opacity: 1,
                          }}
                          transition={{
                            duration: 0.5,
                            delay:
                              index * 0.025,
                          }}
                          className={`flex-1 rounded-t-sm ${
                            pnl >= 0
                              ? "bg-emerald-400/60"
                              : "bg-rose-400/60"
                          }`}
                          title={`P&L: ${pnl}`}
                        />
                      );
                    })}
                </div>
              )}
            </div>
          </GlassCard>

          {/* Recent trades */}
          <GlassCard className="mt-6 overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] p-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/30">
                  Journal
                </p>

                <h2 className="mt-1 text-lg font-semibold">
                  Recent Trades
                </h2>
              </div>

              <button
                onClick={() =>
                  router.push("/trades")
                }
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                View all →
              </button>
            </div>

            {recentTrades.length === 0 ? (
              <div className="p-10 text-center text-sm text-white/25">
                No trades recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {recentTrades.map((trade) => {
                  const pnl = Number(
                    trade.pnl || 0
                  );

                  return (
                    <div
                      key={trade.id}
                      className="flex items-center justify-between px-6 py-4 transition hover:bg-white/[0.025]"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold ${
                            trade.type ===
                            "BUY"
                              ? "bg-emerald-400/10 text-emerald-300"
                              : "bg-rose-400/10 text-rose-300"
                          }`}
                        >
                          {trade.type ===
                          "BUY"
                            ? "B"
                            : "S"}
                        </div>

                        <div>
                          <p className="text-sm font-medium">
                            {trade.pair}
                          </p>

                          <p className="text-[11px] text-white/25">
                            {trade.type || "—"}{" "}
                            • Lot{" "}
                            {trade.lot ?? "—"}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p
                          className={`text-sm font-semibold ${
                            pnl >= 0
                              ? "text-emerald-300"
                              : "text-rose-300"
                          }`}
                        >
                          {pnl >= 0 ? "+" : ""}
                          {pnl.toFixed(2)}
                        </p>

                        <p className="text-[10px] text-white/20">
                          {trade.created_at
                            ? new Date(
                                trade.created_at
                              ).toLocaleDateString()
                            : "—"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>

          <footer className="mt-12 text-center text-[10px] uppercase tracking-[0.2em] text-white/15">
            Trade Journal • Professional Analytics
          </footer>
        </div>
      </div>
    </main>
  );
}

function NavButton({
  label,
  icon,
  active = false,
  onClick,
}: {
  label: string;
  icon: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ x: 3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
        active
          ? "bg-cyan-400/[0.08] text-cyan-300"
          : "text-white/35 hover:bg-white/[0.035] hover:text-white"
      }`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.03]">
        {icon}
      </span>

      {label}
    </motion.button>
  );
}