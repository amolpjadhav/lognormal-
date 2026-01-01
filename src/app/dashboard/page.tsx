"use client";
import { useState, useEffect, useMemo } from "react";
import { useAuth, logoutUser } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, deleteDoc, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { getAssetPrices, type AssetQuote } from "@/lib/market-data";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AddAssetForm from "./AddAssetForm";
import AiChatbot from "@/components/AiChatbot";

interface Asset {
  id: string;
  ticker: string;
  quantity: number;
  purchasePrice: number;
  addedAt?: any;
}

interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  published_on: number;
  tags: string;
}

function SimpleDonutChart({ data, colors }: { data: { name: string; value: number }[]; colors: string[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  if (total === 0) return <div className="flex items-center justify-center h-full text-xs text-slate-600 font-mono">NO DATA</div>;

  return (
    <div className="flex flex-col items-center w-full h-full justify-center">
      <div className="relative w-40 h-40">
        <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)' }} className="w-full h-full">
          {data.map((item, index) => {
            const sliceAngle = (item.value / total) * 2 * Math.PI;
            const x1 = Math.cos(currentAngle);
            const y1 = Math.sin(currentAngle);
            const x2 = Math.cos(currentAngle + sliceAngle);
            const y2 = Math.sin(currentAngle + sliceAngle);
            const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
            
            const pathData = data.length === 1 
              ? `M 0 0 m -1 0 a 1 1 0 1 0 2 0 a 1 1 0 1 0 -2 0`
              : `M 0 0 L ${x1} ${y1} A 1 1 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

            currentAngle += sliceAngle;
            return (
              <path
                key={item.name}
                d={pathData}
                fill={colors[index % colors.length]}
                stroke="#0B1221"
                strokeWidth="0.05"
              />
            );
          })}
          <circle cx="0" cy="0" r="0.7" fill="#0B1221" />
        </svg>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 w-full px-2">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2 text-[10px] font-mono">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
            <span className="text-slate-400 truncate">{item.name}</span>
            <span className="text-white ml-auto">{Math.round((item.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimpleLineChart({ data, color = "#06b6d4" }: { data: { label: string; value: number }[]; color?: string }) {
  if (!data || data.length === 0) return <div className="flex items-center justify-center h-full text-xs text-slate-600 font-mono">NO DATA</div>;

  const padding = 20;
  const width = 800;
  const height = 300;
  
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((d.value - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 relative w-full h-full">
         <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#1e293b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#1e293b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            
            {/* Line */}
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="2"
              points={points}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
         </svg>
      </div>
      <div className="flex justify-between px-2 text-[10px] text-slate-500 font-mono mt-2 uppercase tracking-wider">
        <span>{data[0].label}</span>
        <span>{data[data.length - 1].label}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [currentPrices, setCurrentPrices] = useState<Record<string, AssetQuote>>({});
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsFilter, setNewsFilter] = useState<'global' | 'portfolio'>('global');
  const [quickTradeAsset, setQuickTradeAsset] = useState<Asset | null>(null);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [tradeQuantity, setTradeQuantity] = useState("");
  const [isTradeProcessing, setIsTradeProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance'>('overview');

  const COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];

  const handleLogout = async () => {
    await logoutUser();
    router.push("/");
  };

  // Auth check
  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  // Fetch Assets
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "assets"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedAssets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
      fetchedAssets.sort((a, b) => {
        const tA = a.addedAt?.seconds || 0;
        const tB = b.addedAt?.seconds || 0;
        return tB - tA;
      });
      setAssets(fetchedAssets);
    }, (error) => {
      console.error("Error fetching assets:", error);
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch Prices
  useEffect(() => {
    if (assets.length === 0) return;
    const fetchAssetPrices = async () => {
      const uniqueTickers = Array.from(new Set(assets.map(a => a.ticker)));
      const prices = await getAssetPrices(uniqueTickers);
      setCurrentPrices(prev => ({ ...prev, ...prices }));
    };
    fetchAssetPrices();
    const interval = setInterval(fetchAssetPrices, 60000);
    return () => clearInterval(interval);
  }, [assets]);

  // Fetch News
  useEffect(() => {
    const fetchNews = async () => {
      try {
        let url = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';
        
        if (newsFilter === 'portfolio') {
          if (assets.length > 0) {
            const uniqueTickers = Array.from(new Set(assets.map(a => a.ticker.toUpperCase()))).join(",");
            url = `https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=${uniqueTickers}`;
          } else {
            setNews([]);
            return;
          }
        }

        const res = await fetch(url);
        const data = await res.json();
        setNews(data.Data.slice(0, 5));
      } catch (error) {
        console.error("Error fetching news:", error);
      }
    };
    fetchNews();
  }, [newsFilter, assets]);

  const handleDeleteAsset = async (assetId: string) => {
    if (!user) return;
    if (window.confirm("Are you sure you want to delete this asset?")) {
      try {
        await deleteDoc(doc(db, "users", user.uid, "assets", assetId));
      } catch (error) {
        console.error("Error deleting asset:", error);
      }
    }
  };

  const handleQuickTradeClick = (asset: Asset) => {
    setQuickTradeAsset(asset);
    setTradeType('buy');
    setTradeQuantity("");
  };

  const executeTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !quickTradeAsset || !tradeQuantity) return;

    const qty = parseFloat(tradeQuantity);
    if (isNaN(qty) || qty <= 0) {
        alert("Please enter a valid quantity");
        return;
    }

    setIsTradeProcessing(true);
    try {
        const currentPrice = currentPrices[quickTradeAsset.ticker]?.price || quickTradeAsset.purchasePrice;

        if (tradeType === 'buy') {
            // Buy: Add new asset lot
            await addDoc(collection(db, "users", user.uid, "assets"), {
                ticker: quickTradeAsset.ticker,
                quantity: qty,
                purchasePrice: currentPrice,
                addedAt: serverTimestamp()
            });
        } else {
            // Sell: Reduce quantity or remove
            if (qty > quickTradeAsset.quantity) {
                alert("Cannot sell more than you own!");
                setIsTradeProcessing(false);
                return;
            }

            if (qty >= quickTradeAsset.quantity) {
                await deleteDoc(doc(db, "users", user.uid, "assets", quickTradeAsset.id));
            } else {
                await updateDoc(doc(db, "users", user.uid, "assets", quickTradeAsset.id), {
                    quantity: quickTradeAsset.quantity - qty
                });
            }
        }
        setQuickTradeAsset(null);
    } catch (error) {
        console.error("Trade execution error:", error);
        alert("Trade failed");
    } finally {
        setIsTradeProcessing(false);
    }
  };

  const totalPortfolioValue = assets.reduce((sum, asset) => {
    const price = currentPrices[asset.ticker]?.price || asset.purchasePrice;
    return sum + (price * asset.quantity);
  }, 0);

  const totalCostBasis = assets.reduce((sum, asset) => {
    return sum + (asset.purchasePrice * asset.quantity);
  }, 0);

  const totalProfitLoss = totalPortfolioValue - totalCostBasis;
  const totalProfitLossPercent = totalCostBasis > 0 ? (totalProfitLoss / totalCostBasis) * 100 : 0;

  const dayProfitLoss = assets.reduce((sum, asset) => {
    const change = currentPrices[asset.ticker]?.change || 0;
    return sum + (change * asset.quantity);
  }, 0);

  const allocationData = assets.map(asset => ({
    name: asset.ticker,
    value: (currentPrices[asset.ticker]?.price || asset.purchasePrice) * asset.quantity
  })).filter(item => item.value > 0).sort((a, b) => b.value - a.value);

  // Mock history data for Performance Tab
  const historyData = useMemo(() => {
    const data = [];
    let currentValue = totalPortfolioValue > 0 ? totalPortfolioValue : 10000; 
    const days = 30;
    
    for (let i = 0; i < days; i++) {
      data.unshift({
        label: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        value: currentValue
      });
      // Random walk backwards simulation
      const change = (Math.random() - 0.5) * (currentValue * 0.05);
      currentValue -= change;
    }
    return data;
  }, [totalPortfolioValue]);

  if (loading) return <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center text-emerald-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#030712] text-cyan-50 font-mono selection:bg-cyan-500/30 relative overflow-hidden">
       {/* Cyberpunk Grid Background */}
       <div className="fixed inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none z-0" />
       <div className="fixed inset-0 bg-gradient-to-b from-transparent via-transparent to-[#030712] pointer-events-none z-0" />

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
          <div className="hidden md:flex items-center gap-2 text-xs text-emerald-500 bg-emerald-950/30 px-3 py-1 rounded border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            SYSTEM OPTIMAL
          </div>
          <Link href="/watchlist" className="text-xs font-bold text-cyan-600 hover:text-cyan-400 uppercase tracking-widest transition">
            [ Surveillance ]
          </Link>
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
            <div className="text-xs text-cyan-600 font-bold tracking-[0.2em] mb-1">COMMAND CENTER</div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase glitch-text">
              Portfolio <span className="text-cyan-500">{activeTab === 'overview' ? 'Overview' : 'Performance'}</span>
            </h1>
          </div>
          
          <div className="flex flex-col items-end gap-4">
             <div className="bg-[#0B1221] p-1 border border-cyan-900/30 flex">
                <button 
                  onClick={() => setActiveTab('overview')}
                  className={`px-6 py-2 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'overview' ? 'bg-cyan-600 text-black shadow-[0_0_15px_rgba(8,145,178,0.4)]' : 'text-slate-500 hover:text-cyan-400'}`}
                >
                  Overview
                </button>
                <button 
                  onClick={() => setActiveTab('performance')}
                  className={`px-6 py-2 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'performance' ? 'bg-cyan-600 text-black shadow-[0_0_15px_rgba(8,145,178,0.4)]' : 'text-slate-500 hover:text-cyan-400'}`}
                >
                  Performance
                </button>
             </div>
             <div className="flex gap-3">
                <button className="px-4 py-2 bg-[#0B1221] border border-cyan-800/50 text-cyan-400 text-xs font-bold uppercase tracking-wider hover:bg-cyan-950/50 transition flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                  Sync Wallets
                </button>
                <button onClick={() => setIsAddAssetOpen(true)} className="bg-cyan-600 text-black px-6 py-2 rounded-sm font-bold uppercase tracking-wider hover:bg-cyan-500 transition shadow-[0_0_15px_rgba(8,145,178,0.4)]">
                  + Add Asset
                </button>
             </div>
          </div>
        </div>

        {activeTab === 'overview' ? (
          <>
            {/* HUD Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
              <div className="md:col-span-2 bg-[#0B1221]/80 backdrop-blur-sm p-6 border border-cyan-900/30 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-40 transition">
                  <svg className="w-16 h-16 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                </div>
                <p className="text-cyan-600 text-xs font-bold uppercase tracking-widest mb-2">Net Liquidity</p>
                <h2 className="text-5xl font-mono font-medium text-white tracking-tighter drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                  ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
              </div>
              
              <div className="bg-[#0B1221]/80 backdrop-blur-sm p-6 border border-cyan-900/30">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Alpha / P&L</p>
                <div className={`flex flex-col ${totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  <h2 className="text-3xl font-mono font-bold tracking-tight">{totalProfitLoss >= 0 ? '+' : ''}${Math.abs(totalProfitLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                  <span className="text-xs font-bold mt-1 opacity-80">{totalProfitLossPercent >= 0 ? '▲' : '▼'} {totalProfitLossPercent.toFixed(2)}% ROI</span>
                </div>
              </div>

              {/* AI Risk Widget */}
              <div className="bg-[#0B1221]/80 backdrop-blur-sm p-6 border border-cyan-900/30 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <p className="text-purple-400 text-xs font-bold uppercase tracking-widest">AI Risk Score</p>
                  <span className="w-2 h-2 bg-purple-500 rounded-full animate-ping"></span>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-2xl font-bold text-white">LOW</span>
                    <span className="text-xs text-slate-400">12/100</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-500 to-purple-500 w-[12%] h-full"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Insights / Anomalies */}
            <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Allocation Chart */}
              <div className="bg-[#0B1221]/80 backdrop-blur-sm border border-cyan-900/30 rounded p-4 flex flex-col min-h-[300px]">
                  <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4">Asset Allocation</h3>
                  <div className="flex-1 relative">
                    <SimpleDonutChart data={allocationData} colors={COLORS} />
                  </div>
              </div>

              <div className="lg:col-span-2 flex flex-col gap-6">
                {/* Anomaly Alert */}
                <div className="bg-[#0B1221]/50 border border-dashed border-cyan-900/30 p-4 rounded flex items-center gap-4">
                    <div className="bg-yellow-500/10 text-yellow-500 p-2 rounded border border-yellow-500/20">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">Predictive Anomaly Detected</h4>
                      <p className="text-xs text-slate-400">ML Model detected unusual volume divergence in <span className="text-cyan-400 font-bold">BTC/USD</span>. Volatility expected within 4 hours.</p>
                    </div>
                    <button className="text-xs bg-cyan-900/30 hover:bg-cyan-800/30 text-cyan-400 px-3 py-1.5 rounded border border-cyan-700/30 transition uppercase">Analyze</button>
                </div>

                {/* News Feed */}
                <div className="bg-[#0B1221]/80 backdrop-blur-sm border border-cyan-900/30 rounded overflow-hidden flex flex-col flex-1 min-h-[200px]">
                  <div className="p-3 border-b border-cyan-900/30 bg-cyan-950/10 flex justify-between items-center">
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setNewsFilter('global')}
                        className={`text-xs font-bold uppercase tracking-widest transition ${newsFilter === 'global' ? 'text-cyan-400' : 'text-slate-600 hover:text-cyan-400'}`}
                      >
                        Global
                      </button>
                      <span className="text-cyan-900">|</span>
                      <button 
                        onClick={() => setNewsFilter('portfolio')}
                        className={`text-xs font-bold uppercase tracking-widest transition ${newsFilter === 'portfolio' ? 'text-cyan-400' : 'text-slate-600 hover:text-cyan-400'}`}
                      >
                        Portfolio
                      </button>
                    </div>
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></span>
                      <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse delay-75"></span>
                    </div>
                  </div>
                  <div className="flex-1 p-0">
                    {news.length === 0 ? (
                      <div className="p-4 text-xs text-slate-500 font-mono text-center">
                        {newsFilter === 'portfolio' && assets.length === 0 ? "NO ASSETS DETECTED" : "INITIALIZING FEED..."}
                      </div>
                    ) : (
                      <div className="divide-y divide-cyan-900/30">
                        {news.map(item => (
                          <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="block p-3 hover:bg-cyan-900/10 transition group">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-[10px] text-cyan-700 font-mono">{new Date(item.published_on * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              <span className="text-[10px] text-slate-600 uppercase">{item.source}</span>
                            </div>
                            <h4 className="text-xs text-slate-300 group-hover:text-cyan-400 transition leading-snug line-clamp-2 font-medium">{item.title}</h4>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
              </div>
              </div>
            </div>

            <div className="bg-[#0B1221]/80 backdrop-blur-sm border border-cyan-900/30 overflow-hidden">
              <div className="p-4 border-b border-cyan-900/30 flex justify-between items-center bg-cyan-950/10">
                <span className="text-sm font-bold text-cyan-400 uppercase tracking-widest">Active Inventory</span>
                <span className="text-xs text-slate-500 font-mono">[{assets.length} UNITS]</span>
              </div>
              
              {assets.length === 0 ? (
                <div className="p-20 text-center text-slate-600 font-mono text-sm">
                  // NO ASSETS DETECTED. INITIATE ACQUISITION PROTOCOL.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-400 font-mono">
                    <thead className="bg-[#050914] text-cyan-600 uppercase font-bold text-xs tracking-wider border-b border-cyan-900/30">
                      <tr>
                        <th className="px-6 py-4">Asset</th>
                        <th className="px-6 py-4">Quantity</th>
                        <th className="px-6 py-4">Buy Price</th>
                        <th className="px-6 py-4">Current Price</th>
                        <th className="px-6 py-4">Total Value</th>
                        <th className="px-6 py-4">Profit/Loss</th>
                        <th className="px-6 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cyan-900/10">
                      {assets.map((asset) => {
                        const currentPrice = currentPrices[asset.ticker]?.price || 0;
                        const totalValue = currentPrice * asset.quantity;
                        const costBasis = asset.purchasePrice * asset.quantity;
                        const profitLoss = totalValue - costBasis;
                        const isProfit = profitLoss >= 0;

                        return (
                          <tr key={asset.id} className="hover:bg-cyan-900/5 transition group">
                            <td className="px-6 py-4 font-bold text-white group-hover:text-cyan-400 transition">{asset.ticker}</td>
                            <td className="px-6 py-4">{asset.quantity}</td>
                            <td className="px-6 py-4 text-slate-500">${asset.purchasePrice.toLocaleString()}</td>
                            <td className="px-6 py-4 text-white group-hover:text-cyan-200">${currentPrice > 0 ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "---"}</td>
                            <td className="px-6 py-4 text-white">
                              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className={`px-6 py-4 font-bold ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                              {isProfit ? '+' : ''}{profitLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 flex gap-2">
                              <button 
                                onClick={() => handleQuickTradeClick(asset)}
                                className="text-xs font-bold text-cyan-500 hover:text-cyan-300 transition bg-cyan-500/10 px-3 py-1 rounded-sm border border-cyan-500/20 uppercase tracking-wider"
                              >
                                Trade
                              </button>
                              <button 
                                onClick={() => handleDeleteAsset(asset.id)}
                                className="text-xs font-bold text-red-500 hover:text-red-400 transition bg-red-500/10 px-3 py-1 rounded-sm border border-red-500/20 uppercase tracking-wider"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-[#0B1221]/80 backdrop-blur-sm border border-cyan-900/30 rounded p-6 h-[500px] flex flex-col mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                   <svg className="w-32 h-32 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
                </div>
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-6">Portfolio Value (30 Days)</h3>
                <div className="flex-1 z-10">
                   <SimpleLineChart data={historyData} />
                </div>
             </div>
          </div>
        )}
      </main>

      <AiChatbot />

      {quickTradeAsset && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className="w-full max-w-md bg-[#0B1221] border border-cyan-500/30 p-6 shadow-[0_0_50px_rgba(6,182,212,0.2)] relative">
                <button 
                    onClick={() => setQuickTradeAsset(null)}
                    className="absolute top-4 right-4 text-cyan-700 hover:text-cyan-400 transition"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                
                <h3 className="text-xl font-bold text-white mb-1 font-mono">QUICK TRADE // {quickTradeAsset.ticker}</h3>
                <div className="text-xs text-cyan-600 mb-6 uppercase tracking-widest">
                    Current Price: ${currentPrices[quickTradeAsset.ticker]?.price?.toLocaleString() || "---"}
                </div>

                <div className="flex gap-2 mb-6 bg-[#050914] p-1 border border-cyan-900/30">
                    <button 
                        onClick={() => setTradeType('buy')}
                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition ${tradeType === 'buy' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'text-slate-500 hover:text-white'}`}
                    >
                        Buy
                    </button>
                    <button 
                        onClick={() => setTradeType('sell')}
                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition ${tradeType === 'sell' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'text-slate-500 hover:text-white'}`}
                    >
                        Sell
                    </button>
                </div>

                <form onSubmit={executeTrade}>
                    <div className="mb-6">
                        <label className="block text-xs text-slate-500 mb-2 uppercase tracking-wider">Quantity</label>
                        <input 
                            type="number" 
                            step="any"
                            value={tradeQuantity}
                            onChange={(e) => setTradeQuantity(e.target.value)}
                            className="w-full bg-[#050914] border border-cyan-900/50 px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition font-mono"
                            placeholder="0.00"
                            autoFocus
                        />
                        {tradeType === 'sell' && (
                            <div className="text-[10px] text-slate-500 mt-1 text-right">
                                Max: {quickTradeAsset.quantity}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center mb-6 p-3 bg-[#050914] border border-cyan-900/30">
                        <span className="text-xs text-slate-500 uppercase">Est. Total</span>
                        <span className="font-mono text-white font-bold">
                            ${((parseFloat(tradeQuantity) || 0) * (currentPrices[quickTradeAsset.ticker]?.price || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isTradeProcessing}
                        className={`w-full py-3 font-bold text-black uppercase tracking-wider transition shadow-[0_0_15px_rgba(0,0,0,0.2)] ${tradeType === 'buy' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-red-500 hover:bg-red-400'}`}
                    >
                        {isTradeProcessing ? "PROCESSING..." : `CONFIRM ${tradeType.toUpperCase()}`}
                    </button>
                </form>
            </div>
        </div>
      )}

      {isAddAssetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md bg-[#0B1221] border border-cyan-500/30 p-1 shadow-[0_0_50px_rgba(6,182,212,0.2)]">
            <button onClick={() => setIsAddAssetOpen(false)} className="absolute -top-8 right-0 text-cyan-600 hover:text-cyan-400 transition text-xs uppercase font-bold tracking-widest">
              [ Close Panel ]
            </button>
            <AddAssetForm onSuccess={() => setIsAddAssetOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}