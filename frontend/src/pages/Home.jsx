import { useEffect, useRef, useState } from "react";

const DEFAULT_QUERY = "wireless earbuds";

const sortOptions = [
  { value: "cheapest", label: "Cheapest Total" },
  { value: "rating", label: "Best Rating" },
  { value: "shipping", label: "Fastest Shipping" }
];

const formatMoney = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);

export default function Home() {
  const apiBase =
    import.meta.env.VITE_API_BASE ||
    (window.location.hostname === "localhost" ? "http://localhost:3001" : "");
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [sort, setSort] = useState("cheapest");
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [dropshipOpen, setDropshipOpen] = useState(false);
  const [dropshipCountry, setDropshipCountry] = useState("");
  const [dropshipCategory, setDropshipCategory] = useState("electronics");
  const [selectedPlan, setSelectedPlan] = useState("free");
  const fileInputRef = useRef(null);

  const fetchProducts = async (overrideQuery = query, overrideSort = sort) => {
    setStatus("loading");
    setMessage("");

    try {
      // Backend endpoint handles filtering + sorting on mock store data.
      const response = await fetch(
        `${apiBase}/api/products/search?q=${encodeURIComponent(
          overrideQuery
        )}&sort=${overrideSort}`
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

            <div className="mt-8 grid gap-6 md:grid-cols-2">
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

                  <img
                    src={product.image}
                    alt={product.name}
                    className="mt-6 h-48 w-full rounded-xl object-cover"
                    loading="lazy"
                  />

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
                              {formatMoney(offer.price)}
                            </td>
                            <td className="px-3 py-3">
                              {formatMoney(offer.shippingCost)} -{" "}
                              {offer.shippingDays}d
                            </td>
                            <td className="px-3 py-3 font-semibold text-accent">
                              {formatMoney(offer.total)}
                            </td>
                            <td className="px-3 py-3">
                              {offer.rating.toFixed(1)}
                            </td>
                            <td className="px-3 py-3">
                              <a
                                className="text-accent hover:underline"
                                href={offer.buyLink}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Visit
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

      <button
        type="button"
        className="fixed right-4 top-6 z-40 rounded-full border border-accent/60 bg-panel/80 px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-accent shadow-glow transition hover:bg-accent/10"
        onClick={() => setDropshipOpen((open) => !open)}
      >
        Dropship
      </button>

      <div
        className={`fixed inset-0 z-40 bg-black/60 transition ${
          dropshipOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setDropshipOpen(false)}
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
              className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                selectedPlan === "free"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-white/10 text-white/80 hover:border-accent/40"
              }`}
              onClick={() => setSelectedPlan("free")}
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
              className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                selectedPlan === "starter"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-white/10 text-white/80 hover:border-accent/40"
              }`}
              onClick={() => setSelectedPlan("starter")}
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
              className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                selectedPlan === "pro"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-white/10 text-white/80 hover:border-accent/40"
              }`}
              onClick={() => setSelectedPlan("pro")}
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
            Plans activate after payment confirmation.
          </div>
        </div>
      </aside>
    </div>
  );
}
