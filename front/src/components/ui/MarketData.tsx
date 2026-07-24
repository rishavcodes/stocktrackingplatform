'use client'

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface MarketDataItem {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdate: string | null;
}

interface MarketDataType {
  nifty: MarketDataItem;
  sensex: MarketDataItem;
  dow: MarketDataItem;
  gold: MarketDataItem;
}

const MarketData = () => {
  const [marketData, setMarketData] = useState<MarketDataType | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket("ws://localhost:8080/marketdata");

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        console.log("WebSocket connected");
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "marketData") {
            setMarketData(message.data);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log("WebSocket disconnected, attempting to reconnect...");
        // Reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (error) => {
        setIsConnected(false);
        setError("Connection failed - using demo data");
        // Fallback to demo data
        setMarketData({
          nifty: {
            symbol: "NIFTY 50",
            price: 21737.6,
            change: 45.3,
            changePercent: 0.21,
            lastUpdate: new Date().toISOString(),
          },
          sensex: {
            symbol: "SENSEX",
            price: 71595.53,
            change: -123.45,
            changePercent: -0.17,
            lastUpdate: new Date().toISOString(),
          },
          dow: {
            symbol: "DOW JONES",
            price: 39497.54,
            change: 201.23,
            changePercent: 0.51,
            lastUpdate: new Date().toISOString(),
          },
          gold: {
            symbol: "GOLD",
            price: 2034.7,
            change: -15.3,
            changePercent: -0.75,
            lastUpdate: new Date().toISOString(),
          },
        });
      };

      return ws;
    };

    const ws = connectWebSocket();

    return () => {
      ws.close();
    };
  }, []);

  const formatPrice = (price: number, symbol: string) => {
    if (symbol === "GOLD") {
      return `$${price.toFixed(2)}`;
    }
    return price.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatChange = (change: number, changePercent: number) => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
  };

  if (!marketData) {
    return (
      <motion.div
        className="bg-background/95 backdrop-blur-md border-b border-border/20 py-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card/50 rounded-lg p-3 animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-6 bg-muted rounded mb-1"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  const dataArray = [
    marketData.nifty,
    marketData.sensex,
    marketData.dow,
    marketData.gold,
  ];

  return (
    <div className="bg-background/95 backdrop-blur-md border-b border-border/20 py-4 pt-6">
      <div className="container mx-auto px-4">
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, staggerChildren: 0.1 }}
        >
          {dataArray.map((item, index) => {
            const isPositive = item.change >= 0;
            const TrendIcon = isPositive ? TrendingUp : TrendingDown;

            return (
              <motion.div
                key={item.symbol}
                className="bg-card/80 backdrop-blur-sm rounded-lg p-3 border border-border/30 hover:border-border/50 transition-all duration-300 relative market-data-card"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -2 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1">
                    <Activity className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground truncate">
                      {item.symbol}
                    </span>
                  </div>
                  <motion.div
                    animate={{
                      y: isPositive ? [-2, 2, -2] : [2, -2, 2],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <TrendIcon
                      className={`w-4 h-4 ${
                        isPositive ? "text-green-500" : "text-red-500"
                      }`}
                    />
                  </motion.div>
                </div>

                <div className="space-y-1">
                  <motion.div
                    className="text-lg font-bold text-foreground"
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    {formatPrice(item.price, item.symbol)}
                  </motion.div>
                  <div
                    className={`text-xs font-medium flex items-center space-x-1 ${
                      isPositive ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    <motion.span
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      {formatChange(item.change, item.changePercent)}
                    </motion.span>
                  </div>
                </div>

                {/* Animated background pulse */}
                <motion.div
                  className={`absolute inset-0 rounded-lg ${
                    isPositive ? "bg-green-500/5" : "bg-red-500/5"
                  }`}
                  animate={{
                    opacity: [0, 0.3, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </motion.div>
            );
          })}
        </motion.div>

        {/* Yahoo Finance Attribution */}
        <motion.div
          className="text-center text-xs text-muted-foreground mt-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          Powered by- Yahoo Finance
        </motion.div>

        {error && (
          <div className="text-center text-xs text-muted-foreground mt-2">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketData;
