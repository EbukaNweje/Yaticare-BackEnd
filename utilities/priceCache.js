const axios = require("axios");

class PriceCache {
  constructor() {
    this.cache = new Map();
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    this.lastRequestTime = 0;
    this.MIN_REQUEST_INTERVAL = 10000; // 10 seconds between requests
  }

  async getUSDTToNGNRate() {
    const cacheKey = "usdt-ngn";
    const now = Date.now();

    // Check if we have cached data that's still valid
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (now - cached.timestamp < this.CACHE_DURATION) {
        console.log("Using cached USDT rate:", cached.rate);
        return cached.rate;
      }
    }

    // Rate limiting - don't make requests too frequently
    if (now - this.lastRequestTime < this.MIN_REQUEST_INTERVAL) {
      console.log("Rate limited - using cached or fallback rate");
      const cached = this.cache.get(cacheKey);
      return cached ? cached.rate : 1650; // fallback rate
    }

    try {
      console.log("Fetching fresh USDT rate from CoinGecko...");
      this.lastRequestTime = now;

      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=ngn`,
        {
          timeout: 15000,
          headers: {
            Accept: "application/json",
            "User-Agent": "CryptoApp/1.0",
          },
        }
      );

      const rate = Number(response.data.tether.ngn);

      // Cache the result
      this.cache.set(cacheKey, {
        rate: rate,
        timestamp: now,
      });

      console.log("Fresh USDT rate cached:", rate);
      return rate;
    } catch (error) {
      console.log("CoinGecko API error:", error.message);

      // Try to use cached data even if expired
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        console.log("Using expired cached rate due to API error:", cached.rate);
        return cached.rate;
      }

      // Final fallback
      console.log("Using hardcoded fallback rate: 1650");
      return 1650;
    }
  }

  // Method to manually update the fallback rate
  updateFallbackRate(newRate) {
    const cacheKey = "usdt-ngn";
    this.cache.set(cacheKey, {
      rate: newRate,
      timestamp: Date.now(),
    });
    console.log("Manually updated USDT rate:", newRate);
  }
}

// Export singleton instance
module.exports = new PriceCache();
