const CSE_BASE_URL = "https://www.googleapis.com/customsearch/v1";

const getCseConfig = () => ({
  apiKey: process.env.GOOGLE_CSE_API_KEY,
  cx: process.env.GOOGLE_CSE_CX
});

export const getCseStatus = () => {
  const { apiKey, cx } = getCseConfig();
  return { ready: Boolean(apiKey && cx) };
};

const mapCseItem = (item) => {
  const image =
    item?.pagemap?.cse_image?.[0]?.src ||
    item?.pagemap?.cse_thumbnail?.[0]?.src ||
    "";

  return {
    id: item?.cacheId || item?.link,
    name: item?.title || "Product result",
    description: item?.snippet || "Search result from the web.",
    image,
    offers: [
      {
        store: item?.displayLink || "Store",
        price: null,
        shippingCost: null,
        shippingDays: null,
        rating: null,
        buyLink: item?.link || "#"
      }
    ],
    lowestTotal: null,
    bestRating: null,
    fastestShipping: null
  };
};

export const searchGoogleCse = async (query, options = {}) => {
  const { apiKey, cx } = getCseConfig();
  if (!apiKey || !cx || !query) {
    return [];
  }

  const desiredCount = Math.min(options.count || 20, 30);
  const results = [];

  for (let start = 1; start <= desiredCount; start += 10) {
    const url = new URL(CSE_BASE_URL);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("cx", cx);
    url.searchParams.set("q", query);
    url.searchParams.set("num", String(Math.min(10, desiredCount - results.length)));
    url.searchParams.set("start", String(start));

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Google CSE failed with status ${response.status}`);
    }

    const payload = await response.json();
    const items = payload?.items || [];
    results.push(...items.map(mapCseItem));

    if (results.length >= desiredCount) {
      break;
    }
  }

  return results.slice(0, desiredCount);
};
