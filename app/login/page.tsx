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

    if (!email.trim() || !password) {
      setMessage("Please enter email and password.");
      setLoading(false);
      return;
    }

    // =========================
    // SIGN UP
    // =========================

    if (isSignup) {
      const { data, error } =
        await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        console.log(
          "SIGNUP SESSION:",
          data.session
        );

        router.push("/");
        router.refresh();
        return;
      }

      setMessage(
        "Account created successfully. You can now login."
      );

      setIsSignup(false);
      setLoading(false);
      return;
    }

    // =========================
    // LOGIN
    // =========================

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      setMessage(error.message);
      setLoading(false);
      return;
    }

    // Check session immediately
    const {
      data: { session },
    } = await supabase.auth.getSession();

    console.log(
      "LOGIN RESPONSE USER:",
      data.user
    );

    console.log(
      "LOGIN SESSION:",
      session
    );

    if (!session) {
      setMessage(
        "Login successful, but session was not created. Please try again."
      );

      setLoading(false);
      return;
    }

    console.log(
      "LOGGED IN USER ID:",
      session.user.id
    );

    setMessage(
      "Login successful. Opening dashboard..."
    );

    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#030712] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* HEADER */}

        <div className="text-center mb-8">

          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/20 mb-5 text-2xl">
            📈
          </div>

          <h1 className="text-3xl font-bold">
            Trading Journal
          </h1>

          <p className="text-gray-400 mt-2">
            {isSignup
              ? "Create your trading account"
              : "Login to your trading account"}
          </p>

        </div>

        {/* LOGIN CARD */}

        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 md:p-8">

          <div className="space-y-5">

            {/* EMAIL */}

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Email
              </label>

              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* PASSWORD */}

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Password
              </label>

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAuth();
                  }
                }}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* MESSAGE */}

            {message && (
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-gray-300">
                {message}
              </div>
            )}

            {/* BUTTON */}

            <button
              onClick={handleAuth}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl py-3 font-semibold transition"
            >
              {loading
                ? isSignup
                  ? "Creating account..."
                  : "Logging in..."
                : isSignup
                ? "Create Account"
                : "Login"}
            </button>

            {/* SWITCH LOGIN / SIGNUP */}

            <div className="text-center pt-2">

              <button
                onClick={() => {
                  setIsSignup(!isSignup);
                  setMessage("");
                }}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                {isSignup
                  ? "Already have an account? Login"
                  : "Don't have an account? Create one"}
              </button>

            </div>

          </div>

        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Secure account authentication
        </p>

      </div>
    </main>
  );
}