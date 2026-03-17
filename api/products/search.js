const DEFAULT_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const mockProducts = [
  {
    id: "ph-1001",
    name: "Aurora ANC Wireless Earbuds",
    description:
      "Hybrid noise canceling, 28-hour battery, and spatial sound optimized for travel.",
    image:
      "https://images.unsplash.com/photo-1518441987617-1eae7a16b253?auto=format&fit=crop&w=1200&q=80",
    offers: [
      {
        store: "Amazon",
        price: 89.99,
        shippingCost: 4.99,
        shippingDays: 2,
        rating: 4.6,
        buyLink: "https://www.amazon.com/"
      },
      {
        store: "AliExpress",
        price: 74.5,
        shippingCost: 7.99,
        shippingDays: 7,
        rating: 4.3,
        buyLink: "https://www.aliexpress.com/"
      },
      {
        store: "Jumia",
        price: 82.0,
        shippingCost: 5.5,
        shippingDays: 4,
        rating: 4.4,
        buyLink: "https://www.jumia.com/"
      }
    ]
  },
  {
    id: "ph-1002",
    name: "Nimbus Smartwatch Pro",
    description:
      "AMOLED display, advanced health tracking, and 10-day battery life.",
    image:
      "https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=1200&q=80",
    offers: [
      {
        store: "Amazon",
        price: 149.0,
        shippingCost: 0.0,
        shippingDays: 3,
        rating: 4.7,
        buyLink: "https://www.amazon.com/"
      },
      {
        store: "AliExpress",
        price: 132.5,
        shippingCost: 6.25,
        shippingDays: 9,
        rating: 4.2,
        buyLink: "https://www.aliexpress.com/"
      },
      {
        store: "Jumia",
        price: 139.99,
        shippingCost: 3.99,
        shippingDays: 5,
        rating: 4.5,
        buyLink: "https://www.jumia.com/"
      }
    ]
  },
  {
    id: "ph-1003",
    name: "Lumen 4K Action Camera",
    description: "Waterproof to 30m, ultra-wide lens, and AI stabilization.",
    image:
      "https://images.unsplash.com/photo-1519183071298-a2962be96c8f?auto=format&fit=crop&w=1200&q=80",
    offers: [
      {
        store: "Amazon",
        price: 189.0,
        shippingCost: 6.5,
        shippingDays: 2,
        rating: 4.8,
        buyLink: "https://www.amazon.com/"
      },
      {
        store: "AliExpress",
        price: 160.0,
        shippingCost: 9.99,
        shippingDays: 10,
        rating: 4.1,
        buyLink: "https://www.aliexpress.com/"
      },
      {
        store: "Jumia",
        price: 172.25,
        shippingCost: 5.0,
        shippingDays: 6,
        rating: 4.4,
        buyLink: "https://www.jumia.com/"
      }
    ]
  },
  {
    id: "ph-1004",
    name: "PulseFit Adjustable Dumbbell Set",
    description:
      "5-in-1 weight selector with compact storage tray for home gyms.",
    image:
      "https://images.unsplash.com/photo-1599058917212-d750089bc07c?auto=format&fit=crop&w=1200&q=80",
    offers: [
      {
        store: "Amazon",
        price: 219.0,
        shippingCost: 12.0,
        shippingDays: 4,
        rating: 4.5,
        buyLink: "https://www.amazon.com/"
      },
      {
        store: "AliExpress",
        price: 198.0,
        shippingCost: 18.5,
        shippingDays: 12,
        rating: 4.0,
        buyLink: "https://www.aliexpress.com/"
      },
      {
        store: "Jumia",
        price: 210.0,
        shippingCost: 10.0,
        shippingDays: 7,
        rating: 4.3,
        buyLink: "https://www.jumia.com/"
      }
    ]
  }
];

const manualProducts = [
  {
    id: "man-1001",
    name: "Wireless Earbuds Pro",
    description: "Bluetooth 5.3, noise reduction, 30-hour battery case.",
    image: "https://source.unsplash.com/clrTR7gDRho/1200x800",
    offers: [
      {
        store: "AliExpress",
        price: 19.99,
        shippingCost: 3.0,
        shippingDays: 8,
        rating: 4.4,
        buyLink: "https://www.aliexpress.com/"
      }
    ]
  },
  {
    id: "man-1002",
    name: "Smart Fitness Watch",
    description: "Heart rate, sleep tracking, waterproof, 7-day battery.",
    image: "https://source.unsplash.com/CAeegpdI3pY/1200x800",
    offers: [
      {
        store: "CJdropshipping",
        price: 24.5,
        shippingCost: 4.2,
        shippingDays: 10,
        rating: 4.1,
        buyLink: "https://cjdropshipping.com/"
      }
    ]
  }
];

