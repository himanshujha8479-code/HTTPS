import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const interval = searchParams.get("interval") || "15m";

    const requestedLimit = Number(
      searchParams.get("limit") || "100"
    );

    const limit = Math.min(
      Math.max(requestedLimit, 1),
      500
    );

    const allowedIntervals = [
      "5m",
      "15m",
      "1h",
      "4h",
      "1d",
    ];

    if (!allowedIntervals.includes(interval)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid timeframe",
        },
        { status: 400 }
      );
    }

    const url =
      "https://api.binance.com/api/v3/klines" +
      `?symbol=BTCUSDT` +
      `&interval=${interval}` +
      `&limit=${limit}`;

    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "Binance API error:",
        errorText
      );

      return NextResponse.json(
        {
          success: false,
          error: "Market data provider error",
        },
        { status: response.status }
      );
    }

    const rawData = await response.json();

    const candles = rawData.map(
      (candle: any[]) => ({
        time: candle[0],
        open: Number(candle[1]),
        high: Number(candle[2]),
        low: Number(candle[3]),
        close: Number(candle[4]),
        volume: Number(candle[5]),
      })
    );

    return NextResponse.json({
      success: true,
      symbol: "BTCUSDT",
      interval,
      candles,
    });
  } catch (error) {
    console.error(
      "Market data route error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch market data",
      },
      { status: 500 }
    );
  }
}