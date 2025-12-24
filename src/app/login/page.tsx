"use client";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

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
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
    } catch (error: any) {
      console.error("Login Error:", error);
      alert(`Login failed: ${error.message}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B0F1A]">
      <button 
        onClick={handleLogin}
        className="bg-white text-black px-8 py-4 rounded-xl font-bold flex items-center gap-3 hover:bg-slate-200 transition"
      >
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" />
        Connect with Google
      </button>
    </div>
  );
}