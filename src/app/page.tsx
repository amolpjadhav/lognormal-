"use client";
import Link from 'next/link';
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { getPopularStocks, searchSymbols, getStockDetails, type StockData, type SearchResult, type StockQuote, type CompanyProfile } from "@/lib/market-data";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedStock, setSelectedStock] = useState<{ quote: StockQuote, profile: CompanyProfile | null } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check for existing Lognormal profile
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Initialize new user with empty portfolio and default settings
        await setDoc(userRef, {
          email: user.email,
          displayName: user.displayName,
          createdAt: new Date(),
          preferredCurrency: "USD",
          watchList: ["BTC", "ETH", "AAPL"],
          onboardingComplete: false
        });
      }
      
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Login Error:", error);
      alert(`Login failed: ${error.message}`);
    }
  };

  useEffect(() => {
    const fetchStocks = async () => {
      const data = await getPopularStocks();
      setStocks(data);
    };
    fetchStocks();
  }, []);

  // Debounce search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 1) {
        setIsSearching(true);
        const results = await searchSymbols(searchQuery);
        setSearchResults(results.slice(0, 8)); // Limit results
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectSymbol = async (symbol: string) => {
      setSearchQuery("");
      setSearchResults([]);
      setIsSearching(true);
      const { quote, profile } = await getStockDetails(symbol);
      if (quote) {
          setSelectedStock({ quote, profile });
          setIsModalOpen(true);
      }
      setIsSearching(false);
  };

  return (
    <div className="min-h-screen bg-[#030712] text-cyan-50 font-mono selection:bg-cyan-500/30 relative overflow-hidden flex flex-col">
       {/* Cyberpunk Grid Background */}
       <div className="fixed inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none z-0" />
       <div className="fixed inset-0 bg-gradient-to-b from-transparent via-transparent to-[#030712] pointer-events-none z-0" />

      {/* Navigation */}
      <nav className="relative z-10 flex justify-between p-6 w-full items-center border-b border-cyan-900/30 bg-[#030712]/80 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-4">
          <div className="font-bold text-xl tracking-tighter flex items-center gap-3">
             <div className="flex items-center gap-2 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-cyan-500 blur-sm opacity-50 group-hover:opacity-100 transition"></div>
                  <span className="relative bg-black border border-cyan-500/50 w-10 h-10 rounded flex items-center justify-center text-cyan-400 font-bold text-lg">Ln</span>
                </div>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">LOGNORMAL // TERMINAL</span>
             </div>
          </div>
          <span className="hidden md:block text-xs text-cyan-800 border-l border-cyan-900/30 pl-4 uppercase tracking-widest">Master your market edge</span>
        </div>
        
        <div className="flex items-center gap-6">
          {loading ? (
            <div className="h-8 w-20 bg-cyan-900/20 animate-pulse rounded-sm"></div>
          ) : user ? (
            <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition group">
              <span className="text-xs font-bold text-cyan-600 group-hover:text-cyan-400 uppercase tracking-widest">[ Dashboard ]</span>
              <img src={user.photoURL || ""} className="w-8 h-8 rounded border border-cyan-500/50" alt="Profile" />
            </Link>
          ) : (
            <button onClick={handleLogin} className="bg-cyan-600 text-black px-6 py-2 rounded-sm font-bold uppercase tracking-wider hover:bg-cyan-500 transition shadow-[0_0_15px_rgba(8,145,178,0.4)]">
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex-grow w-full max-w-[1600px] mx-auto px-6 py-6">
          {/* Search Section */}
          <div className="relative max-w-2xl mx-auto mb-12 mt-8">
              <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                  <div className="relative flex items-center">
                    <input 
                      type="text" 
                      placeholder="SEARCH ASSETS (e.g. AAPL, BTC)..." 
                      className="w-full bg-[#0B1221] border border-cyan-900/50 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition font-mono text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <svg className="absolute left-4 w-5 h-5 text-cyan-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    {isSearching && <div className="absolute right-4 w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>}
                  </div>
              </div>
              
              {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#0B1221] border border-cyan-900/50 shadow-[0_0_30px_rgba(0,0,0,0.5)] z-50 overflow-hidden max-h-80 overflow-y-auto">
                      {searchResults.map((result) => (
                          <button 
                            key={result.symbol}
                            onClick={() => handleSelectSymbol(result.symbol)}
                            className="w-full text-left px-4 py-3 hover:bg-cyan-900/20 transition flex justify-between items-center border-b border-cyan-900/30 last:border-0 group"
                          >
                              <div>
                                  <div className="font-bold text-white group-hover:text-cyan-400 transition font-mono">{result.displaySymbol}</div>
                                  <div className="text-xs text-slate-500 uppercase truncate max-w-[200px]">{result.description}</div>
                              </div>
                              <div className="text-[10px] text-cyan-600 uppercase border border-cyan-900/30 px-2 py-1 rounded tracking-wider">{result.type}</div>
                          </button>
                      ))}
                  </div>
              )}
          </div>

          <div className="flex items-center justify-between mb-6 border-b border-cyan-900/30 pb-2">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3 uppercase tracking-tight">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
              Market Pulse
            </h2>
            <span className="text-xs text-cyan-500 font-mono bg-cyan-500/10 px-3 py-1 rounded border border-cyan-500/20 tracking-widest">LIVE FEED</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {stocks.map((stock) => (
              <div key={stock.symbol} className="bg-[#0B1221]/80 backdrop-blur-sm p-4 border border-cyan-900/30 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] hover:-translate-y-1 group relative overflow-hidden">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg text-white group-hover:text-cyan-400 transition font-mono">{stock.symbol}</h3>
                  <div className={`px-2 py-0.5 text-[10px] font-bold tracking-wider border ${(stock.change || 0) >= 0 ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/30' : 'bg-red-950/30 text-red-400 border-red-500/30'}`}>
                    {(stock.change || 0) >= 0 ? '+' : ''}{(stock.change || 0).toFixed(2)}%
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                   <span className="text-xs text-slate-500">$</span>
                   <span className="text-2xl font-mono font-medium text-cyan-50 tracking-tighter">{stock.price ? stock.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}</span>
                </div>
              </div>
            ))}
            {stocks.length === 0 && (
              <div className="col-span-full text-center text-cyan-800 py-20 border border-cyan-900/30 border-dashed animate-pulse font-mono text-sm">
                // INITIALIZING AGENTIC DATA ENGINE...
              </div>
            )}
          </div>
      </main>

      {/* Stock Detail Modal */}
      {isModalOpen && selectedStock && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4" onClick={() => setIsModalOpen(false)}>
              <div className="bg-[#0B1221] border border-cyan-500/30 w-full max-w-2xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.2)] animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                  <div className="p-8 relative">
                      <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-cyan-700 hover:text-cyan-400 transition">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>

                      <div className="flex justify-between items-start mb-8">
                          <div className="flex items-center gap-5">
                              {selectedStock.profile?.logo ? (
                                <img src={selectedStock.profile.logo} alt="logo" className="w-14 h-14 rounded-full bg-white p-1 object-contain border-2 border-cyan-500/50" />
                              ) : (
                                <div className="w-14 h-14 rounded-full bg-cyan-900/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400 font-bold text-xl font-mono">
                                  {selectedStock.profile?.ticker?.[0] || "?"}
                                </div>
                              )}
                              <div>
                                  <h2 className="text-3xl font-bold text-white leading-none mb-1 tracking-tight">{selectedStock.profile?.name || selectedStock.profile?.ticker || "Unknown Asset"}</h2>
                                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                                      <span className="font-mono font-bold text-cyan-400 bg-cyan-900/20 px-2 border border-cyan-500/30">{selectedStock.profile?.ticker}</span>
                                      <span className="text-cyan-800">//</span>
                                      <span className="uppercase tracking-wider text-xs">{selectedStock.profile?.finnhubIndustry || "Market Asset"}</span>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                          <div className="bg-cyan-900/10 rounded p-6 border border-cyan-500/20 relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-2 opacity-10">
                                <svg className="w-20 h-20 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                              </div>
                              <div className="text-xs text-cyan-600 mb-1 uppercase tracking-widest font-bold">Current Price</div>
                              <div className="text-5xl font-mono font-bold text-white tracking-tighter drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                                  ${selectedStock.quote.c.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </div>
                              <div className={`flex items-center gap-3 mt-3 font-bold ${selectedStock.quote.d >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  <span className="text-xl font-mono">{selectedStock.quote.d >= 0 ? '+' : ''}{selectedStock.quote.d.toFixed(2)}</span>
                                  <span className={`px-2 py-0.5 text-xs border ${selectedStock.quote.d >= 0 ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-red-950/30 border-red-500/30'}`}>
                                      {selectedStock.quote.dp.toFixed(2)}%
                                  </span>
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                              <div className="bg-[#050914] p-4 border border-cyan-900/30">
                                  <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-widest">Open</div>
                                  <div className="font-mono text-cyan-50 text-lg">${selectedStock.quote.o.toFixed(2)}</div>
                              </div>
                              <div className="bg-[#050914] p-4 border border-cyan-900/30">
                                  <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-widest">Prev Close</div>
                                  <div className="font-mono text-cyan-50 text-lg">${selectedStock.quote.pc.toFixed(2)}</div>
                              </div>
                              <div className="bg-[#050914] p-4 border border-cyan-900/30">
                                  <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-widest">High</div>
                                  <div className="font-mono text-cyan-50 text-lg">${selectedStock.quote.h.toFixed(2)}</div>
                              </div>
                              <div className="bg-[#050914] p-4 border border-cyan-900/30">
                                  <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-widest">Low</div>
                                  <div className="font-mono text-cyan-50 text-lg">${selectedStock.quote.l.toFixed(2)}</div>
                              </div>
                          </div>
                      </div>
                      
                      {selectedStock.profile && (
                          <div className="border-t border-cyan-900/30 pt-6 flex flex-wrap gap-6 text-xs text-slate-400 font-mono uppercase tracking-wider">
                              {selectedStock.profile.marketCapitalization && <div><span className="text-cyan-700 mr-2">Mkt Cap:</span><span className="text-cyan-100">${(selectedStock.profile.marketCapitalization).toLocaleString()}M</span></div>}
                              {selectedStock.profile.exchange && <div><span className="text-cyan-700 mr-2">Exchange:</span><span className="text-cyan-100">{selectedStock.profile.exchange}</span></div>}
                              {selectedStock.profile.weburl && <a href={selectedStock.profile.weburl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:text-cyan-300 hover:underline ml-auto">[ Visit Website ]</a>}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}