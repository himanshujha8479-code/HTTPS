"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

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
};

function sma(values: number[], period: number) {
  if (values.length < period) return null;

  const slice = values.slice(values.length - period);

  return (
    slice.reduce((sum, value) => sum + value, 0) / slice.length
  );
}

function average(values: number[]) {
  if (!values.length) return 0;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getTrend(
  currentPrice: number,
  sma20: number | null,
  sma200: number | null
) {
  if (sma20 === null || sma200 === null) {
    return "Not enough data";
  }

  if (currentPrice > sma20 && sma20 > sma200) {
    return "Strong Bullish";
  }

  if (currentPrice > sma20 && sma20 < sma200) {
    return "Bullish Recovery";
  }

  if (currentPrice < sma20 && sma20 < sma200) {
    return "Strong Bearish";
  }

  if (currentPrice < sma20 && sma20 > sma200) {
    return "Bearish Pullback";
  }

  return "Neutral";
}

function getMarketStructure(candles: Candle[]) {
  if (candles.length < 10) return "Not enough data";

  const recent = candles.slice(-10);

  const firstHalf = recent.slice(0, 5);
  const secondHalf = recent.slice(5);

  const firstHigh = Math.max(...firstHalf.map((c) => c.high));
  const secondHigh = Math.max(...secondHalf.map((c) => c.high));

  const firstLow = Math.min(...firstHalf.map((c) => c.low));
  const secondLow = Math.min(...secondHalf.map((c) => c.low));

  if (secondHigh > firstHigh && secondLow > firstLow) {
    return "Higher Highs / Higher Lows";
  }

  if (secondHigh < firstHigh && secondLow < firstLow) {
    return "Lower Highs / Lower Lows";
  }

  return "Mixed / Range";
}

function getVolatility(candles: Candle[]) {
  if (candles.length < 10) return "Unknown";

  const recent = candles.slice(-10);

  const ranges = recent.map((c) => c.high - c.low);

  const avgRange = average(ranges);

  const currentRange =
    recent[recent.length - 1].high -
    recent[recent.length - 1].low;

  if (currentRange > avgRange * 1.5) {
    return "High";
  }

  if (currentRange < avgRange * 0.7) {
    return "Low";
  }

  return "Normal";
}

function getVolumeCondition(candles: Candle[]) {
  if (candles.length < 20) return "Unknown";

  const recentVolumes = candles.slice(-20).map((c) => c.volume);

  const avgVolume = average(recentVolumes);

  const currentVolume =
    recentVolumes[recentVolumes.length - 1];

  if (currentVolume > avgVolume * 1.5) {
    return "High Volume";
  }

  if (currentVolume < avgVolume * 0.6) {
    return "Low Volume";
  }

  return "Normal Volume";
}

export default function AIAnalyserPage() {
  const [market, setMarket] = useState("BTC");
  const [timeframe, setTimeframe] = useState("15m");

  const [candles, setCandles] = useState<Candle[]>([]);
  const [journalTrades, setJournalTrades] = useState<Trade[]>([]);

  const [loading, setLoading] = useState(false);
  const [journalLoading, setJournalLoading] = useState(true);

  const [error, setError] = useState("");

  const [currentUserId, setCurrentUserId] = useState<string | null>(
    null
  );

  // =========================
  // AI SCREENSHOT ANALYSER
  // =========================

  const [chartImage, setChartImage] = useState<string | null>(null);
  const [chartFile, setChartFile] = useState<File | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState("");

  // =========================
  // LOAD MARKET DATA
  // =========================

  async function loadMarketData() {
    setLoading(true);
    setError("");

    try {
      if (market !== "BTC") {
        setCandles([]);

        setError(
          `${market} market data will be connected next. BTC live data is currently active.`
        );

        setLoading(false);
        return;
      }

      const response = await fetch(
        `/api/market-data?interval=${timeframe}&limit=200`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to load market data"
        );
      }

      setCandles(data.candles || []);
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message || "Failed to load market data"
      );

      setCandles([]);
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // LOAD JOURNAL
  // =========================

  async function loadJournalTrades() {
    setJournalLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setCurrentUserId(null);
        setJournalTrades([]);
        return;
      }

      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from("trades")
        .select(
          "id,pair,type,entry,sl,tp,exit,lot,risk,pnl,created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(error);
        setJournalTrades([]);
        return;
      }

      setJournalTrades(data || []);
    } catch (err) {
      console.error(err);
      setJournalTrades([]);
    } finally {
      setJournalLoading(false);
    }
  }

  // =========================
  // IMAGE UPLOAD
  // =========================

  function handleChartUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAiError("Please upload an image file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setAiError("Image should be smaller than 10MB.");
      return;
    }

    setAiError("");
    setAiResult(null);

    setChartFile(file);

    const reader = new FileReader();

    reader.onload = () => {
      setChartImage(reader.result as string);
    };

    reader.readAsDataURL(file);
  }

  function removeChartImage() {
    setChartImage(null);
    setChartFile(null);
    setAiResult(null);
    setAiError("");
  }

  // =========================
  // AI ANALYSE
  // =========================

  async function analyzeChart() {
    if (!chartImage) {
      setAiError("Please upload a chart screenshot first.");
      return;
    }

    setAiLoading(true);
    setAiError("");
    setAiResult(null);

    /*
      AI API is intentionally NOT connected yet.

      We are keeping the UI ready so that we can connect
      a different AI provider later without changing the
      whole dashboard.
    */

    setTimeout(() => {
      setAiLoading(false);

      setAiResult(`
Chart uploaded successfully.

Selected Market: ${market}
Selected Timeframe: ${timeframe}

The screenshot is ready for AI analysis.

The next step is to connect an AI vision model. Once connected, this section will analyse:

1. Market Overview
2. Trend
3. Market Structure
4. Support & Resistance
5. Liquidity / Important Zones
6. Breakout or Rejection
7. Candlestick / Price Action
8. Visible Indicators
9. Momentum / Volatility
10. Bullish Scenario
11. Bearish Scenario
12. Invalidation Conditions
13. Risk Considerations
14. Final Chart Summary

The AI will only use information that is actually visible in the uploaded chart and will not invent prices or indicators.
`);
    }, 800);
  }

  // =========================
  // EFFECTS
  // =========================

  useEffect(() => {
    loadMarketData();
  }, [market, timeframe]);

  useEffect(() => {
    loadJournalTrades();
  }, []);

  // =========================
  // MARKET ANALYSIS
  // =========================

  const marketAnalysis = useMemo(() => {
    if (!candles.length) {
      return null;
    }

    const closes = candles.map((c) => c.close);

    const currentPrice = closes[closes.length - 1];

    const sma20 = sma(closes, 20);
    const sma200 = sma(closes, 200);

    const trend = getTrend(
      currentPrice,
      sma20,
      sma200
    );

    const structure = getMarketStructure(candles);

    const volatility = getVolatility(candles);

    const volume = getVolumeCondition(candles);

    let score = 50;

    if (trend.includes("Strong Bullish")) {
      score += 30;
    } else if (trend.includes("Bullish")) {
      score += 15;
    } else if (trend.includes("Strong Bearish")) {
      score -= 30;
    } else if (trend.includes("Bearish")) {
      score -= 15;
    }

    if (structure.includes("Higher")) {
      score += 10;
    }

    if (structure.includes("Lower")) {
      score -= 10;
    }

    score = Math.max(0, Math.min(100, score));

    let summary =
      "Market conditions are currently mixed.";

    if (score >= 70) {
      summary =
        "Current market structure shows bullish conditions.";
    } else if (score <= 30) {
      summary =
        "Current market structure shows bearish conditions.";
    } else {
      summary =
        "Current market conditions are mixed or ranging.";
    }

    return {
      currentPrice,
      sma20,
      sma200,
      trend,
      structure,
      volatility,
      volume,
      score,
      summary,
    };
  }, [candles]);

  // =========================
  // JOURNAL ANALYSIS
  // =========================

  const journalAnalysis = useMemo(() => {
    const totalTrades = journalTrades.length;

    const wins = journalTrades.filter(
      (trade) => Number(trade.pnl || 0) > 0
    ).length;

    const losses = journalTrades.filter(
      (trade) => Number(trade.pnl || 0) < 0
    ).length;

    const breakeven = journalTrades.filter(
      (trade) => Number(trade.pnl || 0) === 0
    ).length;

    const totalPnl = journalTrades.reduce(
      (sum, trade) => sum + Number(trade.pnl || 0),
      0
    );

    const winRate =
      totalTrades > 0
        ? (wins / totalTrades) * 100
        : 0;

    const winningPnls = journalTrades
      .filter((trade) => Number(trade.pnl || 0) > 0)
      .map((trade) => Number(trade.pnl || 0));

    const losingPnls = journalTrades
      .filter((trade) => Number(trade.pnl || 0) < 0)
      .map((trade) => Number(trade.pnl || 0));

    const averageWin =
      winningPnls.length > 0
        ? average(winningPnls)
        : 0;

    const averageLoss =
      losingPnls.length > 0
        ? average(losingPnls)
        : 0;

    const pairMap: Record<
      string,
      {
        trades: number;
        pnl: number;
      }
    > = {};

    journalTrades.forEach((trade) => {
      const pair = trade.pair || "Unknown";

      if (!pairMap[pair]) {
        pairMap[pair] = {
          trades: 0,
          pnl: 0,
        };
      }

      pairMap[pair].trades += 1;
      pairMap[pair].pnl += Number(trade.pnl || 0);
    });

    const pairStats = Object.entries(pairMap).map(
      ([pair, stats]) => ({
        pair,
        trades: stats.trades,
        pnl: stats.pnl,
      })
    );

    return {
      totalTrades,
      wins,
      losses,
      breakeven,
      totalPnl,
      winRate,
      averageWin,
      averageLoss,
      pairStats,
    };
  }, [journalTrades]);

  // =========================
  // FORMATTERS
  // =========================

  function formatPrice(value: number | null) {
    if (value === null || value === undefined) {
      return "-";
    }

    return value.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    });
  }

  function formatPnl(value: number | null) {
    const number = Number(value || 0);

    if (number > 0) {
      return `+$${number.toFixed(2)}`;
    }

    return `$${number.toFixed(2)}`;
  }

  function formatDate(value: string | null) {
    if (!value) return "-";

    return new Date(value).toLocaleString();
  }

  // =========================
  // UI
  // =========================

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050816",
        color: "#f8fafc",
        padding: "30px",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            marginBottom: "30px",
          }}
        >
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 800,
              marginBottom: "8px",
            }}
          >
            AI Trading Analyzer
          </h1>

          <p
            style={{
              color: "#94a3b8",
              margin: 0,
            }}
          >
            Market analysis + trading journal insights
          </p>

          {currentUserId && (
            <p
              style={{
                color: "#64748b",
                fontSize: "12px",
                marginTop: "8px",
              }}
            >
              Logged in successfully
            </p>
          )}
        </div>

        {/* MARKET CONTROLS */}

        <section
          style={{
            background: "#0b1120",
            border: "1px solid #1e293b",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "25px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <button
              onClick={() => setMarket("BTC")}
              style={{
                ...buttonStyle,
                background:
                  market === "BTC"
                    ? "#2563eb"
                    : "#111827",
              }}
            >
              BTC
            </button>

            <button
              onClick={() => setMarket("GOLD")}
              style={{
                ...buttonStyle,
                background:
                  market === "GOLD"
                    ? "#2563eb"
                    : "#111827",
              }}
            >
              GOLD
            </button>

            <button
              onClick={() => setMarket("EURUSD")}
              style={{
                ...buttonStyle,
                background:
                  market === "EURUSD"
                    ? "#2563eb"
                    : "#111827",
              }}
            >
              EURUSD
            </button>

            <select
              value={timeframe}
              onChange={(e) =>
                setTimeframe(e.target.value)
              }
              style={selectStyle}
            >
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1d">1D</option>
            </select>

            <button
              onClick={loadMarketData}
              style={{
                ...buttonStyle,
                background: "#7c3aed",
              }}
            >
              Analyze Market
            </button>
          </div>
        </section>

        {/* LOADING / ERROR */}

        {loading && (
          <div style={infoBoxStyle}>
            Loading market data...
          </div>
        )}

        {error && (
          <div
            style={{
              ...infoBoxStyle,
              borderColor: "#7f1d1d",
              color: "#fca5a5",
            }}
          >
            {error}
          </div>
        )}

        {/* MARKET ANALYSIS */}

        {marketAnalysis && (
          <section
            style={{
              marginBottom: "35px",
            }}
          >
            <h2 style={sectionTitle}>
              Market Analysis
            </h2>

            <div style={gridStyle}>
              <InfoCard
                title="Current Price"
                value={`$${formatPrice(
                  marketAnalysis.currentPrice
                )}`}
              />

              <InfoCard
                title="Trend"
                value={marketAnalysis.trend}
              />

              <InfoCard
                title="Structure"
                value={marketAnalysis.structure}
              />

              <InfoCard
                title="Volatility"
                value={marketAnalysis.volatility}
              />

              <InfoCard
                title="Volume"
                value={marketAnalysis.volume}
              />

              <InfoCard
                title="Market Score"
                value={`${marketAnalysis.score}/100`}
              />
            </div>

            <div
              style={{
                marginTop: "18px",
                background: "#0b1120",
                border: "1px solid #1e293b",
                borderRadius: "16px",
                padding: "20px",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: "10px",
                }}
              >
                Market Summary
              </h3>

              <p
                style={{
                  color: "#cbd5e1",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {marketAnalysis.summary}
              </p>

              <div
                style={{
                  marginTop: "16px",
                  display: "flex",
                  gap: "25px",
                  flexWrap: "wrap",
                  color: "#94a3b8",
                  fontSize: "14px",
                }}
              >
                <span>
                  SMA 20:{" "}
                  <strong style={{ color: "#fff" }}>
                    {marketAnalysis.sma20
                      ? `$${formatPrice(
                          marketAnalysis.sma20
                        )}`
                      : "-"}
                  </strong>
                </span>

                <span>
                  SMA 200:{" "}
                  <strong style={{ color: "#fff" }}>
                    {marketAnalysis.sma200
                      ? `$${formatPrice(
                          marketAnalysis.sma200
                        )}`
                      : "-"}
                  </strong>
                </span>
              </div>
            </div>

            {/* RECENT CANDLES */}

            <div
              style={{
                marginTop: "20px",
                background: "#0b1120",
                border: "1px solid #1e293b",
                borderRadius: "16px",
                padding: "20px",
                overflowX: "auto",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                }}
              >
                Recent Candles
              </h3>

              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "700px",
                }}
              >
                <thead>
                  <tr>
                    <th style={thStyle}>Time</th>
                    <th style={thStyle}>Open</th>
                    <th style={thStyle}>High</th>
                    <th style={thStyle}>Low</th>
                    <th style={thStyle}>Close</th>
                    <th style={thStyle}>Volume</th>
                  </tr>
                </thead>

                <tbody>
                  {candles
                    .slice(-10)
                    .reverse()
                    .map((candle) => (
                      <tr key={candle.time}>
                        <td style={tdStyle}>
                          {new Date(
                            candle.time
                          ).toLocaleString()}
                        </td>

                        <td style={tdStyle}>
                          {formatPrice(candle.open)}
                        </td>

                        <td style={tdStyle}>
                          {formatPrice(candle.high)}
                        </td>

                        <td style={tdStyle}>
                          {formatPrice(candle.low)}
                        </td>

                        <td style={tdStyle}>
                          {formatPrice(candle.close)}
                        </td>

                        <td style={tdStyle}>
                          {Math.round(
                            candle.volume
                          ).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ================================================= */}
        {/* AI CHART SCREENSHOT ANALYSER                     */}
        {/* ================================================= */}

        <section
          style={{
            background:
              "linear-gradient(145deg, #0b1120, #0f172a)",
            border: "1px solid #312e81",
            borderRadius: "18px",
            padding: "24px",
            marginBottom: "35px",
            boxShadow:
              "0 15px 40px rgba(0,0,0,0.25)",
          }}
        >
          <div
            style={{
              marginBottom: "22px",
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "6px 10px",
                borderRadius: "999px",
                background: "#1e1b4b",
                color: "#c4b5fd",
                fontSize: "12px",
                marginBottom: "10px",
              }}
            >
              AI VISION ANALYSER
            </div>

            <h2
              style={{
                fontSize: "24px",
                margin: "0 0 8px",
              }}
            >
              Analyze Chart Screenshot
            </h2>

            <p
              style={{
                color: "#94a3b8",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              Upload a TradingView or MT5 chart screenshot.
              The AI section will analyse visible price action,
              structure, zones, indicators and scenarios.
            </p>
          </div>

          {/* MARKET + TIMEFRAME */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(220px,1fr))",
              gap: "15px",
              marginBottom: "20px",
            }}
          >
            <div>
              <label style={labelStyle}>
                Market
              </label>

              <select
                value={market}
                onChange={(e) =>
                  setMarket(e.target.value)
                }
                style={{
                  ...selectStyle,
                  width: "100%",
                }}
              >
                <option value="BTC">
                  BTC
                </option>

                <option value="GOLD">
                  GOLD / XAUUSD
                </option>

                <option value="EURUSD">
                  EURUSD
                </option>

                <option value="OTHER">
                  Other
                </option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                Chart Timeframe
              </label>

              <select
                value={timeframe}
                onChange={(e) =>
                  setTimeframe(e.target.value)
                }
                style={{
                  ...selectStyle,
                  width: "100%",
                }}
              >
                <option value="5m">5 Minutes</option>
                <option value="15m">
                  15 Minutes
                </option>
                <option value="1h">
                  1 Hour
                </option>
                <option value="4h">
                  4 Hours
                </option>
                <option value="1d">
                  1 Day
                </option>
              </select>
            </div>
          </div>

          {/* UPLOAD AREA */}

          {!chartImage ? (
            <label
              htmlFor="chart-upload"
              style={{
                display: "block",
                border: "2px dashed #334155",
                borderRadius: "16px",
                padding: "45px 20px",
                textAlign: "center",
                cursor: "pointer",
                background: "#070d1a",
              }}
            >
              <div
                style={{
                  fontSize: "42px",
                  marginBottom: "12px",
                }}
              >
                📊
              </div>

              <div
                style={{
                  fontSize: "17px",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                Upload Chart Screenshot
              </div>

              <div
                style={{
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                PNG, JPG or WEBP — max 10MB
              </div>

              <input
                id="chart-upload"
                type="file"
                accept="image/*"
                onChange={handleChartUpload}
                style={{
                  display: "none",
                }}
              />
            </label>
          ) : (
            <div>
              {/* IMAGE PREVIEW */}

              <div
                style={{
                  position: "relative",
                  background: "#020617",
                  borderRadius: "16px",
                  padding: "10px",
                  border: "1px solid #1e293b",
                }}
              >
                <img
                  src={chartImage}
                  alt="Uploaded trading chart"
                  style={{
                    display: "block",
                    width: "100%",
                    maxHeight: "650px",
                    objectFit: "contain",
                    borderRadius: "10px",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginTop: "15px",
                }}
              >
                <button
                  onClick={analyzeChart}
                  disabled={aiLoading}
                  style={{
                    ...buttonStyle,
                    background: aiLoading
                      ? "#334155"
                      : "#7c3aed",
                    opacity: aiLoading ? 0.7 : 1,
                  }}
                >
                  {aiLoading
                    ? "Preparing Analysis..."
                    : "Analyze Chart"}
                </button>

                <button
                  onClick={removeChartImage}
                  style={{
                    ...buttonStyle,
                    background: "#1f2937",
                  }}
                >
                  Remove Screenshot
                </button>
              </div>

              {chartFile && (
                <p
                  style={{
                    color: "#64748b",
                    fontSize: "12px",
                    marginTop: "10px",
                  }}
                >
                  {chartFile.name}
                </p>
              )}
            </div>
          )}

          {/* ERROR */}

          {aiError && (
            <div
              style={{
                marginTop: "15px",
                padding: "14px",
                borderRadius: "10px",
                background: "#450a0a",
                border: "1px solid #7f1d1d",
                color: "#fca5a5",
              }}
            >
              {aiError}
            </div>
          )}

          {/* AI RESULT */}

          {aiResult && (
            <div
              style={{
                marginTop: "25px",
                background: "#020617",
                border: "1px solid #3730a3",
                borderRadius: "16px",
                padding: "22px",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  color: "#c4b5fd",
                }}
              >
                Analysis
              </h3>

              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  fontFamily:
                    "inherit",
                  color: "#cbd5e1",
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {aiResult}
              </pre>
            </div>
          )}
        </section>

        {/* JOURNAL */}

        <section
          style={{
            marginBottom: "35px",
          }}
        >
          <h2 style={sectionTitle}>
            Trading Journal Analysis
          </h2>

          {journalLoading ? (
            <div style={infoBoxStyle}>
              Loading journal...
            </div>
          ) : (
            <>
              {/* JOURNAL STATS */}

              <div style={gridStyle}>
                <InfoCard
                  title="Total Trades"
                  value={String(
                    journalAnalysis.totalTrades
                  )}
                />

                <InfoCard
                  title="Wins"
                  value={String(
                    journalAnalysis.wins
                  )}
                />

                <InfoCard
                  title="Losses"
                  value={String(
                    journalAnalysis.losses
                  )}
                />

                <InfoCard
                  title="Breakeven"
                  value={String(
                    journalAnalysis.breakeven
                  )}
                />

                <InfoCard
                  title="Win Rate"
                  value={`${journalAnalysis.winRate.toFixed(
                    1
                  )}%`}
                />

                <InfoCard
                  title="Total PnL"
                  value={formatPnl(
                    journalAnalysis.totalPnl
                  )}
                />

                <InfoCard
                  title="Average Win"
                  value={formatPnl(
                    journalAnalysis.averageWin
                  )}
                />

                <InfoCard
                  title="Average Loss"
                  value={formatPnl(
                    journalAnalysis.averageLoss
                  )}
                />
              </div>

              {/* PAIR PERFORMANCE */}

              <div
                style={{
                  marginTop: "20px",
                  background: "#0b1120",
                  border: "1px solid #1e293b",
                  borderRadius: "16px",
                  padding: "20px",
                  overflowX: "auto",
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                  }}
                >
                  Pair Performance
                </h3>

                {journalAnalysis.pairStats.length ===
                0 ? (
                  <p
                    style={{
                      color: "#64748b",
                    }}
                  >
                    No journal trades found.
                  </p>
                ) : (
                  <table
                    style={{
                      width: "100%",
                      borderCollapse:
                        "collapse",
                      minWidth: "500px",
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={thStyle}>
                          Pair
                        </th>

                        <th style={thStyle}>
                          Trades
                        </th>

                        <th style={thStyle}>
                          PnL
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {journalAnalysis.pairStats.map(
                        (item) => (
                          <tr key={item.pair}>
                            <td style={tdStyle}>
                              {item.pair}
                            </td>

                            <td style={tdStyle}>
                              {item.trades}
                            </td>

                            <td
                              style={{
                                ...tdStyle,
                                fontWeight: 700,
                              }}
                            >
                              {formatPnl(
                                item.pnl
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* RECENT TRADES */}

              <div
                style={{
                  marginTop: "20px",
                  background: "#0b1120",
                  border: "1px solid #1e293b",
                  borderRadius: "16px",
                  padding: "20px",
                  overflowX: "auto",
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                  }}
                >
                  Recent Trades
                </h3>

                {journalTrades.length === 0 ? (
                  <p
                    style={{
                      color: "#64748b",
                    }}
                  >
                    No trades found in your
                    journal.
                  </p>
                ) : (
                  <table
                    style={{
                      width: "100%",
                      borderCollapse:
                        "collapse",
                      minWidth: "900px",
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={thStyle}>
                          Pair
                        </th>

                        <th style={thStyle}>
                          Type
                        </th>

                        <th style={thStyle}>
                          Entry
                        </th>

                        <th style={thStyle}>
                          SL
                        </th>

                        <th style={thStyle}>
                          TP
                        </th>

                        <th style={thStyle}>
                          Exit
                        </th>

                        <th style={thStyle}>
                          PnL
                        </th>

                        <th style={thStyle}>
                          Date
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {journalTrades
                        .slice(0, 20)
                        .map((trade) => (
                          <tr key={trade.id}>
                            <td style={tdStyle}>
                              {trade.pair}
                            </td>

                            <td style={tdStyle}>
                              {trade.type ||
                                "-"}
                            </td>

                            <td style={tdStyle}>
                              {formatPrice(
                                trade.entry
                              )}
                            </td>

                            <td style={tdStyle}>
                              {formatPrice(
                                trade.sl
                              )}
                            </td>

                            <td style={tdStyle}>
                              {formatPrice(
                                trade.tp
                              )}
                            </td>

                            <td style={tdStyle}>
                              {formatPrice(
                                trade.exit
                              )}
                            </td>

                            <td
                              style={{
                                ...tdStyle,
                                fontWeight: 700,
                              }}
                            >
                              {formatPnl(
                                trade.pnl
                              )}
                            </td>

                            <td style={tdStyle}>
                              {formatDate(
                                trade.created_at
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

// =========================
// COMPONENTS
// =========================

function InfoCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "#0b1120",
        border: "1px solid #1e293b",
        borderRadius: "16px",
        padding: "20px",
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: "13px",
          marginBottom: "8px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "20px",
          fontWeight: 800,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// =========================
// STYLES
// =========================

const buttonStyle: React.CSSProperties = {
  border: "1px solid #334155",
  color: "#fff",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const selectStyle: React.CSSProperties = {
  background: "#111827",
  color: "#fff",
  border: "1px solid #334155",
  padding: "10px 14px",
  borderRadius: "10px",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#94a3b8",
  fontSize: "13px",
  marginBottom: "8px",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "23px",
  marginBottom: "18px",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(180px,1fr))",
  gap: "15px",
};

const infoBoxStyle: React.CSSProperties = {
  background: "#0b1120",
  border: "1px solid #1e293b",
  borderRadius: "12px",
  padding: "15px",
  marginBottom: "20px",
  color: "#cbd5e1",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px",
  borderBottom: "1px solid #1e293b",
  color: "#64748b",
  fontSize: "12px",
};

const tdStyle: React.CSSProperties = {
  padding: "12px",
  borderBottom: "1px solid #111827",
  color: "#cbd5e1",
  fontSize: "13px",
};