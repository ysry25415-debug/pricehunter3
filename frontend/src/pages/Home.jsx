import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

const DEFAULT_QUERY = "wireless earbuds";

const sortOptions = [
  { value: "cheapest", label: "Cheapest Total" },
  { value: "rating", label: "Best Rating" },
  { value: "shipping", label: "Fastest Shipping" }
];

const CHAT_CHANNELS = [
  { id: "team", name: "PriceHunter Crew" },
  { id: "dropship", name: "Dropship Q&A" },
  { id: "alerts", name: "Deals & Alerts" }
];

const formatMoney = (value) => {
  if (!Number.isFinite(value)) {
    return "N/A";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
};

const getDisplayName = (name) => {
  const safe = (name || "").trim();
  if (!safe) {
    return "Guest";
  }
  if (safe.includes("@")) {
    return safe.split("@")[0];
  }
  return safe;
};

const getAvatarUrl = (name) => {
  const seed = encodeURIComponent(getDisplayName(name));
  return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundType=gradientLinear`;
};

export default function Home() {
  const apiBase =
    import.meta.env.VITE_API_BASE ||
    (window.location.hostname === "localhost" ? "http://localhost:3001" : "");
  const [chatUserName, setChatUserName] = useState(
    localStorage.getItem("ph_name") ||
      localStorage.getItem("ph_email") ||
      "Guest"
  );
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [sort, setSort] = useState("cheapest");
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [dropshipOpen, setDropshipOpen] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [activeChatType, setActiveChatType] = useState("channel");
  const [activeChatId, setActiveChatId] = useState("team");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState({
    team: [],
    dropship: [],
    alerts: []
  });
  const [dmMessages, setDmMessages] = useState({});
  const [dmPeers, setDmPeers] = useState([]);
  const [dmUnreadCounts, setDmUnreadCounts] = useState({});
  const [chatStatus, setChatStatus] = useState("idle");
  const [replyTarget, setReplyTarget] = useState(null);
  const [avatarMenuId, setAvatarMenuId] = useState(null);
  const [dropshipCountry, setDropshipCountry] = useState("");
  const [dropshipCategory, setDropshipCategory] = useState("electronics");
  const [selectedPlan, setSelectedPlan] = useState(
    localStorage.getItem("ph_plan") || "free"
  );
  const fileInputRef = useRef(null);
  const chatScrollRef = useRef(null);

  const [chatId, setChatId] = useState(() => {
    const accountId = localStorage.getItem("ph_user_id");
    if (accountId) {
      return accountId;
    }
    let id = localStorage.getItem("ph_chat_id");
    if (!id) {
      id = `guest-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem("ph_chat_id", id);
    }
    return id;
  });

  const getLastReadKey = (id) => `ph_dm_last_read_${id}`;

  const loadLastReadMap = (id) => {
    try {
      return JSON.parse(localStorage.getItem(getLastReadKey(id)) || "{}");
    } catch {
      return {};
    }
  };

  const saveLastReadMap = (id, map) => {
    localStorage.setItem(getLastReadKey(id), JSON.stringify(map));
  };

  const markPeerRead = (peerId) => {
    if (!chatId || !peerId) {
      return;
    }
    const next = { ...loadLastReadMap(chatId), [peerId]: new Date().toISOString() };
    saveLastReadMap(chatId, next);
    setDmUnreadCounts((prev) => ({ ...prev, [peerId]: 0 }));
  };

  useEffect(() => {
    const accountId = localStorage.getItem("ph_user_id");
    if (accountId && accountId !== chatId) {
      setChatId(accountId);
    }
  }, [chatId]);

  useEffect(() => {
    if (!supabase) {
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const user = data?.session?.user;
      const meta = user?.user_metadata || {};
      if (meta.username || user?.email) {
        const name = meta.username || user.email;
        setChatUserName(name);
        localStorage.setItem("ph_name", name);
        if (user?.id) {
          localStorage.setItem("ph_user_id", String(user.id));
        }
      }
    });
  }, []);

  useEffect(() => {
    const handlePlanUpdate = (event) => {
      const nextPlan =
        event?.detail || localStorage.getItem("ph_plan") || "free";
      setSelectedPlan(nextPlan);
    };

    window.addEventListener("ph-plan-updated", handlePlanUpdate);
    return () => window.removeEventListener("ph-plan-updated", handlePlanUpdate);
  }, []);

  const fetchProducts = async (overrideQuery = query, overrideSort = sort) => {
    setStatus("loading");
    setMessage("");

    try {
      const token = localStorage.getItem("ph_token");
      const plan = localStorage.getItem("ph_plan") || "free";
      // Backend endpoint handles filtering + sorting on mock store data.
      const response = await fetch(
        `${apiBase}/api/products/search?q=${encodeURIComponent(
          overrideQuery
        )}&sort=${overrideSort}&plan=${encodeURIComponent(plan)}`,
        token
          ? {
              headers: { Authorization: `Bearer ${token}` }
            }
          : undefined
      );

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const payload = await response.json();
      setProducts(payload.products);
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setMessage("Could not load products. Please try again.");
    }
  };

  useEffect(() => {
    fetchProducts(DEFAULT_QUERY, sort);
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    fetchProducts(query, sort);
  };

  const handleSortChange = (event) => {
    const nextSort = event.target.value;
    setSort(nextSort);
    fetchProducts(query, nextSort);
  };

  const handleImageSearch = (event) => {
    if (event.target.files?.length) {
      setMessage("Image received. AI search is coming soon.");
    }
  };

  const activeThread = useMemo(
    () => CHAT_CHANNELS.find((thread) => thread.id === activeChatId),
    [activeChatId]
  );
  const activeMessages =
    activeChatType === "channel"
      ? chatMessages[activeChatId] || []
      : dmMessages[activeChatId] || [];

  const handleSendChat = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed) {
      return;
    }
    if (!supabase) {
      setMessage("Community chat is not connected yet. Add Supabase keys.");
      return;
    }

    const userName = getDisplayName(chatUserName);
    const userId = chatId || localStorage.getItem("ph_chat_id");

    const pendingId = `pending-${Date.now()}`;
    const replyPayload = replyTarget
      ? {
          reply_to_id: replyTarget.id,
          reply_to_name: replyTarget.user_name || "Guest",
          reply_to_content: replyTarget.content
        }
      : null;

    if (activeChatType === "channel") {
      setChatMessages((prev) => {
        const list = prev[activeChatId] || [];
        return {
          ...prev,
          [activeChatId]: [
            ...list,
            {
              id: pendingId,
              channel: activeChatId,
              user_id: userId,
              user_name: userName,
              content: trimmed,
              created_at: new Date().toISOString(),
              pending: true,
              ...(replyPayload || {})
            }
          ]
        };
      });
    } else {
      setDmMessages((prev) => {
        const list = prev[activeChatId] || [];
        return {
          ...prev,
          [activeChatId]: [
            ...list,
            {
              id: pendingId,
              user_id: userId,
              user_name: userName,
              content: trimmed,
              created_at: new Date().toISOString(),
              pending: true,
              ...(replyPayload || {})
            }
          ]
        };
      });
    }

    requestAnimationFrame(() => {
      chatScrollRef.current?.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    });

    setChatInput("");
    setReplyTarget(null);
    let error = null;
    if (activeChatType === "channel") {
      const response = await supabase.from("community_messages").insert({
        channel: activeChatId,
        user_id: userId,
        user_name: userName,
        content: trimmed,
        ...(replyPayload || {})
      });
      error = response.error;
    } else {
      const peer = dmPeers.find((item) => item.id === activeChatId);
      const response = await supabase.from("private_messages").insert({
        sender_id: userId,
        sender_name: userName,
        recipient_id: peer?.id || activeChatId,
        recipient_name: peer?.name || "Private user",
        content: trimmed,
        ...(replyPayload || {})
      });
      error = response.error;
    }
    if (error) {
      setMessage("Message failed to send. Please try again.");
      if (activeChatType === "channel") {
        setChatMessages((prev) => {
          const list = prev[activeChatId] || [];
          return {
            ...prev,
            [activeChatId]: list.filter((msg) => msg.id !== pendingId)
          };
        });
      } else {
        setDmMessages((prev) => {
          const list = prev[activeChatId] || [];
          return {
            ...prev,
            [activeChatId]: list.filter((msg) => msg.id !== pendingId)
          };
        });
      }
    }
    setChatStatus("idle");
  };

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    const loadMessages = async () => {
      setChatStatus("loading");
      const updates = {};
      for (const channel of CHAT_CHANNELS) {
        const { data } = await supabase
          .from("community_messages")
          .select(
            "id, channel, user_id, user_name, content, created_at, reply_to_id, reply_to_name, reply_to_content"
          )
          .eq("channel", channel.id)
          .order("created_at", { ascending: true })
          .limit(50);
        updates[channel.id] = data || [];
      }

      const effectiveChatId = chatId || localStorage.getItem("ph_chat_id") || "";
      const lastReadMap = loadLastReadMap(effectiveChatId);
      const { data: privateData } = await supabase
        .from("private_messages")
        .select(
          "id, sender_id, sender_name, recipient_id, recipient_name, content, created_at, reply_to_id, reply_to_name, reply_to_content"
        )
        .or(`sender_id.eq.${effectiveChatId},recipient_id.eq.${effectiveChatId}`)
        .order("created_at", { ascending: true })
        .limit(100);

      const dmUpdates = {};
      const peers = {};
      const unreadCounts = {};
      (privateData || []).forEach((record) => {
        const isSender = record.sender_id === effectiveChatId;
        const peerId = isSender ? record.recipient_id : record.sender_id;
        const peerName = isSender ? record.recipient_name : record.sender_name;
        const entry = {
          id: record.id,
          user_id: record.sender_id,
          user_name: record.sender_name,
          content: record.content,
          created_at: record.created_at,
          reply_to_id: record.reply_to_id,
          reply_to_name: record.reply_to_name,
          reply_to_content: record.reply_to_content
        };
        dmUpdates[peerId] = [...(dmUpdates[peerId] || []), entry];
        peers[peerId] = peerName || "Private user";
        if (!isSender) {
          const lastRead = lastReadMap[peerId];
          if (!lastRead || new Date(record.created_at) > new Date(lastRead)) {
            unreadCounts[peerId] = (unreadCounts[peerId] || 0) + 1;
          }
        }
      });

      if (isMounted) {
        setChatMessages((prev) => ({ ...prev, ...updates }));
        setDmMessages((prev) => ({ ...prev, ...dmUpdates }));
        setDmUnreadCounts((prev) => ({ ...prev, ...unreadCounts }));
        setDmPeers((prev) => {
          const existing = new Map(prev.map((p) => [p.id, p.name]));
          Object.entries(peers).forEach(([id, name]) => {
            if (!existing.has(id)) {
              existing.set(id, name);
            }
          });
          return Array.from(existing.entries()).map(([id, name]) => ({
            id,
            name
          }));
        });
        setChatStatus("idle");
      }
    };

    loadMessages();

    const refreshTimer = setInterval(() => {
      if (!isMounted) {
        return;
      }
      loadMessages();
    }, 15000);

    let channel;
    let reconnectTimer;

    const startRealtime = () => {
      channel = supabase
        .channel("community_messages")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "community_messages" },
          (payload) => {
            if (!isMounted) {
              return;
            }
            const record = payload.new;
            setChatMessages((prev) => {
              const list = prev[record.channel] || [];
              const deduped = list.filter(
                (msg) =>
                  !msg.pending ||
                  msg.user_name !== record.user_name ||
                  msg.content !== record.content
              );
              return {
                ...prev,
                [record.channel]: [...deduped, record]
              };
            });
            requestAnimationFrame(() => {
              chatScrollRef.current?.scrollTo({
                top: chatScrollRef.current.scrollHeight,
                behavior: "smooth"
              });
            });
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "private_messages" },
          (payload) => {
            if (!isMounted) {
              return;
            }
              const record = payload.new;
            if (
              record.sender_id !== effectiveChatId &&
              record.recipient_id !== effectiveChatId
            ) {
              return;
            }
            const isSender = record.sender_id === effectiveChatId;
            const peerId = isSender ? record.recipient_id : record.sender_id;
            const peerName = isSender
              ? record.recipient_name
              : record.sender_name;
            const entry = {
              id: record.id,
              user_id: record.sender_id,
              user_name: record.sender_name,
              content: record.content,
              created_at: record.created_at,
              reply_to_id: record.reply_to_id,
              reply_to_name: record.reply_to_name,
              reply_to_content: record.reply_to_content
            };
            setDmMessages((prev) => {
              const list = prev[peerId] || [];
              const deduped = list.filter(
                (msg) =>
                  !msg.pending ||
                  msg.user_name !== record.sender_name ||
                  msg.content !== record.content
              );
              return {
                ...prev,
                [peerId]: [...deduped, entry]
              };
            });
            if (activeChatType === "dm" && activeChatId === peerId) {
              requestAnimationFrame(() => {
                chatScrollRef.current?.scrollTo({
                  top: chatScrollRef.current.scrollHeight,
                  behavior: "smooth"
                });
              });
            }
            setDmPeers((prev) => {
              if (prev.some((item) => item.id === peerId)) {
                return prev;
              }
              return [...prev, { id: peerId, name: peerName || "Private user" }];
            });
            if (!isSender) {
              if (activeChatType === "dm" && activeChatId === peerId) {
                markPeerRead(peerId);
              } else {
                setDmUnreadCounts((prev) => ({
                  ...prev,
                  [peerId]: (prev[peerId] || 0) + 1
                }));
              }
            }
          }
        )
        .subscribe((status) => {
          if (!isMounted) {
            return;
          }
          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            if (reconnectTimer) {
              clearTimeout(reconnectTimer);
            }
            reconnectTimer = setTimeout(() => {
              if (!isMounted) {
                return;
              }
              if (channel) {
                supabase.removeChannel(channel);
              }
              startRealtime();
            }, 1000);
          }
        });
    };

    startRealtime();

    return () => {
      isMounted = false;
      clearInterval(refreshTimer);
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [chatId]);

  return (
    <div className="min-h-screen text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 hero-grid opacity-60" />
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />

        <section className="relative z-10 mx-auto max-w-6xl px-6 pb-16 pt-10">
          <div className="max-w-3xl animate-fade-up">
            <p className="text-sm uppercase tracking-[0.35em] text-muted">
              Compare stores instantly
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
              Find the lowest price across stores worldwide
            </h1>
            <p className="mt-4 text-base text-muted md:text-lg">
              PriceHunter scans the fastest deals so you can buy with confidence.
              Sort by total cost, speed, or ratings.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-10 flex flex-col gap-4 rounded-2xl border border-white/10 bg-panel/80 p-6 shadow-glow backdrop-blur md:flex-row md:items-center"
          >
            <input
              className="w-full flex-1 rounded-xl border border-white/10 bg-black/40 px-5 py-4 text-lg text-white outline-none transition focus:border-accent"
              placeholder="Search for a product, brand, or model"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <button
                type="submit"
                className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold uppercase tracking-wide text-black transition hover:brightness-110"
              >
                Search deals
              </button>
              <button
                type="button"
                className="rounded-xl border border-accent/40 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-accent transition hover:bg-accent/10"
                onClick={() => fileInputRef.current?.click()}
              >
                AI image search
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSearch}
              />
            </div>
          </form>

        </section>
      </div>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold">Top matches</h2>
              <div className="flex items-center gap-3 text-sm text-muted">
                <span>Sort by</span>
                <select
                  value={sort}
                  onChange={handleSortChange}
                  className="rounded-lg border border-white/10 bg-panel px-3 py-2 text-white"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {message && (
              <div className="mt-6 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
                {message}
              </div>
            )}

            {status === "loading" && (
              <div className="mt-8 text-sm text-muted">
                Loading the best prices...
              </div>
            )}

            {status === "error" && (
              <div className="mt-8 text-sm text-red-400">
                We hit a snag. Try again in a moment.
              </div>
            )}

            {status === "success" && products.length === 0 && (
              <div className="mt-8 rounded-xl border border-white/10 bg-panel/60 px-4 py-6 text-sm text-muted">
                No products found. Try searching in English or clear the search
                field to see all products.
              </div>
            )}

            <div className="mt-8 grid gap-6">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="rounded-2xl border border-white/10 bg-panel/80 p-6 shadow-xl transition hover:border-accent/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold">{product.name}</h3>
                      <p className="mt-2 text-sm text-muted">
                        {product.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">
                        Lowest total
                      </p>
                      <p className="text-2xl font-semibold text-accent">
                        {formatMoney(product.lowestTotal)}
                      </p>
                    </div>
                  </div>

                  {product.image && (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="mt-6 h-48 w-full rounded-xl object-cover"
                      loading="lazy"
                    />
                  )}

                  <div className="mt-6 overflow-hidden rounded-xl border border-white/10">
                    <table className="w-full text-sm">
                      <thead className="bg-black/40 text-xs uppercase tracking-widest text-muted">
                        <tr>
                          <th className="px-3 py-3 text-left">Store</th>
                          <th className="px-3 py-3 text-left">Price</th>
                          <th className="px-3 py-3 text-left">Shipping</th>
                          <th className="px-3 py-3 text-left">Total</th>
                          <th className="px-3 py-3 text-left">Rating</th>
                          <th className="px-3 py-3 text-left">Buy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.offers.map((offer) => (
                          <tr
                            key={offer.store}
                            className="border-t border-white/10 text-white/90"
                          >
                            <td className="px-3 py-3">{offer.store}</td>
                            <td className="px-3 py-3">
                              {Number.isFinite(offer.price)
                                ? formatMoney(offer.price)
                                : "-"}
                            </td>
                            <td className="px-3 py-3">
                              {formatMoney(offer.shippingCost)}{" "}
                              {Number.isFinite(offer.shippingDays)
                                ? `- ${offer.shippingDays}d`
                                : ""}
                            </td>
                            <td className="px-3 py-3 font-semibold text-accent">
                              {formatMoney(offer.total)}
                            </td>
                            <td className="px-3 py-3">
                              {Number.isFinite(offer.rating)
                                ? offer.rating.toFixed(1)
                                : "-"}
                            </td>
                            <td className="px-3 py-3">
                              <a
                                className="text-accent hover:underline"
                                href={offer.buyLink}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Buy
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))}
            </div>
        </div>
      </section>

      <div className="fixed right-4 top-6 z-40 flex flex-col gap-3">
        <button
          type="button"
          className="rounded-full border border-accent/60 bg-panel/80 px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-accent shadow-glow transition hover:bg-accent/10"
          onClick={() => setDropshipOpen((open) => !open)}
        >
          Dropship
        </button>
        <button
          type="button"
          className="rounded-full border border-accent/60 bg-panel/80 px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-accent shadow-glow transition hover:bg-accent/10"
          onClick={() => setCommunityOpen((open) => !open)}
        >
          Community
        </button>
      </div>

      <div
        className={`fixed inset-0 z-40 bg-black/60 transition ${
          dropshipOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setDropshipOpen(false)}
      />

      <div
        className={`fixed inset-0 z-40 bg-black/60 transition ${
          communityOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setCommunityOpen(false)}
      />

      <aside
        className={`fixed left-1/2 top-0 z-50 w-full max-w-4xl -translate-x-1/2 transform border-b border-white/10 bg-panel/95 p-6 shadow-2xl transition overflow-y-auto ${
          dropshipOpen ? "translate-y-0" : "-translate-y-full"
        }`}
        style={{ maxHeight: "75vh" }}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">
            Dropshipping
          </p>
          <button
            type="button"
            className="rounded-lg border border-white/10 px-2 py-1 text-xs text-muted transition hover:border-accent/40"
            onClick={() => setDropshipOpen(false)}
          >
            Close
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm">
          <button
            type="button"
            className="w-full rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-left text-sm font-semibold text-accent"
          >
            Do you work in dropshipping?
          </button>
          <div>
            <label className="block text-muted">Target country</label>
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-accent"
              placeholder="Example: Egypt, Saudi Arabia, UAE"
              value={dropshipCountry}
              onChange={(event) => setDropshipCountry(event.target.value)}
            />
          </div>
          <div>
            <label className="block text-muted">Store category</label>
            <select
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-accent"
              value={dropshipCategory}
              onChange={(event) => setDropshipCategory(event.target.value)}
            >
              <option value="electronics">Electronics</option>
              <option value="fashion">Clothing</option>
              <option value="shoes">Shoes</option>
            </select>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Plans</p>
          <div className="mt-4 space-y-2 text-sm">
            <button
              type="button"
              aria-disabled="true"
              className={`w-full cursor-default rounded-xl border px-4 py-3 text-left transition ${
                selectedPlan === "free"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-white/10 text-white/80 hover:border-accent/40"
              }`}
            >
              <div className="text-sm font-semibold">Free plan - $0</div>
              <div className="mt-2 space-y-1 text-xs text-muted">
                <p>5 stores compared</p>
                <p>10 searches per day</p>
                <p>Price refresh every 24 hours</p>
              </div>
            </button>
            <button
              type="button"
              aria-disabled="true"
              className={`w-full cursor-default rounded-xl border px-4 py-3 text-left transition ${
                selectedPlan === "standard"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-white/10 text-white/80 hover:border-accent/40"
              }`}
            >
              <div className="text-sm font-semibold">Standard plan - $1</div>
              <div className="mt-2 space-y-1 text-xs text-muted">
                <p>10 stores compared</p>
                <p>200 searches per month</p>
                <p>Price refresh every 6 hours</p>
                <p>2 active price alerts</p>
              </div>
            </button>
            <button
              type="button"
              aria-disabled="true"
              className={`w-full cursor-default rounded-xl border px-4 py-3 text-left transition ${
                selectedPlan === "pro"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-white/10 text-white/80 hover:border-accent/40"
              }`}
            >
              <div className="text-sm font-semibold">Pro plan - $3</div>
              <div className="mt-2 space-y-1 text-xs text-muted">
                <p>15 stores compared</p>
                <p>Unlimited searches</p>
                <p>Price refresh every hour</p>
                <p>Unlimited alerts + CSV export</p>
              </div>
            </button>
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-muted">
            Manage your plan from the account menu -> Plans.
          </div>
        </div>
      </aside>

      <aside
        className={`fixed inset-0 z-50 w-full transform border-b border-white/10 bg-panel/95 p-6 shadow-2xl transition overflow-y-auto ${
          communityOpen ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">
            Community
          </p>
          <button
            type="button"
            className="rounded-lg border border-white/10 px-2 py-1 text-xs text-muted transition hover:border-accent/40"
            onClick={() => setCommunityOpen(false)}
          >
            Close
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[180px_1fr]">
          <div className="space-y-2">
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted">
                Channels
              </p>
              {CHAT_CHANNELS.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  className={`w-full rounded-xl border px-4 py-3 text-left text-xs transition ${
                    activeChatType === "channel" && activeChatId === thread.id
                      ? "border-accent/60 bg-accent/10 text-accent"
                      : "border-white/10 text-white/80 hover:border-accent/40"
                  }`}
                  onClick={() => {
                    setActiveChatType("channel");
                    setActiveChatId(thread.id);
                    setReplyTarget(null);
                  }}
                >
                  {thread.name}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted">
                Private
              </p>
              {dmPeers.length === 0 && (
                <div className="text-[11px] text-white/40">
                  No private chats yet.
                </div>
              )}
              {dmPeers.map((peer) => (
                <button
                  key={peer.id}
                  type="button"
                  className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${
                    activeChatType === "dm" && activeChatId === peer.id
                      ? "border-accent/60 bg-accent/10 text-accent"
                      : "border-white/10 text-white/80 hover:border-accent/40"
                  }`}
                  onClick={() => {
                    setActiveChatType("dm");
                    setActiveChatId(peer.id);
                    setReplyTarget(null);
                    markPeerRead(peer.id);
                  }}
                >
                  <img
                    src={getAvatarUrl(peer.name)}
                    alt={getDisplayName(peer.name)}
                    className="h-6 w-6 rounded-full border border-white/10 bg-black/40"
                    loading="lazy"
                  />
                  <span className="truncate">{getDisplayName(peer.name)}</span>
                  {dmUnreadCounts[peer.id] ? (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-semibold text-black">
                      {dmUnreadCounts[peer.id]}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col">
            {activeChatType === "dm" && (
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/80">
                <img
                  src={getAvatarUrl(
                    dmPeers.find((peer) => peer.id === activeChatId)?.name
                  )}
                  alt="Private"
                  className="h-8 w-8 rounded-full border border-white/10 bg-black/40"
                />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-muted">
                    Private chat
                  </p>
                  <p className="text-sm text-white">
                    {getDisplayName(
                      dmPeers.find((peer) => peer.id === activeChatId)?.name
                    ) || "Private user"}
                  </p>
                </div>
              </div>
            )}
            <div
              ref={chatScrollRef}
              className="h-[60vh] max-h-[70vh] space-y-2 overflow-y-scroll rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-white/80 pr-2 scrollbar-visible"
            >
              {activeMessages.length === 0 && (
                <div className="text-xs text-muted">
                  No messages yet. Start the conversation.
                </div>
              )}
              {activeMessages.map((msg) => {
                const name = getDisplayName(msg.user_name || "Guest");
                const currentId = chatId || localStorage.getItem("ph_chat_id");
                const isSelf = msg.user_id === currentId;
                return (
                  <div
                    key={msg.id}
                    className={`flex w-full items-start gap-3 ${
                      isSelf ? "text-left" : "flex-row-reverse text-right"
                    } ${msg.pending ? "text-white/50" : "text-white/90"}`}
                  >
                    <img
                      src={getAvatarUrl(name)}
                      alt={name}
                      className="h-8 w-8 rounded-full border border-white/10 bg-black/40 cursor-pointer"
                      loading="lazy"
                      onClick={() => {
                        if (isSelf) {
                          return;
                        }
                        setAvatarMenuId((prev) => (prev === msg.id ? null : msg.id));
                      }}
                    />
                    <div className="relative max-w-[75%]">
                      {!isSelf && (
                        <button
                          type="button"
                          className="absolute top-1/2 -translate-y-1/2 -left-8 rounded-full border border-white/10 bg-black/60 px-2 py-1 text-[10px] text-white/70 transition hover:border-accent/40 hover:text-accent"
                          onClick={() =>
                            setReplyTarget({
                              id: msg.id,
                              user_name: msg.user_name,
                              content: msg.content
                            })
                          }
                          aria-label="Reply"
                        >
                          ↩
                        </button>
                      )}
                      {avatarMenuId === msg.id && !isSelf && (
                        <div className="absolute -left-2 -top-8 rounded-lg border border-white/10 bg-black/80 px-2 py-1 text-[10px] text-white/80">
                          <button
                            type="button"
                            className="text-accent hover:underline"
                            onClick={() => {
                              const peerId = msg.user_id;
                              const peerName = msg.user_name || "Private user";
                              setDmPeers((prev) => {
                                if (prev.some((item) => item.id === peerId)) {
                                  return prev;
                                }
                                return [...prev, { id: peerId, name: peerName }];
                              });
                              setActiveChatType("dm");
                              setActiveChatId(peerId);
                              setAvatarMenuId(null);
                              setReplyTarget(null);
                            }}
                          >
                            Private
                          </button>
                        </div>
                      )}
                      <div
                        className={`rounded-xl px-3 py-2 leading-relaxed ${
                          isSelf
                            ? "bg-accent/20 text-accent"
                            : "bg-black/50 text-white/90"
                        }`}
                      >
                        {msg.reply_to_name && msg.reply_to_content && (
                          <div className="mb-2 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-white/70">
                            Replying to{" "}
                            <span className="font-semibold text-accent/80">
                              {msg.reply_to_name}
                            </span>
                            : {msg.reply_to_content}
                          </div>
                        )}
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSendChat();
                  }
                }}
                placeholder="Message the community..."
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none transition focus:border-accent"
              />
              <button
                type="button"
                className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black transition hover:brightness-110"
                onClick={handleSendChat}
                disabled={!supabase}
              >
                Send
              </button>
            </div>
            {replyTarget && (
              <div className="mt-2 flex items-center justify-between rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-[11px] text-accent">
                <span>
                  Replying to {replyTarget.user_name || "Guest"}:{" "}
                  {replyTarget.content}
                </span>
                <button
                  type="button"
                  className="text-[10px] uppercase tracking-[0.2em] text-accent/80"
                  onClick={() => setReplyTarget(null)}
                >
                  Cancel
                </button>
              </div>
            )}
            {!supabase && (
              <p className="mt-2 text-[10px] text-amber-200/80">
                Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable
                community chat.
              </p>
            )}
            {supabase && (
              <p className="mt-2 text-[10px] text-muted">
                Community chat is live. Messages sync across accounts in real
                time.
              </p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
