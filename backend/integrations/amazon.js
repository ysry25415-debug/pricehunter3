const AMAZON_MARKETS = {
  eg: {
    domain: "amazon.eg",
    envPrefix: "AMAZON_EG"
  },
  sa: {
    domain: "amazon.sa",
    envPrefix: "AMAZON_SA"
  },
  uk: {
    domain: "amazon.co.uk",
    envPrefix: "AMAZON_UK"
  }
};

const getMarketConfig = (market) => {
  const marketKey = market in AMAZON_MARKETS ? market : "eg";
  const { domain, envPrefix } = AMAZON_MARKETS[marketKey];

  return {
    market: marketKey,
    domain,
    tag: process.env[`${envPrefix}_ASSOC_TAG`],
    accessKey: process.env[`${envPrefix}_ACCESS_KEY`],
    secretKey: process.env[`${envPrefix}_SECRET_KEY`],
    region: process.env[`${envPrefix}_REGION`],
    host: process.env[`${envPrefix}_HOST`] || domain
  };
};

export const getAmazonStatus = (market) => {
  const config = getMarketConfig(market);
  const ready =
    config.tag && config.accessKey && config.secretKey && config.region && config.host;

  return {
    market: config.market,
    domain: config.domain,
    ready
  };
};

// Placeholder connector: returns empty until credentials are configured.
export const searchAmazon = async (query, market = "eg") => {
  const config = getMarketConfig(market);

  const ready =
    config.tag && config.accessKey && config.secretKey && config.region && config.host;

  if (!ready) {
    return {
      market: config.market,
      source: "amazon",
      products: []
    };
  }

  // TODO: Implement Amazon API call once credentials are provided.
  return {
    market: config.market,
    source: "amazon",
    products: []
  };
};
