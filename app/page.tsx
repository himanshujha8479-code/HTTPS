"use client";

import {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Trade = {
  id: number;
  pair: string;
  type: "BUY" | "SELL";
  entry: number;
  sl: number;
  tp: number;
  exit: number;
  lot: number;
  risk: number;
  pnl: number;
  created_at?: string;
  user_id?: string;
};

export default function Home() {
  const router = useRouter();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("Dashboard");

  const [pair, setPair] = useState("XAUUSD");
  const [type, setType] = useState<"BUY" | "SELL">("BUY");

  const [entry, setEntry] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [exit, setExit] = useState("");
  const [lot, setLot] = useState("");
  const [risk, setRisk] = useState("");
  const [pnl, setPnl] = useState("");

  const [filterPair, setFilterPair] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [filterMonth, setFilterMonth] = useState("ALL");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState("");

  // =========================================================
  // AUTH CHECK + LOAD ONLY CURRENT USER'S TRADES
  // =========================================================

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
        .order("created_at", { ascending: true });

      if (error) {
        console.error("SUPABASE ERROR:", error);
      } else if (mounted) {
        setTrades(data || []);
      }

      if (mounted) {
        setLoading(false);
      }
    }

    loadTrades();

    // If user logs out somewhere else, send them to login
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

  // =========================================================
  // LOGOUT
  // =========================================================

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  // =========================================================
  // FILTERED TRADES
  // =========================================================

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      const pairMatch =
        filterPair === "ALL" || trade.pair === filterPair;

      const typeMatch =
        filterType === "ALL" || trade.type === filterType;

      let monthMatch = true;

      if (filterMonth !== "ALL" && trade.created_at) {
        const date = new Date(trade.created_at);

        const month =
          date.getFullYear() +
          "-" +
          String(date.getMonth() + 1).padStart(2, "0");

        monthMatch = month === filterMonth;
      }

      return pairMatch && typeMatch && monthMatch;
    });
  }, [trades, filterPair, filterType, filterMonth]);

  // =========================================================
  // ANALYTICS
  // =========================================================

  const totalPnl = filteredTrades.reduce(
    (sum, trade) => sum + Number(trade.pnl),
    0
  );

  const wins = filteredTrades.filter(
    (trade) => Number(trade.pnl) > 0
  );

  const losses = filteredTrades.filter(
    (trade) => Number(trade.pnl) < 0
  );

  const winRate =
    filteredTrades.length > 0
      ? (wins.length / filteredTrades.length) * 100
      : 0;

  const averageWin =
    wins.length > 0
      ? wins.reduce(
          (sum, trade) => sum + Number(trade.pnl),
          0
        ) / wins.length
      : 0;

  const averageLoss =
    losses.length > 0
      ? losses.reduce(
          (sum, trade) => sum + Number(trade.pnl),
          0
        ) / losses.length
      : 0;

  const grossProfit = wins.reduce(
    (sum, trade) => sum + Number(trade.pnl),
    0
  );

  const grossLoss = Math.abs(
    losses.reduce(
      (sum, trade) => sum + Number(trade.pnl),
      0
    )
  );

  const profitFactor =
    grossLoss > 0 ? grossProfit / grossLoss : 0;

  const maxDrawdown = useMemo(() => {
    let balance = 0;
    let peak = 0;
    let maxDD = 0;

    filteredTrades.forEach((trade) => {
      balance += Number(trade.pnl);

      if (balance > peak) {
        peak = balance;
      }

      const drawdown = peak - balance;

      if (drawdown > maxDD) {
        maxDD = drawdown;
      }
    });

    return maxDD;
  }, [filteredTrades]);

  const currentStreak = useMemo(() => {
    if (filteredTrades.length === 0) {
      return { count: 0, type: "None" };
    }

    let count = 0;
    let streakType = "";

    for (let i = filteredTrades.length - 1; i >= 0; i--) {
      const value = Number(filteredTrades[i].pnl);

      if (value === 0) break;

      const currentType = value > 0 ? "Win" : "Loss";

      if (!streakType) {
        streakType = currentType;
      }

      if (currentType !== streakType) {
        break;
      }

      count++;
    }

    return {
      count,
      type: streakType || "None",
    };
  }, [filteredTrades]);

  const equityCurve = useMemo(() => {
    let balance = 0;

    return filteredTrades.map((trade, index) => {
      balance += Number(trade.pnl);

      return {
        trade: index + 1,
        balance,
      };
    });
  }, [filteredTrades]);

  const monthlyPerformance = useMemo(() => {
    const months: Record<string, number> = {};

    filteredTrades.forEach((trade) => {
      if (!trade.created_at) return;

      const date = new Date(trade.created_at);

      const key =
        date.getFullYear() +
        "-" +
        String(date.getMonth() + 1).padStart(2, "0");

      months[key] =
        (months[key] || 0) + Number(trade.pnl);
    });

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({
        month,
        value,
      }));
  }, [filteredTrades]);

  const availablePairs = Array.from(
    new Set(trades.map((trade) => trade.pair))
  );

  const availableMonths = Array.from(
    new Set(
      trades
        .filter((trade) => trade.created_at)
        .map((trade) => {
          const date = new Date(trade.created_at!);

          return (
            date.getFullYear() +
            "-" +
            String(date.getMonth() + 1).padStart(2, "0")
          );
        })
    )
  ).sort();

  // =========================================================
  // R:R CALCULATION
  // =========================================================

  const rr = useMemo(() => {
    const e = Number(entry);
    const s = Number(sl);
    const t = Number(tp);

    if (!e || !s || !t) return null;

    const riskDistance = Math.abs(e - s);
    const rewardDistance = Math.abs(t - e);

    if (riskDistance === 0) return null;

    return (rewardDistance / riskDistance).toFixed(2);
  }, [entry, sl, tp]);

  // =========================================================
  // NAVIGATION
  // =========================================================

  function navigate(section: string) {
    setActiveSection(section);
    setSidebarOpen(false);

    if (section === "Dashboard") {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }

    if (section === "Analytics") {
      document
        .getElementById("analytics-section")
        ?.scrollIntoView({
          behavior: "smooth",
        });
    }

    if (section === "Trades") {
      document
        .getElementById("trades-section")
        ?.scrollIntoView({
          behavior: "smooth",
        });
    }

    if (section === "Settings") {
      document
        .getElementById("settings-section")
        ?.scrollIntoView({
          behavior: "smooth",
        });
    }
  }

  // =========================================================
  // CLEAR FORM
  // =========================================================

  function clearForm() {
    setEntry("");
    setSl("");
    setTp("");
    setExit("");
    setLot("");
    setRisk("");
    setPnl("");
    setEditingId(null);
  }

  // =========================================================
  // SAVE / UPDATE TRADE
  // =========================================================

  async function saveTrade() {
    if (
      !entry ||
      !sl ||
      !tp ||
      !exit ||
      !lot ||
      !risk ||
      !pnl
    ) {
      alert("Please fill all fields");
      return;
    }

    // Make sure user is logged in
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const e = Number(entry);
    const s = Number(sl);
    const t = Number(tp);
    const x = Number(exit);

    if (Math.abs(e - s) === 0) {
      alert("Entry aur SL same nahi ho sakte.");
      return;
    }

    // =====================================================
    // UPDATE EXISTING TRADE
    // RLS will allow only user's own trade
    // =====================================================

    if (editingId !== null) {
      const { data, error } = await supabase
        .from("trades")
        .update({
          pair,
          type,
          entry: e,
          sl: s,
          tp: t,
          exit: x,
          lot: Number(lot),
          risk: Number(risk),
          pnl: Number(pnl),
        })
        .eq("id", editingId)
        .select()
        .single();

      if (error) {
        console.error("Update error:", error);
        alert(
          "Trade update nahi hua. Sirf apne trades edit kar sakte ho."
        );
        return;
      }

      setTrades((prev) =>
        prev.map((trade) =>
          trade.id === editingId ? data : trade
        )
      );

      clearForm();

      alert("Trade updated successfully!");
      return;
    }

    // =====================================================
    // INSERT NEW TRADE
    // USER ID IS AUTOMATICALLY SAVED
    // =====================================================

    const { data, error } = await supabase
      .from("trades")
      .insert([
        {
          pair,
          type,
          entry: e,
          sl: s,
          tp: t,
          exit: x,
          lot: Number(lot),
          risk: Number(risk),
          pnl: Number(pnl),

          // IMPORTANT
          user_id: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Insert error:", error);
      alert("Trade save nahi hua.");
      return;
    }

    setTrades((prev) => [...prev, data]);

    clearForm();

    const calculatedRR =
      Math.abs(t - e) / Math.abs(e - s);

    alert(
      "Trade saved! R:R = " +
        calculatedRR.toFixed(2)
    );
  }

  // =========================================================
  // EDIT TRADE
  // =========================================================

  function editTrade(trade: Trade) {
    setEditingId(trade.id);
    setPair(trade.pair);
    setType(trade.type);
    setEntry(String(trade.entry));
    setSl(String(trade.sl));
    setTp(String(trade.tp));
    setExit(String(trade.exit));
    setLot(String(trade.lot));
    setRisk(String(trade.risk));
    setPnl(String(trade.pnl));

    document
      .getElementById("trades-section")
      ?.scrollIntoView({
        behavior: "smooth",
      });
  }

  // =========================================================
  // DELETE TRADE
  // =========================================================

  async function deleteTrade(id: number) {
    const confirmDelete = confirm(
      "Kya aap ye trade delete karna chahte ho?"
    );

    if (!confirmDelete) return;

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
      .eq("id", id);

    if (error) {
      console.error("Delete error:", error);
      alert(
        "Trade delete nahi hua. Sirf apne trades delete kar sakte ho."
      );
      return;
    }

    setTrades((prev) =>
      prev.filter((trade) => trade.id !== id)
    );
  }

  // =========================================================
  // FORMAT MONTH
  // =========================================================

  function formatMonth(month: string) {
    const parts = month.split("-");

    const date = new Date(
      Number(parts[0]),
      Number(parts[1]) - 1
    );

    return date.toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    });
  }

  // =========================================================
  // LOADING SCREEN
  // =========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-[#030712] text-white flex items-center justify-center">

        <div className="text-center">

          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center text-3xl shadow-xl shadow-cyan-500/20">
            📈
          </div>

          <p className="mt-5 text-slate-400">
            Loading your journal...
          </p>

        </div>

      </main>
    );
  }

  // =========================================================
  // MAIN UI
  // =========================================================

  return (
    <main className="min-h-screen bg-[#030712] text-white">

      {/* MOBILE HEADER */}

      <header className="md:hidden sticky top-0 z-50 bg-[#050914]/90 backdrop-blur-xl border-b border-white/10 px-4 py-3">

        <div className="flex items-center justify-between">

          <button
            onClick={() => setSidebarOpen(true)}
            className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl hover:bg-white/10 transition"
          >
            ☰
          </button>

          <div className="text-center">

            <p className="font-black text-lg tracking-tight">
              Trade Journal
            </p>

            <p className="text-[9px] text-cyan-400 uppercase tracking-[0.2em]">
              Trading Analytics
            </p>

          </div>

          <div className="w-11 h-11 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
            📈
          </div>

        </div>

      </header>


      {/* OVERLAY */}

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        />
      )}


      {/* SIDEBAR */}

      <aside
        className={
          "fixed left-0 top-0 h-screen w-72 bg-[#050914] border-r border-white/10 z-[60] transition-transform duration-300 " +
          (sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0")
        }
      >

        {/* LOGO */}

        <div className="p-6 border-b border-white/10">

          <div className="flex items-center gap-3">

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center text-2xl shadow-xl shadow-cyan-500/20">
              📈
            </div>

            <div>

              <h2 className="font-black text-lg">
                Trade Journal
              </h2>

              <p className="text-xs text-slate-500">
                Professional Analytics
              </p>

            </div>

          </div>

        </div>


        {/* NAVIGATION */}

        <div className="p-4">

          <p className="text-[10px] text-slate-600 uppercase tracking-[0.2em] font-bold px-3 mb-3">
            Navigation
          </p>

          {[
            ["Dashboard", "⌂"],
            ["Trades", "▣"],
            ["Analytics", "◈"],
            ["Settings", "⚙"],
          ].map(([name, icon]) => (

            <button
              key={name}
              onClick={() => navigate(name)}
              className={
                "group w-full flex items-center gap-4 px-4 py-3.5 rounded-xl mb-2 text-left transition-all duration-200 " +
                (activeSection === name
                  ? "bg-gradient-to-r from-cyan-500/15 to-blue-500/5 text-cyan-400 border border-cyan-400/20 shadow-lg shadow-cyan-500/5"
                  : "text-slate-400 hover:bg-white/5 hover:text-white")
              }
            >

              <span
                className={
                  "text-xl w-6 text-center transition-transform group-hover:scale-110 " +
                  (activeSection === name
                    ? "text-cyan-400"
                    : "")
                }
              >
                {icon}
              </span>

              <span className="font-semibold">
                {name}
              </span>

              {activeSection === name && (
                <span className="ml-auto w-2 h-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/70" />
              )}

            </button>

          ))}

        </div>


        {/* ACCOUNT CARD */}

        <div className="absolute bottom-0 left-0 right-0 p-4">

          <div className="rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 p-4">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-black">
                {userEmail
                  ? userEmail.charAt(0).toUpperCase()
                  : "T"}
              </div>

              <div className="min-w-0">

                <p className="font-bold text-sm">
                  Trader
                </p>

                <p className="text-[11px] text-slate-500 truncate max-w-[170px]">
                  {userEmail || "Personal Journal"}
                </p>

              </div>

            </div>


            <div className="mt-4 pt-3 border-t border-white/10 flex justify-between">

              <div>

                <p className="text-[10px] text-slate-600 uppercase">
                  Trades
                </p>

                <p className="font-black mt-1">
                  {trades.length}
                </p>

              </div>


              <div className="text-right">

                <p className="text-[10px] text-slate-600 uppercase">
                  P&L
                </p>

                <p
                  className={
                    "font-black mt-1 " +
                    (totalPnl >= 0
                      ? "text-emerald-400"
                      : "text-red-400")
                  }
                >
                  {totalPnl >= 0 ? "+" : ""}
                  {totalPnl.toFixed(2)}
                </p>

              </div>

            </div>


            {/* LOGOUT */}

            <button
              onClick={logout}
              className="w-full mt-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500 hover:text-white transition"
            >
              Logout
            </button>

          </div>

        </div>

      </aside>


      {/* MAIN */}

      <div className="md:ml-72">

        <div className="max-w-[1500px] mx-auto px-4 md:px-8 py-6 md:py-10">


          {/* TOP HEADER */}

          <div
            id="dashboard-section"
            className="hidden md:flex items-center justify-between mb-10"
          >

            <div>

              <div className="flex items-center gap-2 mb-2">

                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />

                <span className="text-xs text-emerald-400 font-bold uppercase tracking-widest">
                  Dashboard Live
                </span>

              </div>

              <h1 className="text-5xl font-black tracking-tight">
                Good Trading.
              </h1>

              <p className="text-slate-500 mt-2">
                Track, analyze and improve your trading performance.
              </p>

            </div>


            <div className="flex items-center gap-3">

              <div className="px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/10">

                <p className="text-[10px] text-slate-600 uppercase tracking-widest">
                  Total Trades
                </p>

                <p className="font-black text-xl mt-1">
                  {trades.length}
                </p>

              </div>


              <button
                onClick={() => {
                  setActiveSection("Trades");

                  document
                    .getElementById("trades-section")
                    ?.scrollIntoView({
                      behavior: "smooth",
                    });
                }}
                className="px-5 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold shadow-xl shadow-cyan-500/10 hover:scale-[1.02] transition"
              >
                + Add Trade
              </button>

            </div>

          </div>


          {/* MOBILE INTRO */}

          <div className="md:hidden mb-6">

            <p className="text-xs text-cyan-400 font-bold uppercase tracking-widest">
              Dashboard
            </p>

            <h1 className="text-3xl font-black mt-2">
              Trading Overview
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Track your performance.
            </p>

          </div>


          {/* FILTERS */}

          <div className="rounded-3xl bg-white/[0.03] border border-white/10 p-5 mb-6 backdrop-blur-xl">

            <div className="flex items-center justify-between mb-4">

              <div>

                <p className="text-xs text-cyan-400 font-bold uppercase tracking-widest">
                  Analytics
                </p>

                <h2 className="font-bold text-lg mt-1">
                  Performance Filters
                </h2>

              </div>


              <button
                onClick={() => {
                  setFilterPair("ALL");
                  setFilterType("ALL");
                  setFilterMonth("ALL");
                }}
                className="px-3 py-2 rounded-lg bg-white/5 text-xs text-slate-400 hover:text-white transition"
              >
                Reset
              </button>

            </div>


            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

              <select
                value={filterPair}
                onChange={(e) =>
                  setFilterPair(e.target.value)
                }
                className="bg-[#080d19] border border-white/10 rounded-xl p-3 outline-none focus:border-cyan-400 transition"
              >

                <option value="ALL">
                  All Pairs
                </option>

                {availablePairs.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}

              </select>


              <select
                value={filterType}
                onChange={(e) =>
                  setFilterType(e.target.value)
                }
                className="bg-[#080d19] border border-white/10 rounded-xl p-3 outline-none focus:border-cyan-400 transition"
              >

                <option value="ALL">
                  BUY + SELL
                </option>

                <option value="BUY">
                  BUY Only
                </option>

                <option value="SELL">
                  SELL Only
                </option>

              </select>


              <select
                value={filterMonth}
                onChange={(e) =>
                  setFilterMonth(e.target.value)
                }
                className="bg-[#080d19] border border-white/10 rounded-xl p-3 outline-none focus:border-cyan-400 transition"
              >

                <option value="ALL">
                  All Months
                </option>

                {availableMonths.map((month) => (
                  <option key={month} value={month}>
                    {formatMonth(month)}
                  </option>
                ))}

              </select>

            </div>

          </div>


          {/* PRIMARY STATS */}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">

            {/* PNL */}

            <div className="group rounded-3xl p-5 bg-gradient-to-br from-emerald-500/[0.12] to-white/[0.02] border border-emerald-400/10 hover:border-emerald-400/30 transition">

              <div className="flex items-center justify-between">

                <p className="text-xs text-slate-500 uppercase tracking-wider">
                  Total P&L
                </p>

                <span className="text-lg">
                  $
                </span>

              </div>

              <p
                className={
                  "text-3xl md:text-4xl font-black mt-4 " +
                  (totalPnl >= 0
                    ? "text-emerald-400"
                    : "text-red-400")
                }
              >
                {totalPnl >= 0 ? "+" : ""}
                {totalPnl.toFixed(2)}
              </p>

              <p className="text-xs text-slate-600 mt-2">
                Across filtered trades
              </p>

            </div>


            {/* WIN RATE */}

            <div className="group rounded-3xl p-5 bg-gradient-to-br from-blue-500/[0.12] to-white/[0.02] border border-blue-400/10 hover:border-blue-400/30 transition">

              <div className="flex items-center justify-between">

                <p className="text-xs text-slate-500 uppercase tracking-wider">
                  Win Rate
                </p>

                <span className="text-lg">
                  %
                </span>

              </div>

              <p className="text-3xl md:text-4xl font-black mt-4 text-blue-400">
                {winRate.toFixed(1)}%
              </p>

              <p className="text-xs text-slate-600 mt-2">
                {wins.length} winning trades
              </p>

            </div>


            {/* PROFIT FACTOR */}

            <div className="group rounded-3xl p-5 bg-gradient-to-br from-purple-500/[0.12] to-white/[0.02] border border-purple-400/10 hover:border-purple-400/30 transition">

              <div className="flex items-center justify-between">

                <p className="text-xs text-slate-500 uppercase tracking-wider">
                  Profit Factor
                </p>

                <span className="text-lg">
                  ◈
                </span>

              </div>

              <p className="text-3xl md:text-4xl font-black mt-4 text-purple-400">
                {profitFactor.toFixed(2)}
              </p>

              <p className="text-xs text-slate-600 mt-2">
                Gross profit / loss
              </p>

            </div>


            {/* DRAWDOWN */}

            <div className="group rounded-3xl p-5 bg-gradient-to-br from-orange-500/[0.12] to-white/[0.02] border border-orange-400/10 hover:border-orange-400/30 transition">

              <div className="flex items-center justify-between">

                <p className="text-xs text-slate-500 uppercase tracking-wider">
                  Max Drawdown
                </p>

                <span className="text-lg">
                  ↓
                </span>

              </div>

              <p className="text-3xl md:text-4xl font-black mt-4 text-orange-400">
                -{maxDrawdown.toFixed(2)}
              </p>

              <p className="text-xs text-slate-600 mt-2">
                Maximum equity decline
              </p>

            </div>

          </div>


          {/* SECONDARY STATS */}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">

            <div className="p-5 rounded-3xl bg-white/[0.025] border border-white/10">

              <p className="text-xs text-slate-600 uppercase">
                Winning Trades
              </p>

              <p className="text-2xl font-black text-emerald-400 mt-3">
                {wins.length}
              </p>

            </div>


            <div className="p-5 rounded-3xl bg-white/[0.025] border border-white/10">

              <p className="text-xs text-slate-600 uppercase">
                Losing Trades
              </p>

              <p className="text-2xl font-black text-red-400 mt-3">
                {losses.length}
              </p>

            </div>


            <div className="p-5 rounded-3xl bg-white/[0.025] border border-white/10">

              <p className="text-xs text-slate-600 uppercase">
                Average Win
              </p>

              <p className="text-2xl font-black text-emerald-400 mt-3">
                +{averageWin.toFixed(2)}
              </p>

            </div>


            <div className="p-5 rounded-3xl bg-white/[0.025] border border-white/10">

              <p className="text-xs text-slate-600 uppercase">
                Average Loss
              </p>

              <p className="text-2xl font-black text-red-400 mt-3">
                {averageLoss.toFixed(2)}
              </p>

            </div>

          </div>


          {/* ANALYTICS */}

          <section id="analytics-section">

            {/* EQUITY */}

            <div className="rounded-3xl bg-white/[0.03] border border-white/10 p-5 md:p-7 mb-6">

              <div className="flex items-start justify-between mb-7">

                <div>

                  <p className="text-xs text-cyan-400 font-bold uppercase tracking-widest">
                    Performance
                  </p>

                  <h2 className="text-xl md:text-2xl font-black mt-1">
                    Equity Curve
                  </h2>

                  <p className="text-sm text-slate-600 mt-1">
                    Cumulative trading performance
                  </p>

                </div>


                <div className="px-3 py-2 rounded-xl bg-cyan-400/10 text-cyan-400 text-xs font-bold">
                  {filteredTrades.length} Trades
                </div>

              </div>


              {equityCurve.length === 0 ? (

                <div className="h-64 flex items-center justify-center rounded-2xl bg-black/10 text-slate-600">
                  No trading data available
                </div>

              ) : (

                <div className="h-64 flex items-end gap-1 overflow-x-auto pb-2">

                  {equityCurve.map((item) => {

                    const maxAbs = Math.max(
                      ...equityCurve.map((x) =>
                        Math.abs(x.balance)
                      ),
                      1
                    );

                    const height =
                      (Math.abs(item.balance) /
                        maxAbs) *
                      100;

                    return (
                      <div
                        key={item.trade}
                        className="min-w-[18px] h-full flex items-end group relative"
                        title={
                          "Trade " +
                          item.trade +
                          " | P&L: " +
                          item.balance.toFixed(2)
                        }
                      >

                        <div
                          className={
                            "w-full rounded-t-md transition-all duration-300 group-hover:opacity-80 " +
                            (item.balance >= 0
                              ? "bg-gradient-to-t from-cyan-600 to-cyan-300"
                              : "bg-gradient-to-t from-red-600 to-red-300")
                          }
                          style={{
                            height:
                              Math.max(height, 3) +
                              "%",
                          }}
                        />

                      </div>
                    );
                  })}

                </div>

              )}

            </div>


            {/* WIN LOSS + STREAK */}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

              {/* WIN LOSS */}

              <div className="rounded-3xl bg-white/[0.03] border border-white/10 p-5 md:p-7">

                <p className="text-xs text-cyan-400 font-bold uppercase tracking-widest">
                  Outcomes
                </p>

                <h2 className="text-xl font-black mt-1">
                  Win / Loss
                </h2>

                <p className="text-sm text-slate-600 mt-1 mb-7">
                  Trade outcome distribution
                </p>


                <div className="flex items-center justify-center gap-10">

                  <div
                    className="w-36 h-36 md:w-44 md:h-44 rounded-full flex items-center justify-center"
                    style={{
                      background:
                        "conic-gradient(#34d399 " +
                        winRate +
                        "%, #f87171 " +
                        winRate +
                        "%)",
                    }}
                  >

                    <div className="w-24 h-24 md:w-30 md:h-30 rounded-full bg-[#070b14] flex items-center justify-center border border-white/10">

                      <div className="text-center">

                        <p className="text-2xl font-black">
                          {winRate.toFixed(0)}%
                        </p>

                        <p className="text-[9px] text-slate-600 uppercase tracking-widest">
                          Win Rate
                        </p>

                      </div>

                    </div>

                  </div>


                  <div className="space-y-5">

                    <div>

                      <div className="flex items-center gap-2">

                        <span className="w-2 h-2 rounded-full bg-emerald-400" />

                        <p className="text-sm text-slate-400">
                          Wins
                        </p>

                      </div>

                      <p className="text-3xl font-black mt-1">
                        {wins.length}
                      </p>

                    </div>


                    <div>

                      <div className="flex items-center gap-2">

                        <span className="w-2 h-2 rounded-full bg-red-400" />

                        <p className="text-sm text-slate-400">
                          Losses
                        </p>

                      </div>

                      <p className="text-3xl font-black mt-1">
                        {losses.length}
                      </p>

                    </div>

                  </div>

                </div>

              </div>


              {/* STREAK */}

              <div className="rounded-3xl bg-gradient-to-br from-orange-500/[0.08] to-white/[0.02] border border-orange-400/10 p-5 md:p-7">

                <p className="text-xs text-orange-400 font-bold uppercase tracking-widest">
                  Discipline
                </p>

                <h2 className="text-xl font-black mt-1">
                  Current Streak
                </h2>

                <p className="text-sm text-slate-600 mt-1">
                  Latest consecutive results
                </p>


                <div className="mt-8">

                  <p className="text-7xl font-black text-orange-400">
                    {currentStreak.count}
                  </p>

                  <p className="text-lg font-bold text-slate-400 mt-2">
                    {currentStreak.type}
                    {currentStreak.count === 1
                      ? " trade"
                      : " trades"}
                  </p>


                  <div className="mt-7 h-2 bg-white/5 rounded-full overflow-hidden">

                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 rounded-full"
                      style={{
                        width:
                          Math.min(
                            currentStreak.count * 15,
                            100
                          ) + "%",
                      }}
                    />

                  </div>

                </div>

              </div>

            </div>


            {/* MONTHLY */}

            <div className="rounded-3xl bg-white/[0.03] border border-white/10 p-5 md:p-7 mb-8">

              <div className="mb-7">

                <p className="text-xs text-cyan-400 font-bold uppercase tracking-widest">
                  History
                </p>

                <h2 className="text-xl font-black mt-1">
                  Monthly Performance
                </h2>

                <p className="text-sm text-slate-600 mt-1">
                  P&L grouped by month
                </p>

              </div>


              {monthlyPerformance.length === 0 ? (

                <div className="text-center py-10 text-slate-600">
                  No monthly data available
                </div>

              ) : (

                <div className="space-y-5">

                  {monthlyPerformance.map((item) => {

                    const maxValue = Math.max(
                      ...monthlyPerformance.map((x) =>
                        Math.abs(x.value)
                      ),
                      1
                    );

                    const width =
                      (Math.abs(item.value) /
                        maxValue) *
                      100;

                    return (
                      <div key={item.month}>

                        <div className="flex justify-between mb-2">

                          <span className="text-sm text-slate-400">
                            {formatMonth(item.month)}
                          </span>

                          <span
                            className={
                              "text-sm font-black " +
                              (item.value >= 0
                                ? "text-emerald-400"
                                : "text-red-400")
                            }
                          >
                            {item.value >= 0 ? "+" : ""}
                            {item.value.toFixed(2)}
                          </span>

                        </div>


                        <div className="h-3 bg-white/5 rounded-full overflow-hidden">

                          <div
                            className={
                              "h-full rounded-full transition-all " +
                              (item.value >= 0
                                ? "bg-gradient-to-r from-emerald-600 to-emerald-300"
                                : "bg-gradient-to-r from-red-600 to-red-300")
                            }
                            style={{
                              width:
                                Math.max(width, 3) +
                                "%",
                            }}
                          />

                        </div>

                      </div>
                    );
                  })}

                </div>

              )}

            </div>

          </section>


          {/* TRADES */}

          <section id="trades-section">

            {/* ADD TRADE */}

            <div className="rounded-3xl bg-white/[0.03] border border-white/10 p-5 md:p-7 mb-6">

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-7">

                <div>

                  <p className="text-xs text-cyan-400 font-bold uppercase tracking-widest">
                    Trade Management
                  </p>

                  <h2 className="text-2xl font-black mt-1">
                    {editingId !== null
                      ? "Edit Trade"
                      : "Add New Trade"}
                  </h2>

                  <p className="text-sm text-slate-600 mt-1">
                    Record your setup and result
                  </p>

                </div>


                {rr && (

                  <div className="px-5 py-4 rounded-2xl bg-cyan-400/10 border border-cyan-400/20">

                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                      Risk : Reward
                    </p>

                    <p className="text-2xl font-black text-cyan-400 mt-1">
                      1 : {rr}
                    </p>

                  </div>

                )}

              </div>


              {/* BUY / SELL */}

              <div className="grid grid-cols-2 gap-3 mb-5">

                <button
                  onClick={() => setType("BUY")}
                  className={
                    "py-3 rounded-xl font-bold border transition " +
                    (type === "BUY"
                      ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-400"
                      : "bg-white/[0.02] border-white/10 text-slate-500")
                  }
                >
                  ↗ BUY
                </button>


                <button
                  onClick={() => setType("SELL")}
                  className={
                    "py-3 rounded-xl font-bold border transition " +
                    (type === "SELL"
                      ? "bg-red-500/15 border-red-400/40 text-red-400"
                      : "bg-white/[0.02] border-white/10 text-slate-500")
                  }
                >
                  ↘ SELL
                </button>

              </div>


              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {[
                  ["Entry", entry, setEntry],
                  ["Stop Loss", sl, setSl],
                  ["Take Profit", tp, setTp],
                  ["Exit", exit, setExit],
                  ["Lot Size", lot, setLot],
                  ["Risk", risk, setRisk],
                  ["P&L", pnl, setPnl],
                ].map(
                  ([label, value, setter]) => (

                    <div key={String(label)}>

                      <label className="text-xs text-slate-500 uppercase tracking-wider">
                        {String(label)}
                      </label>

                      <input
                        type="number"
                        value={String(value)}
                        onChange={(e) =>
                          (
                            setter as Dispatch<
                              SetStateAction<string>
                            >
                          )(e.target.value)
                        }
                        placeholder={String(label)}
                        className="w-full mt-2 bg-[#080d19] border border-white/10 rounded-xl p-3.5 outline-none focus:border-cyan-400 transition"
                      />

                    </div>

                  )
                )}


                {/* PAIR */}

                <div>

                  <label className="text-xs text-slate-500 uppercase tracking-wider">
                    Pair
                  </label>

                  <select
                    value={pair}
                    onChange={(e) =>
                      setPair(e.target.value)
                    }
                    className="w-full mt-2 bg-[#080d19] border border-white/10 rounded-xl p-3.5 outline-none focus:border-cyan-400"
                  >

                    <option>XAUUSD</option>
                    <option>EURUSD</option>
                    <option>GBPUSD</option>
                    <option>BTCUSD</option>
                    <option>USDJPY</option>

                  </select>

                </div>

              </div>


              {/* SAVE */}

              <div className="flex gap-3 mt-6">

                <button
                  onClick={saveTrade}
                  className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 font-black shadow-xl shadow-cyan-500/10 hover:scale-[1.01] transition"
                >
                  {editingId !== null
                    ? "✓ Update Trade"
                    : "+ Save Trade"}
                </button>


                {editingId !== null && (

                  <button
                    onClick={clearForm}
                    className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition"
                  >
                    Cancel
                  </button>

                )}

              </div>

            </div>


            {/* HISTORY */}

            <div className="rounded-3xl bg-white/[0.03] border border-white/10 p-5 md:p-7">

              <div className="flex items-center justify-between mb-6">

                <div>

                  <p className="text-xs text-cyan-400 font-bold uppercase tracking-widest">
                    Records
                  </p>

                  <h2 className="text-2xl font-black mt-1">
                    Trade History
                  </h2>

                </div>


                <div className="px-3 py-2 rounded-xl bg-white/5 text-xs text-slate-500">
                  {filteredTrades.length} records
                </div>

              </div>


              {filteredTrades.length === 0 ? (

                <div className="text-center py-12 text-slate-600">
                  No trades found.
                </div>

              ) : (

                <div className="overflow-x-auto">

                  <table className="w-full text-sm">

                    <thead>

                      <tr className="border-b border-white/10 text-slate-600">

                        <th className="text-left p-3">
                          Pair
                        </th>

                        <th className="text-left p-3">
                          Type
                        </th>

                        <th className="text-left p-3">
                          Entry
                        </th>

                        <th className="text-left p-3">
                          SL
                        </th>

                        <th className="text-left p-3">
                          TP
                        </th>

                        <th className="text-left p-3">
                          Exit
                        </th>

                        <th className="text-left p-3">
                          Lot
                        </th>

                        <th className="text-left p-3">
                          Risk
                        </th>

                        <th className="text-left p-3">
                          P&L
                        </th>

                        <th className="text-left p-3">
                          Action
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      {filteredTrades.map((trade) => (

                        <tr
                          key={trade.id}
                          className="border-b border-white/5 hover:bg-white/[0.025] transition"
                        >

                          <td className="p-3 font-black">
                            {trade.pair}
                          </td>


                          <td className="p-3">

                            <span
                              className={
                                "px-3 py-1.5 rounded-full text-[10px] font-black " +
                                (trade.type === "BUY"
                                  ? "bg-emerald-400/10 text-emerald-400"
                                  : "bg-red-400/10 text-red-400")
                              }
                            >
                              {trade.type}
                            </span>

                          </td>


                          <td className="p-3 text-slate-300">
                            {trade.entry}
                          </td>


                          <td className="p-3 text-red-400">
                            {trade.sl}
                          </td>


                          <td className="p-3 text-emerald-400">
                            {trade.tp}
                          </td>


                          <td className="p-3 text-slate-300">
                            {trade.exit}
                          </td>


                          <td className="p-3">
                            {trade.lot}
                          </td>


                          <td className="p-3">
                            {trade.risk}
                          </td>


                          <td
                            className={
                              "p-3 font-black " +
                              (Number(trade.pnl) >= 0
                                ? "text-emerald-400"
                                : "text-red-400")
                            }
                          >
                            {Number(trade.pnl) >= 0
                              ? "+"
                              : ""}
                            {Number(trade.pnl).toFixed(2)}
                          </td>


                          <td className="p-3">

                            <div className="flex gap-3">

                              <button
                                onClick={() =>
                                  editTrade(trade)
                                }
                                className="text-cyan-400 hover:text-cyan-300 font-semibold"
                              >
                                Edit
                              </button>


                              <button
                                onClick={() =>
                                  deleteTrade(trade.id)
                                }
                                className="text-red-400 hover:text-red-300 font-semibold"
                              >
                                Delete
                              </button>

                            </div>

                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              )}

            </div>

          </section>


          {/* SETTINGS */}

          <section
            id="settings-section"
            className="mt-6 rounded-3xl bg-white/[0.03] border border-white/10 p-5 md:p-7"
          >

            <p className="text-xs text-cyan-400 font-bold uppercase tracking-widest">
              System
            </p>

            <h2 className="text-2xl font-black mt-1">
              Settings
            </h2>

            <p className="text-sm text-slate-600 mt-1">
              Journal system information
            </p>


            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-7">

              <div className="p-5 rounded-2xl bg-[#080d19] border border-white/10">

                <p className="text-xs text-slate-600 uppercase">
                  Database
                </p>

                <div className="flex items-center gap-2 mt-3">

                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />

                  <p className="font-black text-emerald-400">
                    Connected
                  </p>

                </div>

              </div>


              <div className="p-5 rounded-2xl bg-[#080d19] border border-white/10">

                <p className="text-xs text-slate-600 uppercase">
                  Account
                </p>

                <p className="font-black text-cyan-400 mt-3 truncate">
                  {userEmail}
                </p>

              </div>


              <div className="p-5 rounded-2xl bg-[#080d19] border border-white/10">

                <p className="text-xs text-slate-600 uppercase">
                  Journal Status
                </p>

                <p className="font-black text-white mt-3">
                  Private & Active
                </p>

              </div>

            </div>

          </section>


          {/* FOOTER */}

          <footer className="text-center py-10 text-xs text-slate-700">
            Trade Journal • Private Trading Analytics
          </footer>

        </div>

      </div>

    </main>
  );
}