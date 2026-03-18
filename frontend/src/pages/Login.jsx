import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const getStoredToken = () => localStorage.getItem("ph_token");
const getStoredEmail = () => localStorage.getItem("ph_email");
const getStoredName = () => localStorage.getItem("ph_name");
const getStoredUserId = () => localStorage.getItem("ph_user_id");
const getStoredPlan = () => localStorage.getItem("ph_plan");

export default function Login() {
  const [email, setEmail] = useState(getStoredEmail() || "");
  const [username, setUsername] = useState(getStoredName() || "");
  const [userId, setUserId] = useState(getStoredUserId() || "");
  const [plan, setPlan] = useState(getStoredPlan() || "free");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      return;
    }

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Session invalid");
        }
        return response.json();
      })
      .then((payload) => {
        if (payload.user?.email) {
          setIsLoggedIn(true);
          setEmail(payload.user.email);
          setUsername(payload.user.username || payload.user.email);
          setUserId(String(payload.user.id || ""));
          setPlan(payload.user.plan || "free");
          localStorage.setItem("ph_plan", payload.user.plan || "free");
        }
      })
      .catch(() => {
        localStorage.removeItem("ph_token");
      });
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    setMessage("");

    if (!isValidEmail(email)) {
      setMessage("Please enter a valid email address.");
      return;
    }

    if (!password.trim()) {
      setMessage("Enter your password.");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Login failed");
      }

      const payload = await response.json();
      localStorage.setItem("ph_token", payload.token);
      localStorage.setItem("ph_email", payload.user.email);
      localStorage.setItem("ph_name", payload.user.username || payload.user.email);
      if (payload.user?.id) {
        localStorage.setItem("ph_user_id", String(payload.user.id));
      }
      if (payload.user?.plan) {
        localStorage.setItem("ph_plan", payload.user.plan);
        setPlan(payload.user.plan);
      } else {
        localStorage.setItem("ph_plan", "free");
        setPlan("free");
      }
      setIsLoggedIn(true);
      setStatus("idle");
      navigate("/");
    } catch (error) {
      setStatus("idle");
      setMessage(error.message || "Login failed.");
    }
  };

  const handleLogout = async () => {
    const token = getStoredToken();
    if (token) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
    }
    localStorage.removeItem("ph_token");
    localStorage.removeItem("ph_email");
    localStorage.removeItem("ph_name");
    localStorage.removeItem("ph_user_id");
    localStorage.removeItem("ph_plan");
    setIsLoggedIn(false);
    setPassword("");
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
            Secure email login
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            Sign in to PriceHunter
          </h1>
          <p className="mt-2 text-sm text-muted">
            Use your email and password. We will keep you signed in on this
            device.
          </p>

          {message && (
            <div className="mt-5 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
              {message}
            </div>
          )}

          {!isLoggedIn && (
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
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
                  placeholder="Enter your password"
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
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full rounded-xl bg-accent px-5 py-3 text-sm font-semibold uppercase tracking-wide text-black transition hover:brightness-110 disabled:opacity-60"
              >
                {status === "loading" ? "Signing in..." : "Sign in"}
              </button>
            </form>
          )}

          {isLoggedIn && (
            <div className="mt-6 rounded-xl border border-white/10 bg-black/40 px-4 py-6 text-center">
              <p className="text-lg font-semibold text-accent">
                You are signed in.
              </p>
              <p className="mt-2 text-sm text-muted">
                Welcome back, {username || email}.
              </p>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:border-accent/40"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
