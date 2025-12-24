"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

interface AddAssetFormProps {
  onSuccess?: () => void;
}

export default function AddAssetForm({ onSuccess }: AddAssetFormProps) {
  const { user } = useAuth();
  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to add an asset.");
      return;
    }
    if (!ticker || !quantity || !price) {
      setError("Please fill out all fields.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const assetsCollectionRef = collection(db, "users", user.uid, "assets");
      await addDoc(assetsCollectionRef, {
        ticker: ticker.toUpperCase(),
        quantity: parseFloat(quantity),
        purchasePrice: parseFloat(price),
        addedAt: serverTimestamp(),
      });

      setSuccess(`Successfully added ${ticker.toUpperCase()}.`);
      // Clear form and success message
      setTicker("");
      setQuantity("");
      setPrice("");
      setTimeout(() => {
        setSuccess(null);
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err) {
      console.error("Error adding asset:", err);
      setError("Failed to add asset. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-[#161C2C] rounded-2xl shadow-xl border border-white/10">
      <h2 className="text-2xl font-bold text-center text-white">Add New Asset</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="ticker" className="block text-sm font-medium text-slate-400">
            Stock Ticker
          </label>
          <input
            id="ticker"
            name="ticker"
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 bg-[#0B0F1A] border border-white/10 rounded-xl text-white text-sm shadow-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            placeholder="e.g., AAPL"
          />
        </div>
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-slate-400">
            Quantity
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 bg-[#0B0F1A] border border-white/10 rounded-xl text-white text-sm shadow-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            placeholder="e.g., 10"
            step="any"
          />
        </div>
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-slate-400">
            Purchase Price
          </label>
          <input
            id="price"
            name="price"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 bg-[#0B0F1A] border border-white/10 rounded-xl text-white text-sm shadow-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            placeholder="e.g., 150.25"
            step="any"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-emerald-400">{success}</p>}
        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-black bg-emerald-500 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed transition"
          >
            {loading ? "Adding..." : "Add Asset"}
          </button>
        </div>
      </form>
    </div>
  );
}