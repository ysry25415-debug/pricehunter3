import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";

const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default function Signup() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState("free");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [isCreated, setIsCreated] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (event) => {
    event.preventDefault();
    setMessage("");

    if (!isValidEmail(email)) {
      setMessage("Please enter a valid email address.");
      return;
    }

    if (username.trim().length < 2) {
      setMessage("Username must be at least 2 characters.");
      return;
    }

    if (password.trim().length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    setStatus("loading");

    try {
      if (!supabase) {
        throw new Error("Auth is not connected.");
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.trim(),
            plan
          }
        }
      });
      if (error) {
        throw new Error(error.message || "Signup failed");
      }
      setIsCreated(true);
      setStatus("idle");
      localStorage.setItem("ph_plan", plan);
      localStorage.setItem("ph_name", username.trim());
      localStorage.setItem("ph_email", email);
      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (error) {
      setStatus("idle");
      setMessage(error.message || "Signup failed.");
    }
  };

  return (
    <div className="min-h-screen bg-base text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 hero-grid opacity-50" />
        <div className="absolute -top-24 left-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <section className="relative z-10 mx-auto flex min-h-[80vh] max-w-4xl flex-col items-center justify-center px-6">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-panel/90 p-8 shadow-glow backdrop-blur">
          <p className="text-xs uppercase tracking-[0.35em] text-muted">
            Create your account
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Sign up for PriceHunter</h1>
          <p className="mt-2 text-sm text-muted">
            Create a password to set up your account.
          </p>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:border-accent/40"
            >
              Continue with Google
            </button>
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-muted">
              <span className="h-px flex-1 bg-white/10" />
              Or
              <span className="h-px flex-1 bg-white/10" />
            </div>
          </div>

          {message && (
            <div className="mt-5 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
              {message}
            </div>
          )}

          {!isCreated && (
            <form onSubmit={handleSignup} className="mt-6 space-y-4">
              <label className="block text-sm text-muted">Username</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white outline-none transition focus:border-accent"
                placeholder="Your public name"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
              <label className="block text-sm text-muted">Email address</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white outline-none transition focus:border-accent"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <label className="block text-sm text-muted">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 pr-12 text-base text-white outline-none transition focus:border-accent"
                  placeholder="Create a password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-accent/80 transition hover:text-accent"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {showPassword ? (
                      <>
                        <path d="M2.1 12s3.8-6.5 9.9-6.5 9.9 6.5 9.9 6.5-3.8 6.5-9.9 6.5S2.1 12 2.1 12z" />
                        <circle cx="12" cy="12" r="3.5" />
                      </>
                    ) : (
                      <>
                        <path d="M3 4l18 16" />
                        <path d="M10.6 10.6a2.5 2.5 0 0 0 3.5 3.5" />
                        <path d="M6.2 7.6C3.9 9.4 2.1 12 2.1 12s3.8 6.5 9.9 6.5c1.9 0 3.6-.5 5-1.2" />
                        <path d="M14.2 7.1A9.6 9.6 0 0 1 21.9 12S18.1 18.5 12 18.5" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
              <label className="block text-sm text-muted">Plan</label>
              <select
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white outline-none transition focus:border-accent"
                value={plan}
                onChange={(event) => setPlan(event.target.value)}
              >
                <option value="free">Free - 5 stores</option>
                <option value="standard">Standard - 10 stores ($1)</option>
                <option value="pro">Pro - 15 stores ($3)</option>
              </select>
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full rounded-xl bg-accent px-5 py-3 text-sm font-semibold uppercase tracking-wide text-black transition hover:brightness-110 disabled:opacity-60"
              >
                {status === "loading" ? "Creating..." : "Create account"}
              </button>
            </form>
          )}

          {isCreated && (
            <div className="mt-6 rounded-xl border border-white/10 bg-black/40 px-4 py-6 text-center">
              <p className="text-lg font-semibold text-accent">
                Your account is ready.
              </p>
              <p className="mt-2 text-sm text-muted">
                You can now sign in with your email and password.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
