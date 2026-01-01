"use client";
import { useState, useEffect } from "react";
import { useAuth, logoutUser } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion, arrayRemove, onSnapshot, collection, addDoc, deleteDoc, serverTimestamp, query } from "firebase/firestore";
import { getAssetPrices, searchSymbols, type AssetQuote, type SearchResult } from "@/lib/market-data";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AiChatbot from "@/components/AiChatbot";

interface RatioPair {
  id: string;
  numerator: string;
  denominator: string;
  addedAt?: any;
}

export default function WatchlistPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [pairs, setPairs] = useState<RatioPair[]>([]);
  const [prices, setPrices] = useState<Record<string, AssetQuote>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'assets' | 'pairs'>('assets');
  
  // Pair inputs
  const [numInput, setNumInput] = useState("");
  const [denomInput, setDenomInput] = useState("");
  const [isAddingPair, setIsAddingPair] = useState(false);

  const handleLogout = async () => {
    await logoutUser();
    router.push("/");
  };

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  // Fetch Watchlist
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setWatchlist(data.watchList || []);
      }
    });
    return () => unsub();
  }, [user]);

  // Fetch Pairs
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "ratios"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPairs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RatioPair));
      setPairs(fetchedPairs);
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch Prices (Unified)
  useEffect(() => {
    const symbols = new Set<string>([...watchlist]);
    pairs.forEach(p => {
      symbols.add(p.numerator);
      symbols.add(p.denominator);
    });

    if (symbols.size === 0) return;

    const fetchPrices = async () => {
      const newPrices = await getAssetPrices(Array.from(symbols));
      setPrices(prev => ({ ...prev, ...newPrices }));
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [watchlist, pairs]);

  // Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 1) {
        setIsSearching(true);
        const results = await searchSymbols(searchQuery);
        setSearchResults(results.slice(0, 5));
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleAdd = async (symbol: string) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), {
      watchList: arrayUnion(symbol)
    });
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRemove = async (symbol: string) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), {
      watchList: arrayRemove(symbol)
    });
  };

  const handleAddPair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !numInput || !denomInput) return;
    setIsAddingPair(true);
    try {
      await addDoc(collection(db, "users", user.uid, "ratios"), {
        numerator: numInput.toUpperCase(),
        denominator: denomInput.toUpperCase(),
        addedAt: serverTimestamp()
      });
      setNumInput("");
      setDenomInput("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingPair(false);
    }
  };

  const handleDeletePair = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "ratios", id));
  };

  if (loading) return <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center text-emerald-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#030712] text-cyan-50 font-mono selection:bg-cyan-500/30 relative overflow-hidden">
       {/* Cyberpunk Grid Background */}
       <div className="fixed inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none z-0" />
       
       <nav className="relative z-10 border-b border-cyan-900/30 p-4 flex justify-between items-center bg-[#030712]/80 backdrop-blur-md">
        <div className="font-bold text-xl tracking-tighter flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500 blur-sm opacity-50 group-hover:opacity-100 transition"></div>
              <span className="relative bg-black border border-cyan-500/50 w-10 h-10 rounded flex items-center justify-center text-cyan-400 font-bold text-lg">Ln</span>
            </div>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">LOGNORMAL // TERMINAL</span>
          </Link>
        </div>
        <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-xs font-bold text-cyan-600 hover:text-cyan-400 uppercase tracking-widest transition">[ Dashboard ]</Link>
            <div className="flex items-center gap-4">
               <span className="text-xs text-slate-400 hidden md:inline font-bold uppercase">{user?.displayName}</span>
               {user?.photoURL && <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded border border-cyan-500/50" />}
               <button onClick={handleLogout} className="text-xs font-bold text-red-500 hover:text-red-400 transition uppercase border border-red-900/30 px-3 py-1 rounded hover:bg-red-950/30">Disconnect</button>
            </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <div className="text-xs text-cyan-600 font-bold tracking-[0.2em] mb-1">MARKET SURVEILLANCE</div>
            <h1 className="text-4xl font-black text-white tracking-tight uppercase">
              Asset <span className="text-cyan-500">Matrix</span>
            </h1>
          </div>
          
          {/* Tabs */}
          <div className="bg-[#0B1221] p-1 border border-cyan-900/30 flex">
            <button 
              onClick={() => setActiveTab('assets')}
              className={`px-6 py-2 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'assets' ? 'bg-cyan-600 text-black shadow-[0_0_15px_rgba(8,145,178,0.4)]' : 'text-slate-500 hover:text-cyan-400'}`}
            >
              Assets
            </button>
            <button 
              onClick={() => setActiveTab('pairs')}
              className={`px-6 py-2 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'pairs' ? 'bg-cyan-600 text-black shadow-[0_0_15px_rgba(8,145,178,0.4)]' : 'text-slate-500 hover:text-cyan-400'}`}
            >
              Pairs
            </button>
          </div>
        </div>

        {/* Input Section */}
        <div className="mb-10">
          {activeTab === 'assets' ? (
            <div className="relative max-w-md">
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="SEARCH TICKER (e.g. AAPL, BTC)..."
                        className="relative w-full bg-[#0B1221] border border-cyan-900/50 py-3 pl-4 pr-10 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition font-mono text-sm"
                    />
                    {isSearching && <div className="absolute right-3 top-3.5 w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>}
                </div>
                {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#0B1221] border border-cyan-900/50 shadow-[0_0_30px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                        {searchResults.map(result => (
                            <button 
                                key={result.symbol}
                                onClick={() => handleAdd(result.displaySymbol)}
                                className="w-full text-left px-4 py-3 hover:bg-white/5 transition flex justify-between items-center border-b border-white/5 last:border-0 group"
                            >
                                <div>
                                    <div className="font-bold text-white group-hover:text-cyan-400 transition font-mono">{result.displaySymbol}</div>
                                    <div className="text-xs text-slate-500 uppercase">{result.description}</div>
                                </div>
                                <div className="text-xs text-cyan-500 font-bold opacity-0 group-hover:opacity-100 transition transform translate-x-2 group-hover:translate-x-0 uppercase tracking-wider">[ Add ]</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
          ) : (
            <form onSubmit={handleAddPair} className="flex flex-col md:flex-row gap-4 items-end max-w-2xl">
              <div className="flex-1 w-full">
                  <label className="block text-xs text-cyan-600 mb-1 uppercase font-bold tracking-widest">Long Asset</label>
                  <input value={numInput} onChange={e => setNumInput(e.target.value)} className="w-full bg-[#0B1221] border border-cyan-900/50 px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition font-mono" placeholder="e.g. BTC" />
              </div>
              <div className="hidden md:flex items-center justify-center pb-4 text-cyan-800 font-bold text-xl">/</div>
              <div className="flex-1 w-full">
                  <label className="block text-xs text-cyan-600 mb-1 uppercase font-bold tracking-widest">Short Asset</label>
                  <input value={denomInput} onChange={e => setDenomInput(e.target.value)} className="w-full bg-[#0B1221] border border-cyan-900/50 px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition font-mono" placeholder="e.g. ETH" />
              </div>
              <button disabled={isAddingPair} type="submit" className="w-full md:w-auto bg-cyan-600 text-black font-bold px-8 py-3 hover:bg-cyan-500 transition disabled:opacity-50 shadow-[0_0_15px_rgba(8,145,178,0.4)] uppercase tracking-wider">
                  {isAddingPair ? "PROCESSING..." : "INITIATE PAIR"}
              </button>
            </form>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTab === 'assets' ? (
              <>
                {watchlist.map(ticker => {
                    const quote = prices[ticker];
                    return (
                        <div key={ticker} className="bg-[#0B1221]/80 backdrop-blur-sm p-6 border border-cyan-900/30 relative group hover:border-cyan-500/50 transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                            <button onClick={() => handleRemove(ticker)} className="absolute top-4 right-4 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="font-bold text-2xl text-white tracking-tight font-mono">{ticker}</h3>
                                {quote && (
                                    <div className={`px-2 py-0.5 text-xs font-bold border ${quote.change >= 0 ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/30' : 'bg-red-950/30 text-red-400 border-red-500/30'}`}>
                                        {quote.change >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                                    </div>
                                )}
                            </div>
                            <div className="flex items-end justify-between">
                                <span className="text-3xl font-mono text-cyan-50 font-medium tracking-tighter">
                                    ${quote ? quote.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "---"}
                                </span>
                            </div>
                        </div>
                    )
                })}
                {watchlist.length === 0 && (
                    <div className="col-span-full text-center text-slate-600 py-20 border border-dashed border-cyan-900/30 font-mono text-sm">
                        // NO TARGETS ACQUIRED. INITIATE SEARCH SEQUENCE.
                    </div>
                )}
              </>
            ) : (
              <>
                {pairs.map(pair => {
                    const p1 = prices[pair.numerator]?.price;
                    const p2 = prices[pair.denominator]?.price;
                    const ratio = (p1 && p2) ? (p1 / p2) : null;
                    return (
                        <div key={pair.id} className="bg-[#0B1221]/80 backdrop-blur-sm p-6 border border-cyan-900/30 relative group hover:border-cyan-500/50 transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                            <button onClick={() => handleDeletePair(pair.id)} className="absolute top-4 right-4 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                            <div className="flex items-center gap-2 mb-6">
                              <span className="text-xl font-bold text-white font-mono">{pair.numerator}</span>
                              <span className="text-cyan-600 font-light">/</span>
                              <span className="text-xl font-bold text-white font-mono">{pair.denominator}</span>
                            </div>
                            <div className="text-4xl font-mono font-medium text-cyan-400 mb-4 tracking-tighter drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]">{ratio ? ratio.toFixed(5) : "---"}</div>
                            
                            {/* Simulated Ratio Bar */}
                            <div className="w-full h-1 bg-slate-800 mb-4 relative overflow-hidden">
                                <div className="absolute top-0 left-0 h-full bg-cyan-500 w-1/2 animate-pulse"></div>
                            </div>

                            <div className="flex justify-between text-xs font-medium text-slate-500 border-t border-cyan-900/30 pt-4 font-mono">
                              <span>{pair.numerator}: <span className="text-slate-300">${p1?.toLocaleString() ?? "---"}</span></span>
                              <span>{pair.denominator}: <span className="text-slate-300">${p2?.toLocaleString() ?? "---"}</span></span>
                            </div>
                            <div className="mt-4 pt-2 border-t border-cyan-900/10 flex justify-end">
                                <button className="text-[10px] uppercase font-bold text-cyan-600 hover:text-cyan-400 tracking-widest border border-cyan-900/30 px-2 py-1 hover:bg-cyan-950/30 transition">Run Backtest</button>
                            </div>
                        </div>
                    )
                })}
                {pairs.length === 0 && (
                    <div className="col-span-full text-center text-slate-600 py-20 border border-dashed border-cyan-900/30 font-mono text-sm">
                        // NO PAIRS DETECTED. INITIATE RATIO SYNTHESIS.
                    </div>
                )}
              </>
            )}
        </div>
      </main>
        <AiChatbot />
    </div>
  );
}
