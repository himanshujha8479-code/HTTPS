"use client";

import { useEffect, useMemo, useState } from "react";
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
  user_id?: string | null;
};

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // =========================
  // ADD TRADE FORM
  // =========================

  const [pair, setPair] = useState("BTCUSDT");
  const [tradeType, setTradeType] =
    useState<"BUY" | "SELL">("BUY");

  const [entry, setEntry] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [exit, setExit] = useState("");
  const [lot, setLot] = useState("");
  const [risk, setRisk] = useState("");
  const [pnl, setPnl] = useState("");

  // =========================
  // LOAD USER + TRADES
  // =========================

  async function loadTrades() {
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      console.log(
        "TRADES PAGE USER:",
        user
      );

      console.log(
        "TRADES PAGE USER ERROR:",
        userError
      );

      if (userError || !user) {
        setUserId(null);
        setTrades([]);
        setLoading(false);
        return;
      }

      setUserId(user.id);

      console.log(
        "TRADES PAGE USER ID:",
        user.id
      );

      const {
        data,
        error,
      } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      console.log(
        "TRADES PAGE DATA:",
        data
      );

      console.log(
        "TRADES PAGE ERROR:",
        error
      );

      if (error) {
        console.error(
          "Error loading trades:",
          error
        );

        setTrades([]);
        setLoading(false);
        return;
      }

      setTrades(
        (data || []) as Trade[]
      );
    } catch (error) {
      console.error(
        "Unexpected trades error:",
        error
      );

      setTrades([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrades();
  }, []);

  // =========================
  // ADD TRADE
  // =========================

  async function addTrade() {
    if (!userId) {
      alert(
        "Please login before adding a trade."
      );
      return;
    }

    if (
      !pair.trim() ||
      !entry ||
      !sl ||
      !tp ||
      !exit ||
      !lot ||
      !risk ||
      !pnl
    ) {
      alert(
        "Please fill all trade fields."
      );
      return;
    }

    const entryValue = Number(entry);
    const slValue = Number(sl);
    const tpValue = Number(tp);
    const exitValue = Number(exit);
    const lotValue = Number(lot);
    const riskValue = Number(risk);
    const pnlValue = Number(pnl);

    if (
      !Number.isFinite(entryValue) ||
      !Number.isFinite(slValue) ||
      !Number.isFinite(tpValue) ||
      !Number.isFinite(exitValue) ||
      !Number.isFinite(lotValue) ||
      !Number.isFinite(riskValue) ||
      !Number.isFinite(pnlValue)
    ) {
      alert(
        "Please enter valid numbers."
      );
      return;
    }

    try {
      setSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert(
          "Your login session has expired. Please login again."
        );
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from("trades")
        .insert([
          {
            pair:
              pair.trim().toUpperCase(),
            type: tradeType,
            entry: entryValue,
            sl: slValue,
            tp: tpValue,
            exit: exitValue,
            lot: lotValue,
            risk: riskValue,
            pnl: pnlValue,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error(
          "ADD TRADE ERROR:",
          error
        );

        alert(
          `Failed to add trade: ${error.message}`
        );

        return;
      }

      console.log(
        "TRADE ADDED:",
        data
      );

      if (data) {
        setTrades((current) => [
          data as Trade,
          ...current,
        ]);
      }

      // Reset form
      setPair("BTCUSDT");
      setTradeType("BUY");
      setEntry("");
      setSl("");
      setTp("");
      setExit("");
      setLot("");
      setRisk("");
      setPnl("");

      alert("Trade added successfully.");
    } catch (error) {
      console.error(
        "Unexpected add trade error:",
        error
      );

      alert(
        "Something went wrong while adding the trade."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // DELETE TRADE
  // =========================

  async function deleteTrade(id: number) {
    if (!userId) {
      alert("Please login first.");
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this trade?"
      );

    if (!confirmed) return;

    const {
      error,
    } = await supabase
      .from("trades")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      alert(
        "Failed to delete trade"
      );

      console.error(error);
      return;
    }

    setTrades((current) =>
      current.filter(
        (trade) => trade.id !== id
      )
    );
  }

  // =========================
  // FILTERS
  // =========================

  const filteredTrades =
    useMemo(() => {
      return trades.filter(
        (trade) => {
          const matchesSearch =
            trade.pair
              .toLowerCase()
              .includes(
                search.toLowerCase()
              );

          const matchesType =
            typeFilter === "ALL" ||
            trade.type ===
              typeFilter;

          return (
            matchesSearch &&
            matchesType
          );
        }
      );
    }, [
      trades,
      search,
      typeFilter,
    ]);

  // =========================
  // STATS
  // =========================

  const totalPnl =
    filteredTrades.reduce(
      (sum, trade) =>
        sum +
        Number(
          trade.pnl || 0
        ),
      0
    );

  const winningTrades =
    filteredTrades.filter(
      (trade) =>
        Number(trade.pnl) > 0
    ).length;

  const losingTrades =
    filteredTrades.filter(
      (trade) =>
        Number(trade.pnl) < 0
    ).length;

  const winRate =
    filteredTrades.length > 0
      ? (winningTrades /
          filteredTrades.length) *
        100
      : 0;

  // =========================
  // UI
  // =========================

  return (
    <main className="min-h-screen bg-[#030712] text-white">

      <div className="max-w-7xl mx-auto px-4 py-6 md:px-8 md:py-10">

        {/* HEADER */}

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">

          <div>

            <div className="flex items-center gap-2 mb-3">

              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>

              <span className="text-xs font-semibold tracking-widest text-emerald-400">
                TRADE MANAGEMENT
              </span>

            </div>

            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Trades
            </h1>

            <p className="text-gray-400 mt-2">
              Add, review, filter and manage your trading history.
            </p>

          </div>

          <button
            onClick={loadTrades}
            className="w-full md:w-auto px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition font-semibold"
          >
            ↻ Refresh Trades
          </button>

        </div>

        {/* ACCOUNT STATUS */}

        <div className="rounded-xl border border-gray-800 bg-gray-900/70 px-4 py-3 mb-6 text-sm">

          {userId ? (
            <span className="text-emerald-400">
              ● Account connected
            </span>
          ) : (
            <span className="text-red-400">
              ● Not connected
            </span>
          )}

        </div>

        {/* =========================
            ADD TRADE
        ========================= */}

        <section className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5 md:p-6 mb-6">

          <div className="mb-5">

            <h2 className="text-xl font-semibold">
              Add Trade
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Your account ID will be automatically attached to this trade.
            </p>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* PAIR */}

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Pair
              </label>

              <input
                type="text"
                value={pair}
                onChange={(e) =>
                  setPair(
                    e.target.value
                  )
                }
                placeholder="BTCUSDT"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            {/* TYPE */}

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Type
              </label>

              <select
                value={tradeType}
                onChange={(e) =>
                  setTradeType(
                    e.target.value as
                      | "BUY"
                      | "SELL"
                  )
                }
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="BUY">
                  BUY
                </option>

                <option value="SELL">
                  SELL
                </option>

              </select>
            </div>

            {/* ENTRY */}

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Entry
              </label>

              <input
                type="number"
                step="any"
                value={entry}
                onChange={(e) =>
                  setEntry(
                    e.target.value
                  )
                }
                placeholder="Entry price"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            {/* SL */}

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Stop Loss
              </label>

              <input
                type="number"
                step="any"
                value={sl}
                onChange={(e) =>
                  setSl(
                    e.target.value
                  )
                }
                placeholder="SL"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            {/* TP */}

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Take Profit
              </label>

              <input
                type="number"
                step="any"
                value={tp}
                onChange={(e) =>
                  setTp(
                    e.target.value
                  )
                }
                placeholder="TP"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            {/* EXIT */}

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Exit
              </label>

              <input
                type="number"
                step="any"
                value={exit}
                onChange={(e) =>
                  setExit(
                    e.target.value
                  )
                }
                placeholder="Exit price"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            {/* LOT */}

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Lot
              </label>

              <input
                type="number"
                step="any"
                value={lot}
                onChange={(e) =>
                  setLot(
                    e.target.value
                  )
                }
                placeholder="0.01"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            {/* RISK */}

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Risk
              </label>

              <input
                type="number"
                step="any"
                value={risk}
                onChange={(e) =>
                  setRisk(
                    e.target.value
                  )
                }
                placeholder="Risk"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            {/* PNL */}

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                P&L
              </label>

              <input
                type="number"
                step="any"
                value={pnl}
                onChange={(e) =>
                  setPnl(
                    e.target.value
                  )
                }
                placeholder="Profit / Loss"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

          </div>

          {/* ADD BUTTON */}

          <div className="mt-5">

            <button
              onClick={addTrade}
              disabled={
                saving || !userId
              }
              className="w-full md:w-auto px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
            >
              {saving
                ? "Adding Trade..."
                : "＋ Add Trade"}
            </button>

          </div>

        </section>

        {/* SUMMARY CARDS */}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

          <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">

            <p className="text-sm text-gray-400">
              Total Trades
            </p>

            <p className="text-2xl font-bold mt-2">
              {filteredTrades.length}
            </p>

          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">

            <p className="text-sm text-gray-400">
              Total P&L
            </p>

            <p
              className={
                "text-2xl font-bold mt-2 " +
                (totalPnl >= 0
                  ? "text-emerald-400"
                  : "text-red-400")
              }
            >
              {totalPnl >= 0
                ? "+"
                : ""}
              {totalPnl.toFixed(2)}
            </p>

          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">

            <p className="text-sm text-gray-400">
              Win Rate
            </p>

            <p className="text-2xl font-bold mt-2 text-blue-400">
              {winRate.toFixed(1)}%
            </p>

          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">

            <p className="text-sm text-gray-400">
              Wins / Losses
            </p>

            <p className="text-2xl font-bold mt-2">

              <span className="text-emerald-400">
                {winningTrades}
              </span>

              <span className="text-gray-600 mx-2">
                /
              </span>

              <span className="text-red-400">
                {losingTrades}
              </span>

            </p>

          </div>

        </div>

        {/* FILTERS */}

        <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4 mb-6">

          <div className="flex flex-col md:flex-row gap-3">

            <input
              type="text"
              placeholder="Search pair..."
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
            />

            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(
                  e.target.value
                )
              }
              className="bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
            >

              <option value="ALL">
                All Trades
              </option>

              <option value="BUY">
                BUY Only
              </option>

              <option value="SELL">
                SELL Only
              </option>

            </select>

          </div>

        </div>

        {/* TRADE TABLE */}

        <div className="rounded-2xl border border-gray-800 bg-gray-900/70 overflow-hidden">

          <div className="px-5 py-5 border-b border-gray-800">

            <h2 className="text-lg font-semibold">
              Trade History
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              {filteredTrades.length} trade
              {filteredTrades.length !== 1
                ? "s"
                : ""}{" "}
              shown
            </p>

          </div>

          {loading ? (

            <div className="p-12 text-center text-gray-400">
              Loading trades...
            </div>

          ) : !userId ? (

            <div className="p-12 text-center">

              <div className="text-4xl mb-4">
                🔐
              </div>

              <h3 className="font-semibold text-lg">
                Please login
              </h3>

              <p className="text-gray-500 mt-2">
                Login to view your trading history.
              </p>

            </div>

          ) : filteredTrades.length === 0 ? (

            <div className="p-12 text-center">

              <div className="text-4xl mb-4">
                📊
              </div>

              <h3 className="font-semibold text-lg">
                No trades found
              </h3>

              <p className="text-gray-500 mt-2">
                Add your first trade using the form above.
              </p>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead>

                  <tr className="border-b border-gray-800 bg-gray-950/50 text-gray-500">

                    <th className="text-left px-5 py-4 font-medium">
                      Pair
                    </th>

                    <th className="text-left px-5 py-4 font-medium">
                      Type
                    </th>

                    <th className="text-left px-5 py-4 font-medium">
                      Entry
                    </th>

                    <th className="text-left px-5 py-4 font-medium">
                      SL
                    </th>

                    <th className="text-left px-5 py-4 font-medium">
                      TP
                    </th>

                    <th className="text-left px-5 py-4 font-medium">
                      Exit
                    </th>

                    <th className="text-left px-5 py-4 font-medium">
                      Lot
                    </th>

                    <th className="text-left px-5 py-4 font-medium">
                      Risk
                    </th>

                    <th className="text-left px-5 py-4 font-medium">
                      P&L
                    </th>

                    <th className="text-right px-5 py-4 font-medium">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredTrades.map(
                    (trade) => {

                      const tradePnl =
                        Number(
                          trade.pnl || 0
                        );

                      return (

                        <tr
                          key={trade.id}
                          className="border-b border-gray-800/70 hover:bg-gray-800/30 transition"
                        >

                          <td className="px-5 py-4 font-semibold whitespace-nowrap">
                            {trade.pair}
                          </td>

                          <td className="px-5 py-4">

                            <span
                              className={
                                trade.type ===
                                "BUY"
                                  ? "inline-flex px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-semibold text-xs"
                                  : "inline-flex px-3 py-1 rounded-lg bg-red-500/10 text-red-400 font-semibold text-xs"
                              }
                            >
                              {trade.type}
                            </span>

                          </td>

                          <td className="px-5 py-4 text-gray-300">
                            {trade.entry}
                          </td>

                          <td className="px-5 py-4 text-gray-400">
                            {trade.sl}
                          </td>

                          <td className="px-5 py-4 text-gray-400">
                            {trade.tp}
                          </td>

                          <td className="px-5 py-4 text-gray-300">
                            {trade.exit}
                          </td>

                          <td className="px-5 py-4 text-gray-300">
                            {trade.lot}
                          </td>

                          <td className="px-5 py-4 text-gray-300">
                            {trade.risk}
                          </td>

                          <td
                            className={
                              "px-5 py-4 font-bold whitespace-nowrap " +
                              (tradePnl >=
                              0
                                ? "text-emerald-400"
                                : "text-red-400")
                            }
                          >
                            {tradePnl >=
                            0
                              ? "+"
                              : ""}
                            {tradePnl.toFixed(
                              2
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">

                            <button
                              onClick={() =>
                                deleteTrade(
                                  trade.id
                                )
                              }
                              className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                            >
                              Delete
                            </button>

                          </td>

                        </tr>

                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </div>

    </main>
  );
}