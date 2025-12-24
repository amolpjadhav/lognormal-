const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

export interface MarketData {
  btcPrice: number;
  ethPrice: number;
  ratio: number;
}

export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
}

export async function getCryptoPrices(): Promise<MarketData | null> {
  if (!FINNHUB_API_KEY) return null;

  try {
    const [btcRes, ethRes] = await Promise.all([
      globalThis.fetch(`https://finnhub.io/api/v1/quote?symbol=BINANCE:BTCUSDT&token=${FINNHUB_API_KEY}`, { cache: 'no-store' }),
      globalThis.fetch(`https://finnhub.io/api/v1/quote?symbol=BINANCE:ETHUSDT&token=${FINNHUB_API_KEY}`, { cache: 'no-store' })
    ]);

    if (!btcRes.ok || !ethRes.ok) throw new Error('Failed to fetch prices');

    const btcData = await btcRes.json();
    const ethData = await ethRes.json();

    return {
      btcPrice: btcData.c,
      ethPrice: ethData.c,
      ratio: btcData.c / ethData.c,
    };
  } catch (error) {
    console.error("Error fetching crypto prices:", error);
    return null;
  }
}

export async function getPopularStocks(): Promise<StockData[]> {
  // If API key is available, fetch real data from Finnhub
  if (FINNHUB_API_KEY) {
    const stocks = [
      { symbol: "AAPL", name: "Apple Inc." },
      { symbol: "NVDA", name: "NVIDIA Corp." },
      { symbol: "MSFT", name: "Microsoft Corp." },
      { symbol: "TSLA", name: "Tesla, Inc." },
      { symbol: "AMZN", name: "Amazon.com" },
      { symbol: "GOOGL", name: "Alphabet Inc." },
    ];

    const promises = stocks.map(async (stock) => {
      try {
        const response = await globalThis.fetch(
          `https://finnhub.io/api/v1/quote?symbol=${stock.symbol}&token=${FINNHUB_API_KEY}`,
          { cache: 'no-store' }
        );
        const data = await response.json();
        return {
          symbol: stock.symbol,
          name: stock.name,
          price: data.c,
          change: data.dp,
        };
      } catch (error) {
        console.error(`Error fetching ${stock.symbol}:`, error);
        return null;
      }
    });

    const results = await Promise.all(promises);
    return results.filter((item): item is StockData => item !== null);
  }

  // Fallback: Simulating API call for popular stocks
  return new Promise((resolve) => {
    // Updated base prices to reflect current market conditions
    const stocks = [
      { symbol: "AAPL", name: "Apple Inc.", basePrice: 230.50 },
      { symbol: "NVDA", name: "NVIDIA Corp.", basePrice: 130.50 }, // Post-split price
      { symbol: "MSFT", name: "Microsoft Corp.", basePrice: 420.20 },
      { symbol: "TSLA", name: "Tesla, Inc.", basePrice: 240.10 },
      { symbol: "AMZN", name: "Amazon.com", basePrice: 190.80 },
      { symbol: "GOOGL", name: "Alphabet Inc.", basePrice: 175.40 },
    ];

    const data = stocks.map(stock => {
      const changePercent = (Math.random() * 5) - 2.5; // Random move between -2.5% and +2.5%
      const price = stock.basePrice * (1 + (changePercent / 100));
      return { symbol: stock.symbol, name: stock.name, price, change: parseFloat(changePercent.toFixed(2)) };
    });
    resolve(data);
  });
}

export async function getAssetPrices(tickers: string[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  
  // Map common tickers to Finnhub symbols (Binance for crypto)
  const cryptoMap: Record<string, string> = {
    'BTC': 'BINANCE:BTCUSDT',
    'ETH': 'BINANCE:ETHUSDT',
    'SOL': 'BINANCE:SOLUSDT',
    'DOGE': 'BINANCE:DOGEUSDT',
    'ADA': 'BINANCE:ADAUSDT',
    'XRP': 'BINANCE:XRPUSDT',
    'DOT': 'BINANCE:DOTUSDT',
    'MATIC': 'BINANCE:MATICUSDT',
    'LINK': 'BINANCE:LINKUSDT'
  };

  if (FINNHUB_API_KEY) {
    await Promise.all(tickers.map(async (ticker) => {
      const upper = ticker.toUpperCase();
      const querySymbol = cryptoMap[upper] || upper;
      try {
        const response = await globalThis.fetch(
          `https://finnhub.io/api/v1/quote?symbol=${querySymbol}&token=${FINNHUB_API_KEY}`,
          { cache: 'no-store' }
        );
        const data = await response.json();
        if (data.c) {
          prices[upper] = data.c;
        }
      } catch (error) {
        console.error(`Error fetching asset ${ticker}:`, error);
      }
    }));
  } else {
    // Fallback: Simulate Prices
    tickers.forEach(ticker => {
      let basePrice = 100;
      switch(ticker) {
        case 'BTC': basePrice = 65000.00; break;
        case 'ETH': basePrice = 3500.00; break;
        case 'SOL': basePrice = 145.00; break;
        case 'AAPL': basePrice = 230.50; break;
        case 'MSFT': basePrice = 420.20; break;
        case 'GOOGL': basePrice = 175.40; break;
        case 'AMZN': basePrice = 190.80; break;
        case 'TSLA': basePrice = 240.10; break;
        case 'NVDA': basePrice = 130.50; break;
        default: basePrice = 150.00; // Fallback for unknown stocks
      }
      // Add +/- 2% random fluctuation
      prices[ticker] = basePrice * (1 + (Math.random() * 0.04 - 0.02));
    });
  }

  return prices;
}