const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

if (!FINNHUB_API_KEY) {
  console.warn("Finnhub API key is missing. Using simulated data.");
}

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

export interface SearchResult {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
}

export interface StockQuote {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
}

export interface CompanyProfile {
  name: string;
  logo: string;
  ticker: string;
  weburl: string;
  finnhubIndustry: string;
  marketCapitalization: number;
  exchange: string;
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
    try {
      // Mag 7 Stocks + Major Crypto
      const targets = [
        { symbol: "BTC", query: "BINANCE:BTCUSDT" },
        { symbol: "ETH", query: "BINANCE:ETHUSDT" },
        { symbol: "SOL", query: "BINANCE:SOLUSDT" },
        { symbol: "NVDA", query: "NVDA" },
        { symbol: "AAPL", query: "AAPL" },
        { symbol: "MSFT", query: "MSFT" },
        { symbol: "GOOGL", query: "GOOGL" },
        { symbol: "AMZN", query: "AMZN" },
        { symbol: "META", query: "META" },
        { symbol: "TSLA", query: "TSLA" },
        { symbol: "AMD", query: "AMD" },
        { symbol: "NFLX", query: "NFLX" },
        { symbol: "AVGO", query: "AVGO" },
        { symbol: "PLTR", query: "PLTR" },
        { symbol: "COIN", query: "COIN" },
      ];

      const promises = targets.map(async (target) => {
        try {
          const response = await globalThis.fetch(
            `https://finnhub.io/api/v1/quote?symbol=${target.query}&token=${FINNHUB_API_KEY}`,
            { cache: 'no-store' }
          );
          const data = await response.json();
          if (data.c === 0 && data.h === 0) return null;
          return {
            symbol: target.symbol,
            name: target.symbol,
            price: data.c,
            change: data.dp,
          };
        } catch (error) {
          console.error(`Error fetching ${target.symbol}:`, error);
          return null;
        }
      });

      const results = await Promise.all(promises);
      const validResults = results.filter((item): item is StockData => item !== null);
      // Sort by absolute change descending to show top movers
      return validResults.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    } catch (err) {
      console.error("Error in getPopularStocks:", err);
    }
  }

  // Fallback: Simulating API call for popular stocks
  return new Promise((resolve) => {
    // Updated base prices to reflect current market conditions
    const stocks = [
      { symbol: "BTC", name: "Bitcoin", basePrice: 64500.00 },
      { symbol: "ETH", name: "Ethereum", basePrice: 3450.00 },
      { symbol: "SOL", name: "Solana", basePrice: 148.00 },
      { symbol: "NVDA", name: "NVIDIA Corp.", basePrice: 130.50 },
      { symbol: "AAPL", name: "Apple Inc.", basePrice: 230.50 },
      { symbol: "MSFT", name: "Microsoft Corp.", basePrice: 420.20 },
      { symbol: "GOOGL", name: "Alphabet Inc.", basePrice: 175.40 },
      { symbol: "AMZN", name: "Amazon.com", basePrice: 190.80 },
      { symbol: "META", name: "Meta Platforms", basePrice: 500.25 },
      { symbol: "TSLA", name: "Tesla, Inc.", basePrice: 240.10 },
      { symbol: "AMD", name: "Advanced Micro Devices", basePrice: 155.00 },
      { symbol: "NFLX", name: "Netflix", basePrice: 660.00 },
      { symbol: "AVGO", name: "Broadcom", basePrice: 165.00 },
      { symbol: "PLTR", name: "Palantir", basePrice: 28.50 },
      { symbol: "COIN", name: "Coinbase", basePrice: 225.00 },
    ];

    const data = stocks.map(stock => {
      const changePercent = (Math.random() * 5) - 2.5; // Random move between -2.5% and +2.5%
      const price = stock.basePrice * (1 + (changePercent / 100));
      return { symbol: stock.symbol, name: stock.name, price, change: parseFloat(changePercent.toFixed(2)) };
    });
    // Sort by absolute change descending
    data.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
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

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  if (!FINNHUB_API_KEY || !query) return [];
  
  const upperQuery = query.toUpperCase();
  const commonCryptos: SearchResult[] = [
    { description: "Bitcoin", displaySymbol: "BTC", symbol: "BINANCE:BTCUSDT", type: "Crypto" },
    { description: "Ethereum", displaySymbol: "ETH", symbol: "BINANCE:ETHUSDT", type: "Crypto" },
    { description: "Solana", displaySymbol: "SOL", symbol: "BINANCE:SOLUSDT", type: "Crypto" },
    { description: "Dogecoin", displaySymbol: "DOGE", symbol: "BINANCE:DOGEUSDT", type: "Crypto" },
    { description: "Cardano", displaySymbol: "ADA", symbol: "BINANCE:ADAUSDT", type: "Crypto" },
    { description: "Ripple", displaySymbol: "XRP", symbol: "BINANCE:XRPUSDT", type: "Crypto" },
    { description: "Polkadot", displaySymbol: "DOT", symbol: "BINANCE:DOTUSDT", type: "Crypto" },
    { description: "Polygon", displaySymbol: "MATIC", symbol: "BINANCE:MATICUSDT", type: "Crypto" },
    { description: "Chainlink", displaySymbol: "LINK", symbol: "BINANCE:LINKUSDT", type: "Crypto" }
  ];

  const cryptoMatches = commonCryptos.filter(c => 
    c.displaySymbol.includes(upperQuery) || c.description.toUpperCase().includes(upperQuery)
  );

  try {
    const response = await globalThis.fetch(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${FINNHUB_API_KEY}`,
      { cache: 'no-store' }
    );
    const data = await response.json();
    return [...cryptoMatches, ...(data.result || [])];
  } catch (error) {
    console.error("Error searching symbols:", error);
    return cryptoMatches;
  }
}

export async function getStockDetails(symbol: string): Promise<{ quote: StockQuote | null, profile: CompanyProfile | null }> {
  if (!FINNHUB_API_KEY) return { quote: null, profile: null };
  
  try {
    // Use Promise.allSettled to handle cases where profile might fail (e.g. crypto) but quote succeeds
    const [quoteRes, profileRes] = await Promise.allSettled([
      globalThis.fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`, { cache: 'no-store' }),
      globalThis.fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_API_KEY}`, { cache: 'no-store' })
    ]);

    let quote = null;
    let profile = null;

    if (quoteRes.status === 'fulfilled' && quoteRes.value.ok) {
        quote = await quoteRes.value.json();
    }
    
    if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
        profile = await profileRes.value.json();
    }

    return {
      quote: (quote && quote.c) ? quote : null,
      profile: (profile && profile.name) ? profile : null
    };
  } catch (error) {
    console.error("Error fetching stock details:", error);
    return { quote: null, profile: null };
  }
}