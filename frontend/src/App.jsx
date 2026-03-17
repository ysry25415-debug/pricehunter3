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
  const [assistantMessages, setAssistantMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I can help you use PriceHunter. Ask me anything."
    }
  ]);

  const assistantFaq = [
    {
      question: "How do I compare prices?",
      answer:
        "Use the main search bar to enter a product name. Then check Top matches to compare stores and sort by cheapest total, best rating, or fastest shipping."
    },
    {
      question: "How does AI image search work?",
      answer:
        "Tap AI image search to upload a product photo. Image matching is a placeholder right now and will be enabled in a future update."
    },
    {
      question: "Why do some prices show as N/A?",
      answer:
        "Some store links are currently placeholders without live pricing. We show N/A until live price feeds are connected."
    },
    {
      question: "How do I sort results?",
      answer:
        "Use the Sort by dropdown in Top matches to switch between cheapest total, best rating, or fastest shipping."
    },
    {
      question: "What does 'Lowest total' mean?",
      answer:
        "It combines product price and shipping cost to show the best overall deal."
    },
    {
      question: "What is the Dropship drawer for?",
      answer:
        "Open the Dropship drawer to set your target country and category, then choose a plan based on how many stores you want to compare."
    },
    {
      question: "What are the plans and store limits?",
      answer:
        "Free compares 5 stores, Standard compares 10 stores, and Pro compares 15 stores. You can upgrade anytime from the Dropship drawer."
    },
    {
      question: "Can I change my plan later?",
      answer:
        "Yes. You can upgrade or downgrade any time from the Dropship drawer."
    },
    {
      question: "What categories are supported?",
      answer:
        "You can choose Electronics, Clothing, or Shoes in the Dropship drawer."
    },
    {
      question: "Where do I manage my account?",
      answer:
        "Use the account menu in the top-right after you log in to access settings, transactions, alerts, and billing."
    },
    {
      question: "How do I create an account?",
      answer:
        "Click Sign up in the top-right and enter your email and password to create your account."
    },
    {
      question: "How do I log in?",
      answer:
        "Click Log in in the top-right and enter the email and password you used to sign up."
    },
    {
      question: "I forgot my password. What should I do?",
      answer:
        "Password reset will be available soon. For now, create a new account or contact support."
    },
    {
      question: "How do I contact support?",
      answer:
        "Open the account menu and choose Support. We will guide you through next steps."
    },
    {
      question: "Why am I not seeing results?",
      answer:
        "Try a more specific product name in English. If results are still empty, clear the search and try again."
    },
    {
      question: "Which stores are included?",
      answer:
        "We aggregate results from popular dropshipping-friendly stores like Amazon, Noon, AliExpress, Alibaba, and others."
    },
    {
      question: "Do you show live prices from every store?",
      answer:
        "Not yet. Some stores are links only. Live pricing will be enabled as integrations roll out."
    },
    {
      question: "Can I buy directly from PriceHunter?",
      answer:
        "No. PriceHunter compares prices and sends you to the store to complete your purchase."
    },
    {
      question: "How often are prices updated?",
      answer:
        "Update speed depends on your plan. Pro updates most frequently; Free updates least frequently."
    }
  ];

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

  const handleAssistantFaq = (item) => {
    setAssistantMessages((prev) => [
      ...prev,
      { role: "user", content: item.question },
      { role: "assistant", content: item.answer }
    ]);
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
            className="flex h-14 w-14 items-center justify-center rounded-full border border-accent/50 bg-panel/80 text-xl text-accent shadow-glow transition hover:bg-accent/10"
            onClick={() => setAssistantOpen((open) => !open)}
            aria-label="Assistant"
          >
            ✦
          </button>
        </div>

        {assistantOpen && (
          <div className="fixed bottom-20 right-6 z-50 w-[320px] max-w-[85vw] max-h-[60vh] overflow-hidden rounded-2xl border border-white/10 bg-panel/95 p-4 shadow-2xl">
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
            <div className="mt-4 max-h-48 space-y-3 overflow-y-auto pr-1 text-sm">
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
            </div>
            <div className="mt-4 border-t border-white/10 pt-3 max-h-40 overflow-y-auto pr-1">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">
                Quick questions
              </p>
              <div className="mt-3 space-y-2">
                {assistantFaq.map((item) => (
                  <button
                    key={item.question}
                    type="button"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-left text-xs text-white/80 transition hover:border-accent/40 hover:text-white"
                    onClick={() => handleAssistantFaq(item)}
                  >
                    {item.question}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </BrowserRouter>
  );
}
