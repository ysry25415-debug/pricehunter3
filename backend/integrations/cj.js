const CJ_BASE_URL = "https://developers.cjdropshipping.com/api2.0/v1";

let cachedToken = null;
let cachedTokenExpiry = null;
let cachedRefreshToken = null;

const isTokenValid = () => {
  if (!cachedToken || !cachedTokenExpiry) {
    return false;
  }
  const expiresAt = new Date(cachedTokenExpiry).getTime();
  // Refresh 5 minutes before expiry to avoid edge cases.
  return Date.now() < expiresAt - 5 * 60 * 1000;
};

const requestAccessToken = async (apiKey) => {
  const response = await fetch(`${CJ_BASE_URL}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey })
  });

  if (!response.ok) {
    throw new Error(`CJ auth failed with status ${response.status}`);
  }

  const payload = await response.json();
  if (!payload?.data?.accessToken) {
    throw new Error("CJ auth did not return access token");
  }

  cachedToken = payload.data.accessToken;
  cachedTokenExpiry = payload.data.accessTokenExpiryDate;
  cachedRefreshToken = payload.data.refreshToken;
  return cachedToken;
};

const refreshAccessToken = async () => {
  if (!cachedRefreshToken) {
    return null;
  }

  const response = await fetch(`${CJ_BASE_URL}/authentication/refreshAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: cachedRefreshToken })
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  if (!payload?.data?.accessToken) {
    return null;
  }

  cachedToken = payload.data.accessToken;
  cachedTokenExpiry = payload.data.accessTokenExpiryDate;
  cachedRefreshToken = payload.data.refreshToken;
  return cachedToken;
};

const getCjToken = async (apiKey) => {
  if (isTokenValid()) {
    return cachedToken;
  }

  const refreshed = await refreshAccessToken();
  if (refreshed) {
    return refreshed;
  }

  return requestAccessToken(apiKey);
};

export const getCjStatus = () => {
  const apiKey = process.env.CJ_API_KEY;
  return {
    ready: Boolean(apiKey),
    hasToken: Boolean(cachedToken)
  };
};

const mapCjProductToCard = (item) => {
  const priceValue = Number(item?.nowPrice || item?.sellPrice || 0);
  const shippingDays = 7;
  const shippingCost = 0;

  return {
    id: item?.id || item?.sku,
    name: item?.nameEn || item?.name || "CJ Product",
    description: item?.description || item?.threeCategoryName || "CJdropshipping item",
    image: item?.bigImage || item?.productImage || "",
    offers: [
      {
        store: "CJdropshipping",
        price: priceValue,
        shippingCost,
        shippingDays,
        rating: 4.2,
        buyLink: "https://cjdropshipping.com/"
      }
    ],
    lowestTotal: priceValue + shippingCost,
    bestRating: 4.2,
    fastestShipping: shippingDays
  };
};

export const searchCjProducts = async (query, options = {}) => {
  const apiKey = process.env.CJ_API_KEY;
  if (!apiKey || !query) {
    return [];
  }

  const token = await getCjToken(apiKey);
  const page = options.page || 1;
  const size = options.size || 10;
  const currency = options.currency || "USD";

  const url = new URL(`${CJ_BASE_URL}/product/listV2`);
  url.searchParams.set("keyWord", query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("size", String(size));
  url.searchParams.set("currency", currency);
  url.searchParams.set("orderBy", "0");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { "CJ-Access-Token": token }
  });

  if (!response.ok) {
    throw new Error(`CJ product search failed with status ${response.status}`);
  }

  const payload = await response.json();
  const content = payload?.data?.content || [];
  const productList = content[0]?.productList || [];

  return productList.map(mapCjProductToCard);
};
