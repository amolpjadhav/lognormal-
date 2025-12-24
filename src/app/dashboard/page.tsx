"use client";
import { useState, useEffect } from "react";
import { useAuth, logoutUser } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { getCryptoPrices, getAssetPrices, type MarketData } from "@/lib/market-data";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AddAssetForm from "./AddAssetForm";

interface Asset {
  id: string;
  ticker: string;
  quantity: number;
  purchasePrice: number;
  addedAt?: any;
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [marketData, setMarketData] = useState<MarketData | null>(null);

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

  // Fetch Market Data (BTC/ETH)
  useEffect(() => {
    const fetchPrices = async () => {
      const data = await getCryptoPrices();
      if (data) setMarketData(data);
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

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

  const totalPortfolioValue = assets.reduce((sum, asset) => {
    const price = currentPrices[asset.ticker] || asset.purchasePrice;
    return sum + (price * asset.quantity);
  }, 0);

  if (loading) return <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center text-emerald-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white">
       <nav className="border-b border-white/5 p-4 flex justify-between items-center bg-[#0D121F]">
        <div className="font-bold text-xl tracking-tighter">
          <Link href="/dashboard">Ln Lognormal</Link>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/pair-trade" className="text-sm font-semibold text-slate-400 hover:text-emerald-400 transition">
            Pair Trade / Ratios
          </Link>
          <div className="flex items-center gap-4">
             <span className="text-sm text-slate-400 hidden md:inline">{user?.displayName}</span>
             <button onClick={handleLogout} className="text-sm font-semibold text-slate-400 hover:text-red-400 transition">Sign Out</button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Portfolio Dashboard</h1>
            <p className="text-slate-400">Track your assets and performance.</p>
          </div>
          <button onClick={() => setIsAddAssetOpen(true)} className="bg-emerald-500 text-black px-4 py-2 rounded-xl font-bold hover:bg-emerald-400 transition">
            + Add Asset
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-[#161C2C] p-6 rounded-2xl border border-white/5">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Balance</p>
            <h2 className="text-3xl font-mono mt-2">${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
          </div>
          <div className="bg-[#161C2C] p-6 rounded-2xl border border-white/5">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">BTC / ETH Ratio</p>
            <h2 className="text-3xl font-mono mt-2 text-emerald-400">
              {marketData ? marketData.ratio.toFixed(4) : "---"}
            </h2>
             {marketData && (
              <p className="text-xs text-slate-500 mt-1">BTC: ${marketData.btcPrice.toLocaleString()} / ETH: ${marketData.ethPrice.toLocaleString()}</p>
            )}
          </div>
           <div className="bg-[#161C2C] p-6 rounded-2xl border border-white/5 flex items-center justify-center">
             <Link href="/pair-trade" className="text-emerald-500 font-bold hover:underline">View Pair Trades &rarr;</Link>
          </div>
        </div>

        <div className="bg-[#161C2C] rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/5 font-bold flex justify-between items-center">
            <span>Your Assets</span>
            <span className="text-xs text-slate-500 font-normal">{assets.length} Holdings</span>
          </div>
          
          {assets.length === 0 ? (
            <div className="p-20 text-center text-slate-500 italic">
              Your portfolio is currently empty. Add your first stock or crypto asset to begin tracking.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-400">
                <thead className="bg-white/5 text-slate-200 uppercase font-bold text-xs">
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
                <tbody className="divide-y divide-white/5">
                  {assets.map((asset) => {
                    const currentPrice = currentPrices[asset.ticker] || 0;
                    const totalValue = currentPrice * asset.quantity;
                    const costBasis = asset.purchasePrice * asset.quantity;
                    const profitLoss = totalValue - costBasis;
                    const isProfit = profitLoss >= 0;

                    return (
                      <tr key={asset.id} className="hover:bg-white/5 transition">
                        <td className="px-6 py-4 font-bold text-white">{asset.ticker}</td>
                        <td className="px-6 py-4">{asset.quantity}</td>
                        <td className="px-6 py-4 text-slate-500">${asset.purchasePrice.toLocaleString()}</td>
                        <td className="px-6 py-4 text-white">${currentPrice > 0 ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "---"}</td>
                        <td className="px-6 py-4 font-mono text-white">
                          ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`px-6 py-4 font-mono font-bold ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isProfit ? '+' : ''}{profitLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="text-xs font-bold text-red-500 hover:text-red-400 transition bg-red-500/10 px-3 py-1 rounded-lg"
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
      </main>

      {isAddAssetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md">
            <button onClick={() => setIsAddAssetOpen(false)} className="absolute -top-10 right-0 text-slate-400 hover:text-white transition">
              Close
            </button>
            <AddAssetForm onSuccess={() => setIsAddAssetOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}