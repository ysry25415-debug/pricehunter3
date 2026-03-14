import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";

const navLinkClasses =
  "rounded-lg px-3 py-2 text-sm font-semibold uppercase tracking-wide transition";

const getStoredToken = () => localStorage.getItem("ph_token");

const getInitials = (email) =>
  email ? email.trim().slice(0, 2).toUpperCase() : "PH";

const interpolate = (start, end, percent) =>
  Math.round(start + (end - start) * percent);

export default function App() {
  const [userEmail, setUserEmail] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [themeLevel, setThemeLevel] = useState(0);

  const themePercent = Math.min(Math.max(themeLevel, 0), 100) / 100;
  const baseColor = {
    r: interpolate(5, 245, themePercent),
    g: interpolate(5, 245, themePercent),
    b: interpolate(5, 245, themePercent)
  };
  const overlayOpacity = themePercent * 0.55;

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
          setUserEmail(payload.user.email);
        }
      })
      .catch(() => {
        localStorage.removeItem("ph_token");
      });
  }, []);

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
    setUserEmail("");
    setMenuOpen(false);
    window.location.href = "/";
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen text-white">
        <div
          className="fixed inset-0 -z-10"
          style={{
            backgroundColor: `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`
          }}
        />
        <div
          className="fixed inset-0 -z-10"
          style={{ backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})` }}
        />
        <div className="fixed left-4 top-4 z-40 flex items-center gap-2 rounded-full border border-white/10 bg-panel/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/80 shadow-xl">
          <span>Theme</span>
          <input
            type="range"
            min="0"
            max="100"
            value={themeLevel}
            onChange={(event) => setThemeLevel(Number(event.target.value))}
            className="h-1.5 w-24 cursor-pointer accent-accent"
          />
        </div>

        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between overflow-visible px-6 py-6">
          <Link className="text-lg font-semibold tracking-wide text-white" to="/">
            PriceHunter
          </Link>
          <div className="flex items-center gap-3 text-sm text-muted">
            <span className="hidden md:inline">Speed-first price comparisons</span>
            {userEmail ? (
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-panel/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:border-accent/40"
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20 text-accent">
                    {getInitials(userEmail)}
                  </span>
                  <span className="hidden sm:inline">{userEmail}</span>
                </button>
                {menuOpen && (
                  <div className="fixed right-6 top-20 z-[70] w-64 rounded-2xl border border-white/10 bg-panel/95 p-4 text-sm shadow-2xl">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted">
                      Account
                    </p>
                    <div className="mt-3 space-y-2">
                      <button className="w-full rounded-lg border border-white/10 px-3 py-2 text-left text-white/80 transition hover:border-accent/40">
                        Account settings
                      </button>
                      <button className="w-full rounded-lg border border-white/10 px-3 py-2 text-left text-white/80 transition hover:border-accent/40">
                        Transactions
                      </button>
                      <button className="w-full rounded-lg border border-white/10 px-3 py-2 text-left text-white/80 transition hover:border-accent/40">
                        Saved comparisons
                      </button>
                      <button className="w-full rounded-lg border border-white/10 px-3 py-2 text-left text-white/80 transition hover:border-accent/40">
                        Alerts
                      </button>
                      <button className="w-full rounded-lg border border-white/10 px-3 py-2 text-left text-white/80 transition hover:border-accent/40">
                        Billing
                      </button>
                      <button className="w-full rounded-lg border border-white/10 px-3 py-2 text-left text-white/80 transition hover:border-accent/40">
                        Support
                      </button>
                    </div>
                    <button
                      className="mt-4 w-full rounded-lg border border-accent/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-accent transition hover:bg-accent/10"
                      onClick={handleLogout}
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/signup"
                  className={`${navLinkClasses} bg-accent text-black hover:brightness-110`}
                >
                  Sign up
                </Link>
                <Link
                  to="/login"
                  className={`${navLinkClasses} border border-accent/40 text-accent hover:bg-accent/10`}
                >
                  Log in
                </Link>
              </>
            )}
          </div>
        </header>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
