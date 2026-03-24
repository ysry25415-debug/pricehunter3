import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import { supabase } from "./lib/supabaseClient.js";

const navLinkClasses =
  "rounded-lg px-3 py-2 text-sm font-semibold uppercase tracking-wide transition";

const getStoredName = () => localStorage.getItem("ph_name");
const getStoredUserId = () => localStorage.getItem("ph_user_id");
const getStoredPlan = () => localStorage.getItem("ph_plan");

const getInitials = (name) =>
  name ? name.trim().slice(0, 2).toUpperCase() : "PH";

const interpolate = (start, end, percent) =>
  Math.round(start + (end - start) * percent);

export default function App() {
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState(getStoredName() || "");
  const [userPlan, setUserPlan] = useState(getStoredPlan() || "free");
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nameInput, setNameInput] = useState(getStoredName() || "");
  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [planOpen, setPlanOpen] = useState(false);
  const [planInput, setPlanInput] = useState(getStoredPlan() || "free");
  const [planStatus, setPlanStatus] = useState("idle");
  const [planMessage, setPlanMessage] = useState("");
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
    if (!supabase) {
      return;
    }

    const hydrateFromUser = (user) => {
      if (!user) {
        return;
      }
      const meta = user.user_metadata || {};
      const displayName = meta.username || user.email || "";
      const plan = meta.plan || "free";
      setUserEmail(user.email || "");
      setUserName(displayName);
      setNameInput(displayName);
      setUserPlan(plan);
      setPlanInput(plan);
      localStorage.setItem("ph_name", displayName);
      localStorage.setItem("ph_plan", plan);
      localStorage.setItem("ph_user_id", String(user.id));
      if (user.email) {
        localStorage.setItem("ph_email", user.email);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      hydrateFromUser(data?.session?.user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          hydrateFromUser(session.user);
        } else {
          setUserEmail("");
          setUserName("");
          setUserPlan("free");
          localStorage.removeItem("ph_name");
          localStorage.removeItem("ph_plan");
          localStorage.removeItem("ph_user_id");
          localStorage.removeItem("ph_email");
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem("ph_email");
    localStorage.removeItem("ph_name");
    localStorage.removeItem("ph_user_id");
    localStorage.removeItem("ph_plan");
    setUserEmail("");
    setUserName("");
    setUserPlan("free");
    setMenuOpen(false);
    window.location.href = "/";
  };

  const handleOpenSettings = () => {
    setSaveMessage("");
    setSettingsOpen(true);
    setMenuOpen(false);
    setNameInput(userName || userEmail);
  };

  const handleOpenPlans = () => {
    setPlanMessage("");
    setPlanOpen(true);
    setMenuOpen(false);
    setPlanInput(userPlan || "free");
  };

  const handleSaveProfile = async () => {
    if (!nameInput.trim() || nameInput.trim().length < 2) {
      setSaveMessage("Username must be at least 2 characters.");
      return;
    }

    setSaveStatus("loading");
    setSaveMessage("");

    try {
      if (!supabase) {
        throw new Error("Auth is not connected.");
      }
      const { data, error } = await supabase.auth.updateUser({
        data: { username: nameInput.trim() }
      });
      if (error) {
        throw new Error(error.message);
      }
      const nextName = data?.user?.user_metadata?.username || nameInput.trim();
      setUserName(nextName);
      localStorage.setItem("ph_name", nextName);
      setSaveStatus("idle");
      setSettingsOpen(false);
    } catch (error) {
      setSaveStatus("idle");
      setSaveMessage(error.message || "Update failed.");
    }
  };

  const handleSavePlan = async () => {
    setPlanStatus("loading");
    setPlanMessage("");

    try {
      if (!supabase) {
        throw new Error("Auth is not connected.");
      }
      const { data, error } = await supabase.auth.updateUser({
        data: { plan: planInput }
      });
      if (error) {
        throw new Error(error.message);
      }
      const nextPlan = data?.user?.user_metadata?.plan || planInput;
      setUserPlan(nextPlan);
      localStorage.setItem("ph_plan", nextPlan);
      window.dispatchEvent(
        new CustomEvent("ph-plan-updated", { detail: nextPlan })
      );
      setPlanStatus("idle");
      setPlanOpen(false);
    } catch (error) {
      setPlanStatus("idle");
      setPlanMessage(error.message || "Update failed.");
    }
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
        <div className="fixed left-3 top-3 z-40 flex items-center gap-2 rounded-full border border-white/10 bg-panel/80 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/80 shadow-xl sm:left-4 sm:top-4 sm:px-3 sm:text-[10px] sm:tracking-[0.25em]">
          <span className="hidden sm:inline">Theme</span>
          <span className="sm:hidden">Mode</span>
          <input
            type="range"
            min="0"
            max="100"
            value={themeLevel}
            onChange={(event) => setThemeLevel(Number(event.target.value))}
            className="h-1.5 w-16 cursor-pointer accent-accent sm:w-24"
          />
        </div>

        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-3 overflow-visible px-4 py-4 sm:px-6 sm:py-6">
          <Link className="text-base font-semibold tracking-wide text-white sm:text-lg" to="/">
            PriceHunter
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted sm:gap-3">
            <span className="hidden md:inline">Speed-first price comparisons</span>
            {userEmail ? (
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-panel/80 px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-white/80 transition hover:border-accent/40 sm:px-3 sm:text-xs"
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20 text-accent">
                    {getInitials(userName || userEmail)}
                  </span>
                  <span className="hidden sm:inline">
                    {userName || userEmail}
                  </span>
                </button>
                {menuOpen && (
                  <div className="fixed right-4 top-16 z-[70] w-[calc(100vw-2rem)] max-w-64 rounded-2xl border border-white/10 bg-panel/95 p-4 text-sm shadow-2xl sm:right-6 sm:top-20">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted">
                      Account
                    </p>
                    <div className="mt-3 space-y-2">
                      <button
                        className="w-full rounded-lg border border-white/10 px-3 py-2 text-left text-white/80 transition hover:border-accent/40"
                        onClick={handleOpenSettings}
                      >
                        Account settings
                      </button>
                      <button
                        className="w-full rounded-lg border border-white/10 px-3 py-2 text-left text-white/80 transition hover:border-accent/40"
                        onClick={handleOpenPlans}
                      >
                        Plans
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
                  className={`${navLinkClasses} px-2.5 py-2 text-xs sm:px-3 sm:text-sm bg-accent text-black hover:brightness-110`}
                >
                  Sign up
                </Link>
                <Link
                  to="/login"
                  className={`${navLinkClasses} px-2.5 py-2 text-xs sm:px-3 sm:text-sm border border-accent/40 text-accent hover:bg-accent/10`}
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

        {settingsOpen && (
          <div className="fixed inset-0 z-50 bg-black/60">
            <div className="absolute left-1/2 top-24 w-[360px] max-w-[90vw] -translate-x-1/2 rounded-2xl border border-white/10 bg-panel/95 p-5 shadow-2xl">
              <div className="flex items-center justify-between text-sm text-muted">
                <span>Account Settings</span>
                <button
                  type="button"
                  className="text-xs uppercase tracking-[0.2em] text-muted transition hover:text-accent"
                  onClick={() => setSettingsOpen(false)}
                >
                  Close
                </button>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <label className="block text-muted">Public username</label>
                <input
                  value={nameInput}
                  onChange={(event) => setNameInput(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-accent"
                  placeholder="Your public name"
                />
                {saveMessage && (
                  <div className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent">
                    {saveMessage}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saveStatus === "loading"}
                  className="w-full rounded-xl bg-accent px-4 py-3 text-xs font-semibold uppercase tracking-wide text-black transition hover:brightness-110 disabled:opacity-60"
                >
                  {saveStatus === "loading" ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {planOpen && (
          <div className="fixed inset-0 z-50 bg-black/60">
            <div className="absolute left-1/2 top-24 w-[380px] max-w-[92vw] -translate-x-1/2 rounded-2xl border border-white/10 bg-panel/95 p-5 shadow-2xl">
              <div className="flex items-center justify-between text-sm text-muted">
                <span>Plan Management</span>
                <button
                  type="button"
                  className="text-xs uppercase tracking-[0.2em] text-muted transition hover:text-accent"
                  onClick={() => setPlanOpen(false)}
                >
                  Close
                </button>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <button
                  type="button"
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    planInput === "free"
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-white/10 text-white/80 hover:border-accent/40"
                  }`}
                  onClick={() => setPlanInput("free")}
                >
                  <div className="text-sm font-semibold">Free plan - $0</div>
                  <div className="mt-2 space-y-1 text-xs text-muted">
                    <p>5 stores compared</p>
                    <p>10 searches per day</p>
                  </div>
                </button>
                <button
                  type="button"
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    planInput === "standard"
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-white/10 text-white/80 hover:border-accent/40"
                  }`}
                  onClick={() => setPlanInput("standard")}
                >
                  <div className="text-sm font-semibold">Standard plan - $1</div>
                  <div className="mt-2 space-y-1 text-xs text-muted">
                    <p>10 stores compared</p>
                    <p>200 searches per month</p>
                  </div>
                </button>
                <button
                  type="button"
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    planInput === "pro"
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-white/10 text-white/80 hover:border-accent/40"
                  }`}
                  onClick={() => setPlanInput("pro")}
                >
                  <div className="text-sm font-semibold">Pro plan - $3</div>
                  <div className="mt-2 space-y-1 text-xs text-muted">
                    <p>15 stores compared</p>
                    <p>Unlimited searches</p>
                  </div>
                </button>
                {planMessage && (
                  <div className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent">
                    {planMessage}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleSavePlan}
                  disabled={planStatus === "loading"}
                  className="w-full rounded-xl bg-accent px-4 py-3 text-xs font-semibold uppercase tracking-wide text-black transition hover:brightness-110 disabled:opacity-60"
                >
                  {planStatus === "loading" ? "Updating..." : "Update plan"}
                </button>
              </div>
            </div>
          </div>
        )}

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
