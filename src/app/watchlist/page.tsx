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
    <div className="min-h-screen bg-[#0B0F1A] text-white">
       <nav className="border-b border-white/5 p-4 flex justify-between items-center bg-[#0D121F]">
        <div className="font-bold text-xl tracking-tighter">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="bg-emerald-500 w-8 h-8 rounded-lg flex items-center justify-center text-black font-serif italic">Ln</span>
            Lognormal
          </Link>
        </div>
        <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm font-semibold text-slate-400 hover:text-white transition">Dashboard</Link>
            <div className="flex items-center gap-4">
               <span className="text-sm text-slate-400 hidden md:inline">{user?.displayName}</span>
               {user?.photoURL && <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-emerald-500" />}
               <button onClick={handleLogout} className="text-sm font-semibold text-slate-400 hover:text-red-400 transition">Sign Out</button>
            </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Market Watch</h1>
            <p className="text-slate-400 text-sm mt-1">Track individual assets and relative value pairs.</p>
          </div>
          
          {/* Tabs */}
          <div className="bg-[#161C2C] p-1 rounded-xl border border-white/5 flex">
            <button 
              onClick={() => setActiveTab('assets')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'assets' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              Assets
            </button>
            <button 
              onClick={() => setActiveTab('pairs')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'pairs' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white'}`}
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
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search symbol (e.g. AAPL, BTC)..."
                        className="relative w-full bg-[#161C2C] border border-white/10 rounded-xl py-3 pl-4 pr-10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition"
                    />
                    {isSearching && <div className="absolute right-3 top-3.5 w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>}
                </div>
                {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#161C2C] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                        {searchResults.map(result => (
                            <button 
                                key={result.symbol}
                                onClick={() => handleAdd(result.displaySymbol)}
                                className="w-full text-left px-4 py-3 hover:bg-white/5 transition flex justify-between items-center border-b border-white/5 last:border-0 group"
                            >
                                <div>
                                    <div className="font-bold text-white group-hover:text-emerald-400 transition">{result.displaySymbol}</div>
                                    <div className="text-xs text-slate-400">{result.description}</div>
                                </div>
                                <div className="text-xs text-emerald-500 font-bold opacity-0 group-hover:opacity-100 transition transform translate-x-2 group-hover:translate-x-0">+ Add</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
          ) : (
            <form onSubmit={handleAddPair} className="flex flex-col md:flex-row gap-4 items-end max-w-2xl">
              <div className="flex-1 w-full">
                  <label className="block text-xs text-slate-500 mb-1 uppercase font-bold tracking-wider">Long</label>
                  <input value={numInput} onChange={e => setNumInput(e.target.value)} className="w-full bg-[#161C2C] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition" placeholder="e.g. BTC" />
              </div>
              <div className="hidden md:flex items-center justify-center pb-4 text-slate-600 font-bold text-xl">/</div>
              <div className="flex-1 w-full">
                  <label className="block text-xs text-slate-500 mb-1 uppercase font-bold tracking-wider">Short</label>
                  <input value={denomInput} onChange={e => setDenomInput(e.target.value)} className="w-full bg-[#161C2C] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition" placeholder="e.g. ETH" />
              </div>
              <button disabled={isAddingPair} type="submit" className="w-full md:w-auto bg-emerald-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-emerald-400 transition disabled:opacity-50 shadow-lg shadow-emerald-500/20">
                  {isAddingPair ? "..." : "Add Pair"}
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
                        <div key={ticker} className="bg-gradient-to-br from-[#161C2C] to-[#0D121F] p-6 rounded-2xl border border-white/5 relative group hover:border-emerald-500/30 transition-all hover:-translate-y-1 hover:shadow-xl">
                            <button onClick={() => handleRemove(ticker)} className="absolute top-4 right-4 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition p-2 hover:bg-white/5 rounded-lg">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="font-bold text-2xl text-white tracking-tight">{ticker}</h3>
                                {quote && (
                                    <div className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${quote.change >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                        {quote.change >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                                    </div>
                                )}
                            </div>
                            <div className="flex items-end justify-between">
                                <span className="text-3xl font-mono text-white font-medium">
                                    ${quote ? quote.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "---"}
                                </span>
                            </div>
                        </div>
                    )
                })}
                {watchlist.length === 0 && (
                    <div className="col-span-full text-center text-slate-500 py-20 border border-dashed border-white/10 rounded-2xl">
                        No assets tracked. Search above to start building your portfolio view.
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
                        <div key={pair.id} className="bg-gradient-to-br from-[#161C2C] to-[#0D121F] p-6 rounded-2xl border border-white/5 relative group hover:border-emerald-500/30 transition-all hover:-translate-y-1 hover:shadow-xl">
                            <button onClick={() => handleDeletePair(pair.id)} className="absolute top-4 right-4 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition p-2 hover:bg-white/5 rounded-lg">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                            <div className="flex items-center gap-2 mb-6">
                              <span className="text-xl font-bold text-white">{pair.numerator}</span>
                              <span className="text-slate-600 font-light">/</span>
                              <span className="text-xl font-bold text-white">{pair.denominator}</span>
                            </div>
                            <div className="text-4xl font-mono font-medium text-emerald-400 mb-4">{ratio ? ratio.toFixed(5) : "---"}</div>
                            <div className="flex justify-between text-xs font-medium text-slate-500 border-t border-white/5 pt-4">
                              <span>{pair.numerator}: <span className="text-slate-300">${p1?.toLocaleString() ?? "---"}</span></span>
                              <span>{pair.denominator}: <span className="text-slate-300">${p2?.toLocaleString() ?? "---"}</span></span>
                            </div>
                        </div>
                    )
                })}
                {pairs.length === 0 && (
                    <div className="col-span-full text-center text-slate-500 py-20 border border-dashed border-white/10 rounded-2xl">
                        No pairs tracked. Add a long/short pair to monitor relative value.
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
