"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleAuth() {
    setLoading(true);
    setMessage("");

    if (!email || !password) {
      setMessage("Please enter email and password.");
      setLoading(false);
      return;
    }

    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setMessage(
        "Account created. Check your email if confirmation is required."
      );

      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#030712] text-white flex items-center justify-center px-4">

      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/20 mb-5">
            📈
          </div>

          <h1 className="text-3xl font-bold">
            Trading Journal
          </h1>

          <p className="text-gray-400 mt-2">
            {isSignup
              ? "Create your trading account"
              : "Login to your trading dashboard"}
          </p>
        </div>

        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 md:p-8">

          <div className="space-y-5">

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Email
              </label>

              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Password
              </label>

              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
              />
            </div>

            {message && (
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-gray-300">
                {message}
              </div>
            )}

            <button
              onClick={handleAuth}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl py-3 font-semibold transition"
            >
              {loading
                ? "Please wait..."
                : isSignup
                ? "Create Account"
                : "Login"}
            </button>

          </div>

          <div className="text-center mt-6">

            <button
              onClick={() => {
                setIsSignup(!isSignup);
                setMessage("");
              }}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              {isSignup
                ? "Already have an account? Login"
                : "Don't have an account? Sign up"}
            </button>

          </div>

        </div>

      </div>

    </main>
  );
}