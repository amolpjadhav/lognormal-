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
    <div className="bg-[#0B0F1A] min-h-screen text-white flex flex-col">
      {/* Navigation */}
      <nav className="flex justify-between p-6 w-full items-center border-b border-white/5 bg-[#0B0F1A]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="font-bold text-2xl tracking-tighter flex items-center gap-2">
            <span className="bg-emerald-500 w-8 h-8 rounded-lg flex items-center justify-center text-black font-serif italic">Ln</span>
            Lognormal
          </div>
          <span className="hidden md:block text-sm text-slate-500 border-l border-white/10 pl-4">Master your market edge</span>
        </div>
        
        <div className="flex items-center gap-6">
          {loading ? (
            <div className="h-8 w-20 bg-slate-800 animate-pulse rounded-lg"></div>
          ) : user ? (
            <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition">
              <span className="text-sm font-medium text-slate-300">Dashboard</span>
              <img src={user.photoURL || ""} className="w-10 h-10 rounded-full border border-emerald-500" alt="Profile" />
            </Link>
          ) : (
            <button onClick={handleLogin} className="bg-emerald-500 text-black px-5 py-2 rounded-xl font-bold hover:bg-emerald-400 transition">
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow w-full max-w-[1600px] mx-auto px-6 py-6">
          {/* Search Section */}
          <div className="relative max-w-2xl mx-auto mb-8">
              <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                  <div className="relative flex items-center">
                    <input 
                      type="text" 
                      placeholder="Search for stocks, crypto, or ETFs..." 
                      className="w-full bg-[#161C2C] border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition shadow-xl"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <svg className="absolute left-4 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    {isSearching && <div className="absolute right-4 w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>}
                  </div>
              </div>
              
              {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#161C2C] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto">
                      {searchResults.map((result) => (
                          <button 
                            key={result.symbol}
                            onClick={() => handleSelectSymbol(result.symbol)}
                            className="w-full text-left px-4 py-3 hover:bg-white/5 transition flex justify-between items-center border-b border-white/5 last:border-0"
                          >
                              <div>
                                  <div className="font-bold text-white">{result.displaySymbol}</div>
                                  <div className="text-xs text-slate-400 truncate max-w-[200px]">{result.description}</div>
                              </div>
                              <div className="text-xs text-slate-500 uppercase border border-white/10 px-2 py-1 rounded">{result.type}</div>
                          </button>
                      ))}
                  </div>
              )}
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              Market Pulse
            </h2>
            <span className="text-xs text-emerald-500 font-mono bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">LIVE FEED</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {stocks.map((stock) => (
              <div key={stock.symbol} className="bg-gradient-to-b from-[#1E293B] to-[#0F172A] p-4 rounded-xl border border-white/5 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:-translate-y-1 group">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg text-white group-hover:text-emerald-400 transition">{stock.symbol}</h3>
                  <div className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${(stock.change || 0) >= 0 ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'}`}>
                    {(stock.change || 0) >= 0 ? '+' : ''}{(stock.change || 0).toFixed(2)}%
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                   <span className="text-xs text-slate-500">$</span>
                   <span className="text-2xl font-mono font-medium text-slate-200 tracking-tight">{stock.price ? stock.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}</span>
                </div>
              </div>
            ))}
            {stocks.length === 0 && (
              <div className="col-span-full text-center text-slate-500 py-20 bg-[#161C2C]/50 rounded-xl border border-white/5 border-dashed animate-pulse">
                Initializing agentic data engine...
              </div>
            )}
          </div>
      </main>

      {/* Stock Detail Modal */}
      {isModalOpen && selectedStock && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setIsModalOpen(false)}>
              <div className="bg-[#161C2C] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                  <div className="p-8">
                      <div className="flex justify-between items-start mb-8">
                          <div className="flex items-center gap-5">
                              {selectedStock.profile?.logo ? (
                                <img src={selectedStock.profile.logo} alt="logo" className="w-14 h-14 rounded-full bg-white p-1 object-contain" />
                              ) : (
                                <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold text-xl">
                                  {selectedStock.profile?.ticker?.[0] || "?"}
                                </div>
                              )}
                              <div>
                                  <h2 className="text-3xl font-bold text-white leading-none mb-1">{selectedStock.profile?.name || selectedStock.profile?.ticker || "Unknown Asset"}</h2>
                                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                                      <span className="font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 rounded">{selectedStock.profile?.ticker}</span>
                                      <span>•</span>
                                      <span>{selectedStock.profile?.finnhubIndustry || "Market Asset"}</span>
                                  </div>
                              </div>
                          </div>
                          <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                          </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                          <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                              <div className="text-sm text-slate-400 mb-1">Current Price</div>
                              <div className="text-5xl font-mono font-bold text-white tracking-tight">
                                  ${selectedStock.quote.c.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </div>
                              <div className={`flex items-center gap-3 mt-3 font-bold ${selectedStock.quote.d >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  <span className="text-xl">{selectedStock.quote.d >= 0 ? '+' : ''}{selectedStock.quote.d.toFixed(2)}</span>
                                  <span className={`px-2 py-0.5 rounded text-sm ${selectedStock.quote.d >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                                      {selectedStock.quote.dp.toFixed(2)}%
                                  </span>
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                              <div className="bg-[#0B0F1A] p-4 rounded-xl border border-white/5">
                                  <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Open</div>
                                  <div className="font-mono text-white text-lg">${selectedStock.quote.o.toFixed(2)}</div>
                              </div>
                              <div className="bg-[#0B0F1A] p-4 rounded-xl border border-white/5">
                                  <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Prev Close</div>
                                  <div className="font-mono text-white text-lg">${selectedStock.quote.pc.toFixed(2)}</div>
                              </div>
                              <div className="bg-[#0B0F1A] p-4 rounded-xl border border-white/5">
                                  <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider">High</div>
                                  <div className="font-mono text-white text-lg">${selectedStock.quote.h.toFixed(2)}</div>
                              </div>
                              <div className="bg-[#0B0F1A] p-4 rounded-xl border border-white/5">
                                  <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Low</div>
                                  <div className="font-mono text-white text-lg">${selectedStock.quote.l.toFixed(2)}</div>
                              </div>
                          </div>
                      </div>
                      
                      {selectedStock.profile && (
                          <div className="border-t border-white/10 pt-6 flex flex-wrap gap-6 text-sm text-slate-400">
                              {selectedStock.profile.marketCapitalization && <div><span className="text-slate-500 mr-2">Mkt Cap:</span><span className="text-white font-mono">${(selectedStock.profile.marketCapitalization).toLocaleString()}M</span></div>}
                              {selectedStock.profile.exchange && <div><span className="text-slate-500 mr-2">Exchange:</span><span className="text-white">{selectedStock.profile.exchange}</span></div>}
                              {selectedStock.profile.weburl && <a href={selectedStock.profile.weburl} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline ml-auto">Visit Website &rarr;</a>}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}