const storeSearchTargets = [
  {
    store: "Amazon",
    searchUrl: (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}`
  },
  {
    store: "Noon",
    searchUrl: (q) => `https://www.noon.com/search/?q=${encodeURIComponent(q)}`
  },
  {
    store: "AliExpress",
    searchUrl: (q) =>
      `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(q)}`
  },
  {
    store: "Alibaba",
    searchUrl: (q) =>
      `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(q)}`
  },
  {
    store: "DHgate",
    searchUrl: (q) =>
      `https://www.dhgate.com/wholesale/search.do?searchkey=${encodeURIComponent(q)}`
  },
  {
    store: "Banggood",
    searchUrl: (q) =>
      `https://www.banggood.com/search/${encodeURIComponent(q)}.html`
  },
  {
    store: "CJdropshipping",
    searchUrl: (q) =>
      `https://cjdropshipping.com/search?search=${encodeURIComponent(q)}`
  },
  {
    store: "Spocket",
    searchUrl: (q) => `https://www.spocket.co/search?q=${encodeURIComponent(q)}`
  },
  {
    store: "Zendrop",
    searchUrl: (q) => `https://www.zendrop.com/search?q=${encodeURIComponent(q)}`
  },
  {
    store: "DSers",
    searchUrl: (q) =>
      `https://www.dsers.com/places/search?keyword=${encodeURIComponent(q)}`
  },
  {
    store: "SaleHoo",
    searchUrl: (q) => `https://www.salehoo.com/search?query=${encodeURIComponent(q)}`
  },
  {
    store: "Worldwide Brands",
    searchUrl: (q) =>
      `https://www.worldwidebrands.com/search?query=${encodeURIComponent(q)}`
  },
  {
    store: "Syncee",
    searchUrl: (q) => `https://syncee.co/?s=${encodeURIComponent(q)}`
  },
  {
    store: "Modalyst",
    searchUrl: (q) => `https://www.modalyst.co/search?q=${encodeURIComponent(q)}`
  },
  {
    store: "AutoDS",
    searchUrl: (q) =>
      `https://autods.com/product-research?keywords=${encodeURIComponent(q)}`
  },
  {
    store: "Doba",
    searchUrl: (q) => `https://www.doba.com/product/search?query=${encodeURIComponent(q)}`
  },
  {
    store: "Wholesale2B",
    searchUrl: (q) =>
      `https://www.wholesale2b.com/search?query=${encodeURIComponent(q)}`
  }
];

const computeOfferTotals = (offer) => ({
  ...offer,
  total: Number((offer.price + offer.shippingCost).toFixed(2))
});

const computeProductMetrics = (product) => {
  const offersWithTotals = product.offers.map(computeOfferTotals);
  const totals = offersWithTotals.map((offer) => offer.total);
  const ratings = offersWithTotals.map((offer) => offer.rating);
  const shipping = offersWithTotals.map((offer) => offer.shippingDays);

  return {
    ...product,
    offers: offersWithTotals,
    lowestTotal: totals.length ? Math.min(...totals) : null,
    bestRating: ratings.length ? Math.max(...ratings) : null,
    fastestShipping: shipping.length ? Math.min(...shipping) : null
  };
};

const searchProducts = (query) => {
  const combined = [...manualProducts, ...mockProducts];
  if (!query) {
    return combined.map(computeProductMetrics);
  }

  const normalized = query.toLowerCase();
  return combined
    .filter(
      (product) =>
        product.name.toLowerCase().includes(normalized) ||
        product.description.toLowerCase().includes(normalized)
    )
    .map(computeProductMetrics);
};

const generateStoreSearchResults = (query) => {
  if (!query) {
    return [];
  }

  const offers = storeSearchTargets.map((target) => ({
    store: target.store,
    price: null,
    shippingCost: null,
    shippingDays: null,
    rating: null,
    buyLink: target.searchUrl(query)
  }));

  return [
    {
      id: `store-bundle-${encodeURIComponent(query)}`,
      name: query,
      description: `Best matching stores for "${query}".`,
      image: `https://source.unsplash.com/featured/?${encodeURIComponent(query)}`,
      offers,
      lowestTotal: null,
      bestRating: null,
      fastestShipping: null
    }
  ];
};

const sortProducts = (products, sort) => {
  const sorted = [...products];
  const safeNumber = (value, fallback) =>
    Number.isFinite(value) ? value : fallback;

  if (sort === "rating") {
    sorted.sort(
      (a, b) => safeNumber(b.bestRating, -1) - safeNumber(a.bestRating, -1)
    );
    return sorted;
  }

  if (sort === "shipping") {
    sorted.sort(
      (a, b) =>
        safeNumber(a.fastestShipping, Infinity) -
        safeNumber(b.fastestShipping, Infinity)
    );
    return sorted;
  }

  sorted.sort(
    (a, b) =>
      safeNumber(a.lowestTotal, Infinity) - safeNumber(b.lowestTotal, Infinity)
  );
  return sorted;
};

module.exports = (req, res) => {
  Object.entries(DEFAULT_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const query = url.searchParams.get("q") || "";
  const sort = url.searchParams.get("sort") || "cheapest";
  const market = url.searchParams.get("market") || "eg";
  const source = url.searchParams.get("source") || "stores";

  let results = [];
  try {
    if (source === "manual" || source === "mock") {
      results = searchProducts(query);
    } else {
      results = generateStoreSearchResults(query);
    }
  } catch (error) {
    results = searchProducts(query);
  }

  const sortedResults = sortProducts(results, sort);
  res.setHeader("Content-Type", "application/json");
  res.statusCode = 200;
  res.end(
    JSON.stringify({
      query,
      sort,
      market,
      source,
      count: sortedResults.length,
      products: sortedResults
    })
  );
};
