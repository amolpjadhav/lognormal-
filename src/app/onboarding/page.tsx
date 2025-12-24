"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

export default function Onboarding() {
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (user) {
      // Update the user document we created during login
      await updateDoc(doc(db, "users", user.uid), {
        targetRole: role,
        yearsOfExperience: experience,
        onboardingComplete: true
      });
      router.push("/diagnostics"); // Send them to the tool
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <form onSubmit={handleSubmit} className="p-8 bg-white shadow-xl rounded-2xl w-full max-w-md border border-slate-200">
        <h1 className="text-2xl font-bold mb-2 text-slate-900">Final Step</h1>
        <p className="text-slate-600 mb-6">Help us tailor your Bar Raiser feedback.</p>
        
        <label className="block text-sm font-medium mb-1">Target Role (e.g. L6 SDE, Senior PM)</label>
        <input 
          required
          className="w-full p-3 border rounded-lg mb-4"
          placeholder="Enter target role"
          onChange={(e) => setRole(e.target.value)}
        />

        <label className="block text-sm font-medium mb-1">Years of Experience</label>
        <input 
          required
          type="number"
          className="w-full p-3 border rounded-lg mb-6"
          placeholder="e.g. 8"
          onChange={(e) => setExperience(e.target.value)}
        />

        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition">
          Enter the Lab
        </button>
      </form>
    </div>
  );
}