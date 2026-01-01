"use client";
import { useState, useEffect } from "react";
import { useAuth, logoutUser } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp } from "firebase/firestore";
import { getAssetPrices, type AssetQuote } from "@/lib/market-data";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AiChatbot from "@/components/AiChatbot";

interface RatioPair {
  id: string;
  numerator: string;
  denominator: string;
  addedAt?: any;
}

export default function PairTradePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [pairs, setPairs] = useState<RatioPair[]>([]);
  const [prices, setPrices] = useState<Record<string, AssetQuote>>({});
  const [numInput, setNumInput] = useState("");
  const [denomInput, setDenomInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleLogout = async () => {
    await logoutUser();
    router.push("/");
  };

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  // Fetch Pairs
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "ratios"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPairs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RatioPair));
      // Client-side sort
       fetchedPairs.sort((a, b) => {
        const tA = a.addedAt?.seconds || 0;
        const tB = b.addedAt?.seconds || 0;
        return tB - tA;
      });
      setPairs(fetchedPairs);
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch Prices
  useEffect(() => {
    if (pairs.length === 0) return;
    const fetchPrices = async () => {
      const tickers = new Set<string>();
      pairs.forEach(p => {
        tickers.add(p.numerator);
        tickers.add(p.denominator);
      });
      const newPrices = await getAssetPrices(Array.from(tickers));
      setPrices(prev => ({ ...prev, ...newPrices }));
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [pairs]);

  const handleAddPair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !numInput || !denomInput) return;
    setIsAdding(true);
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
      alert("Failed to add pair.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
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
            <Link href="/watchlist" className="text-xs font-bold text-cyan-600 hover:text-cyan-400 uppercase tracking-widest transition">[ Watchlist ]</Link>
            <div className="flex items-center gap-4">
               <span className="text-xs text-slate-400 hidden md:inline font-bold uppercase">{user?.displayName}</span>
               {user?.photoURL && <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded border border-cyan-500/50" />}
               <button onClick={handleLogout} className="text-xs font-bold text-red-500 hover:text-red-400 transition uppercase border border-red-900/30 px-3 py-1 rounded hover:bg-red-950/30">Disconnect</button>
            </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-5xl mx-auto p-8">
        <div className="mb-10">
            <div className="text-xs text-cyan-600 font-bold tracking-[0.2em] mb-1">RELATIVE VALUE</div>
            <h1 className="text-4xl font-black text-white tracking-tight uppercase">
              Pair <span className="text-cyan-500">Trader</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1 font-mono">Monitor synthetic spreads and ratio divergences.</p>
        </div>

        <form onSubmit={handleAddPair} className="bg-[#0B1221]/80 backdrop-blur-sm p-6 border border-cyan-900/30 mb-10 flex flex-col md:flex-row gap-4 items-end shadow-[0_0_20px_rgba(6,182,212,0.05)]">
            <div className="flex-1 w-full">
                <label className="block text-xs text-cyan-600 mb-1 uppercase font-bold tracking-widest">Long Asset</label>
                <input value={numInput} onChange={e => setNumInput(e.target.value)} className="w-full bg-[#030712] border border-cyan-900/50 px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition font-mono" placeholder="e.g. BTC" />
            </div>
            <div className="hidden md:flex items-center justify-center pb-4 text-cyan-800 font-bold text-xl">/</div>
            <div className="flex-1 w-full">
                <label className="block text-xs text-cyan-600 mb-1 uppercase font-bold tracking-widest">Short Asset</label>
                <input value={denomInput} onChange={e => setDenomInput(e.target.value)} className="w-full bg-[#030712] border border-cyan-900/50 px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition font-mono" placeholder="e.g. ETH" />
            </div>
            <button disabled={isAdding} type="submit" className="w-full md:w-auto bg-cyan-600 text-black font-bold px-8 py-3 hover:bg-cyan-500 transition disabled:opacity-50 shadow-[0_0_15px_rgba(8,145,178,0.4)] uppercase tracking-wider">
                {isAdding ? "PROCESSING..." : "INITIATE PAIR"}
            </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pairs.map(pair => {
                const p1 = prices[pair.numerator]?.price;
                const p2 = prices[pair.denominator]?.price;
                const ratio = (p1 && p2) ? (p1 / p2) : null;
                return (
                    <div key={pair.id} className="bg-[#0B1221]/80 backdrop-blur-sm p-6 border border-cyan-900/30 relative group hover:border-cyan-500/50 transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                        <button onClick={() => handleDelete(pair.id)} className="absolute top-4 right-4 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                        <div className="flex items-center gap-2 mb-6">
                            <span className="text-xl font-bold text-white font-mono">{pair.numerator}</span>
                            <span className="text-cyan-600 font-light">/</span>
                            <span className="text-xl font-bold text-white font-mono">{pair.denominator}</span>
                        </div>
                        <div className="text-4xl font-mono font-medium text-cyan-400 mb-4 tracking-tighter drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]">{ratio ? ratio.toFixed(5) : "---"}</div>
                        
                        <div className="flex justify-between text-xs font-medium text-slate-500 border-t border-cyan-900/30 pt-4 font-mono">
                            <span>{pair.numerator}: <span className="text-slate-300">${p1?.toLocaleString() ?? "---"}</span></span>
                            <span>{pair.denominator}: <span className="text-slate-300">${p2?.toLocaleString() ?? "---"}</span></span>
                        </div>
                    </div>
                )
            })}
            {pairs.length === 0 && (
                <div className="col-span-full text-center text-slate-600 py-20 border border-dashed border-cyan-900/30 font-mono text-sm">
                    // NO PAIRS DETECTED. INITIATE RATIO SYNTHESIS.
                </div>
            )}
        </div>
      </main>
      <AiChatbot />
    </div>
  );
}