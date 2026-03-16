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
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantMessages, setAssistantMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I can help you use PriceHunter. Ask me anything."
    }
  ]);
  const [assistantStatus, setAssistantStatus] = useState("idle");

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

  const sendAssistantMessage = async () => {
    const trimmed = assistantInput.trim();
    if (!trimmed || assistantStatus === "loading") {
      return;
    }

    const assistantUrl =
      import.meta.env.VITE_ASSISTANT_URL || "http://localhost:8000/assistant/ask";

    const nextMessages = [
      ...assistantMessages,
      { role: "user", content: trimmed }
    ];
    setAssistantMessages(nextMessages);
    setAssistantInput("");
    setAssistantStatus("loading");

    try {
      const response = await fetch(assistantUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          user_id: userEmail || "guest",
          history: nextMessages.map((msg) => ({
            role: msg.role,
            content: msg.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error("Assistant request failed");
      }

      const payload = await response.json();
      setAssistantMessages([
        ...nextMessages,
        { role: "assistant", content: payload.reply || "No response." }
      ]);
    } catch (error) {
      setAssistantMessages([
        ...nextMessages,
        { role: "assistant", content: "Sorry, I could not answer that yet." }
      ]);
    } finally {
      setAssistantStatus("idle");
    }
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

        <div className="fixed bottom-6 right-6 z-50">
          <button
            type="button"
            className="rounded-full border border-accent/50 bg-panel/80 px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-accent shadow-glow transition hover:bg-accent/10"
            onClick={() => setAssistantOpen((open) => !open)}
          >
            Assistant
          </button>
        </div>

        {assistantOpen && (
          <div className="fixed bottom-20 right-6 z-50 w-[320px] max-w-[85vw] rounded-2xl border border-white/10 bg-panel/95 p-4 shadow-2xl">
            <div className="flex items-center justify-between text-sm text-muted">
              <span>PriceHunter Assistant</span>
              <button
                type="button"
                className="text-xs uppercase tracking-[0.2em] text-muted transition hover:text-accent"
                onClick={() => setAssistantOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1 text-sm">
              {assistantMessages.map((msg, index) => (
                <div
                  key={`${msg.role}-${index}`}
                  className={`rounded-xl px-3 py-2 ${
                    msg.role === "user"
                      ? "bg-accent/15 text-accent"
                      : "bg-black/40 text-white/90"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {assistantStatus === "loading" && (
                <div className="rounded-xl bg-black/40 px-3 py-2 text-white/70">
                  Thinking...
                </div>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={assistantInput}
                onChange={(event) => setAssistantInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    sendAssistantMessage();
                  }
                }}
                placeholder="Ask about PriceHunter..."
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none transition focus:border-accent"
              />
              <button
                type="button"
                className="rounded-xl bg-accent px-3 py-2 text-xs font-semibold uppercase tracking-wide text-black transition hover:brightness-110"
                onClick={sendAssistantMessage}
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </BrowserRouter>
  );
}
