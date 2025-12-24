"use client";
import { useState, useEffect } from "react";
import { useAuth, logoutUser } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp } from "firebase/firestore";
import { getAssetPrices } from "@/lib/market-data";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [numInput, setNumInput] = useState("");
  const [denomInput, setDenomInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleLogout = async () => {
    await logoutUser();
    router.push("/");
  };

  // Auth check
  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  // Fetch Pairs
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "ratios"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPairs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RatioPair));
      fetchedPairs.sort((a, b) => {
        const tA = a.addedAt?.seconds || 0;
        const tB = b.addedAt?.seconds || 0;
        return tB - tA;
      });
      setPairs(fetchedPairs);
    }, (error) => {
      console.error("Error fetching pairs:", error);
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
      // Add a timeout to prevent the button from getting stuck
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000));
      
      await Promise.race([
        addDoc(collection(db, "users", user.uid, "ratios"), {
          numerator: numInput.toUpperCase(),
          denominator: denomInput.toUpperCase(),
          addedAt: serverTimestamp()
        }),
        timeoutPromise
      ]);

      setNumInput("");
      setDenomInput("");
    } catch (err) {
      console.error(err);
      alert("Failed to add pair. Please try again.");
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
            <button onClick={handleLogout} className="text-sm font-semibold text-slate-400 hover:text-red-400 transition">Sign Out</button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-2">Pair Trade Watcher</h1>
        <p className="text-slate-400 mb-8">Track relative value between assets (e.g. BTC/ETH, AAPL/MSFT).</p>

        <form onSubmit={handleAddPair} className="bg-[#161C2C] p-6 rounded-2xl border border-white/5 mb-10 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
                <label className="block text-xs text-slate-500 mb-1 uppercase font-bold">Long (Numerator)</label>
                <input value={numInput} onChange={e => setNumInput(e.target.value)} className="w-full bg-[#0B0F1A] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500" placeholder="e.g. BTC" />
            </div>
            <div className="hidden md:flex items-center justify-center pb-3 text-slate-500 font-bold text-xl">/</div>
            <div className="flex-1 w-full">
                <label className="block text-xs text-slate-500 mb-1 uppercase font-bold">Short (Denominator)</label>
                <input value={denomInput} onChange={e => setDenomInput(e.target.value)} className="w-full bg-[#0B0F1A] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500" placeholder="e.g. ETH" />
            </div>
            <button disabled={isAdding} type="submit" className="w-full md:w-auto bg-emerald-500 text-black font-bold px-6 py-2 rounded-xl hover:bg-emerald-400 transition disabled:opacity-50">
                {isAdding ? "Adding..." : "Track Pair"}
            </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pairs.map(pair => {
                const p1 = prices[pair.numerator];
                const p2 = prices[pair.denominator];
                const ratio = (p1 && p2) ? (p1 / p2) : null;
                return (
                    <div key={pair.id} className="bg-[#161C2C] p-6 rounded-2xl border border-white/5 relative group hover:border-emerald-500/30 transition">
                        <button onClick={() => handleDelete(pair.id)} className="absolute top-4 right-4 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition">Delete</button>
                        <div className="flex items-center gap-2 mb-4"><span className="text-xl font-bold">{pair.numerator}</span><span className="text-slate-500">/</span><span className="text-xl font-bold">{pair.denominator}</span></div>
                        <div className="text-4xl font-mono font-bold text-emerald-400 mb-2">{ratio ? ratio.toFixed(5) : "---"}</div>
                        <div className="flex justify-between text-xs text-slate-500"><span>{pair.numerator}: ${p1?.toLocaleString() ?? "---"}</span><span>{pair.denominator}: ${p2?.toLocaleString() ?? "---"}</span></div>
                    </div>
                )
            })}
             {pairs.length === 0 && <div className="col-span-full text-center text-slate-500 py-10 italic">No pairs tracked yet. Add a pair above to start watching ratios.</div>}
        </div>
      </main>
    </div>
  )
}