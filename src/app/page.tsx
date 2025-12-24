"use client";
import Link from 'next/link';
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { getPopularStocks, type StockData } from "@/lib/market-data";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stocks, setStocks] = useState<StockData[]>([]);

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
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  useEffect(() => {
    const fetchStocks = async () => {
      const data = await getPopularStocks();
      setStocks(data);
    };
    fetchStocks();
  }, []);

  return (
    <div className="bg-[#0B0F1A] min-h-screen text-white">
      {/* Navigation */}
      <nav className="flex justify-between p-6 max-w-7xl mx-auto items-center">
        <div className="font-bold text-2xl tracking-tighter flex items-center gap-2">
          <span className="bg-emerald-500 w-8 h-8 rounded-lg flex items-center justify-center text-black font-serif italic">Ln</span>
          Lognormal
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

      {/* Hero Section */}
      <header className="max-w-7xl mx-auto px-6 pt-24 pb-20 lg:flex items-center gap-12">
        <div className="lg:w-1/2 space-y-8">
          <h1 className="text-5xl lg:text-7xl font-black leading-[1.1]">
            {user ? `Welcome back, ${user.displayName?.split(' ')[0]}` : "Master your Lognormal Edge."}
          </h1>

          <p className="text-xl text-slate-400 max-w-xl">
            {user 
              ? "Your portfolio intelligence is ready. View your latest BTC/ETH spreads and asset performance."
              : "Track stocks, crypto, and relative value pairs in real-time with our agentic data engine."}
          </p>

          <div className="flex gap-4 pt-4">
            {user ? (
              <Link 
                href="/dashboard" 
                className="bg-white text-black px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-200 transition"
              >
                Enter Dashboard
              </Link>
            ) : (
              <button 
                onClick={handleLogin}
                className="bg-white text-black px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-200 transition"
              >
                Connect Portfolio
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Market Overview Section */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold mb-8 text-slate-200">Market Movers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stocks.map((stock) => (
            <div key={stock.symbol} className="bg-[#161C2C] p-6 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-xl text-white group-hover:text-emerald-400 transition">{stock.symbol}</h3>
                  <p className="text-sm text-slate-400">{stock.name}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${stock.change >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                  {stock.change >= 0 ? '+' : ''}{stock.change}%
                </div>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-mono text-slate-200">${stock.price.toFixed(2)}</span>
                <span className="text-xs text-slate-500 mb-1">Real-time</span>
              </div>
            </div>
          ))}
          {stocks.length === 0 && (
            <div className="col-span-full text-center text-slate-500 py-10">Loading market data...</div>
          )}
        </div>
      </section>
    </div>
  );
}