"use strict";

import axios, { AxiosInstance, AxiosResponse } from "axios";
import querystring from "querystring";
import address from "address";
import publicIp from "public-ip";

const API: {
  [key: string]: string | boolean | number;
  root: string;
  login: string;
  debug: boolean;
  timeout: number;
  user_login: string;
  generate_token: string;

  logout: string;

  margin_api: string;
} = {
  root: "https://apiconnect.angelbroking.com",
  login: "https://smartapi.angelbroking.com/publisher-login",
  debug: false,
  timeout: 7000,

  user_login: "/rest/auth/angelbroking/user/v1/loginByPassword",
  generate_token: "/rest/auth/angelbroking/jwt/v1/generateTokens",
  logout: "/rest/secure/angelbroking/user/v1/logout",

  candle_data: "/rest/secure/angelbroking/historical/v1/getCandleData",
  market_data: "/rest/secure/angelbroking/market/v1/quote",
  search_scrip: "/rest/secure/angelbroking/order/v1/searchScrip",
  get_all_holding: "/rest/secure/angelbroking/portfolio/v1/getAllHolding",
  ind_order_details: "/rest/secure/angelbroking/order/v1/details",
  margin_api: "rest/secure/angelbroking/margin/v1/batch",
  gainers_losers: "/rest/secure/angelbroking/marketData/v1/gainersLosers",
};

interface SmartApiParams {
  totp?: string;
  api_key: string;
  client_code?: string | null;
  root?: string;
  timeout?: number;
  debug?: boolean;
  access_token?: string | null;
  refresh_token?: string | null;
  default_login_uri?: string;
  session_expiry_hook?: (() => void) | null;
}

interface AddressInfo {
  ip: string;
  mac: string;
}

interface ErrorResponse {
  status: number;
  message: string;
}

interface Gainer {
  symbol: string; // Replace with actual fields
  priceChangePercentage: number;
  type: string;
  // Add any other relevant fields here
}

class SmartApi {
  private totp: string;
  private api_key: string;
  private client_code: string | null;
  private root: string;
  private timeout: number;
  private debug: boolean;
  private access_token: string | null;
  private refresh_token: string | null;
  private feed_token: string | null;
  private default_login_uri: string;
  private session_expiry_hook: (() => void) | null;

  private local_ip: string | null = null;
  private mac_addr: string | null = null;
  private public_ip: string | null = null;

  private requestInstance: AxiosInstance;

  constructor(params: SmartApiParams) {
    this.totp = params.totp!;
    this.api_key = params.api_key;
    this.client_code = params.client_code || null;
    this.root = params.root || API.root;
    this.timeout = params.timeout || API.timeout;
    this.debug = params.debug || API.debug;
    this.access_token = params.access_token || null;
    this.refresh_token = params.refresh_token || null;
    this.feed_token = null;
    this.default_login_uri = API.login;
    this.session_expiry_hook = null;

    // Set default values immediately (used if async resolution fails)
    this.local_ip = "192.168.168.168";
    this.mac_addr = "fe80::216e:6507:4b90:3719";
    this.public_ip = "0.0.0.0";

    // Resolve actual values asynchronously
    address((err: any, addrs: AddressInfo | undefined) => {
      if (addrs) {
        this.local_ip = addrs.ip || this.local_ip;
        this.mac_addr = addrs.mac || this.mac_addr;
      }
    });

    publicIp.v4().then((ip) => {
      this.public_ip = ip;
    }).catch(() => {
      // Keep default if public IP resolution fails
    });

    this.requestInstance = axios.create({
      baseURL: this.root,
      timeout: this.timeout,
      paramsSerializer: (params) => {
        return querystring.stringify(params);
      },
    });

    this.requestInstance.defaults.headers.post["Content-Type"] =
      "application/json";
    this.requestInstance.defaults.headers.put["Content-Type"] =
      "application/json";

    // Set IP/MAC headers dynamically on each request (to use resolved values)
    this.requestInstance.interceptors.request.use((request) => {
      request.headers["X-ClientLocalIP"] = this.local_ip;
      request.headers["X-ClientPublicIP"] = this.public_ip;
      request.headers["X-MACAddress"] = this.mac_addr;
      if (this.debug) console.log(request);
      return request;
    });

    this.requestInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        try {
          if (this.debug) console.log(response);
          if (response?.status === 200) {
            if (response?.data?.success || response?.data?.status) {
              return response.data;
            } else {
              if (
                response?.data?.errorCode === "AG8001" &&
                this.session_expiry_hook !== null
              ) {
                this.session_expiry_hook();
              }

              return response?.data;
            }
          } else {
            return response?.data;
          }
        } catch (error) {
          return [];
        }
      },
      (error) => {
        try {
          const responseData = error?.response?.data;
          // If Angel returned a JSON response body, preserve it
          if (responseData && typeof responseData === "object") {
            return {
              ...responseData,
              status: responseData.status ?? error.response.status,
            };
          }
          let errorObj: ErrorResponse = {
            status: error?.response?.status || 500,
            message: typeof responseData === "string" ? responseData : (error?.response?.statusText || "Error"),
          };
          return errorObj;
        } catch (error) {
          return [];
        }
      }
    );
  }

  setAccessToken(access_token: string) {
    this.access_token = access_token;
  }

  setPublicToken(refresh_token: string) {
    this.refresh_token = refresh_token;
  }

  setClientCode(client_code: string) {
    this.client_code = client_code;
  }

  setSessionExpiryHook(cb: () => void) {
    this.session_expiry_hook = cb;
  }

  setFeedToken(feed_token: string | null) {
    this.feed_token = feed_token;
  }

  getFeedToken(): string | null {
    return this.feed_token;
  }

  getAccessToken(): string | null {
    return this.access_token;
  }

  getClientCode(): string | null {
    return this.client_code;
  }

  getApiKey(): string {
    return this.api_key;
  }

  async generateSession(client_code: string, password: string, totp: string) {
    let params = {
      clientcode: client_code,
      password: password,
      totp: totp,
    };

    console.log(`🔐 Attempting login for client: ${client_code}, TOTP: ${totp}`);

    try {
      const response = await this.postRequest("user_login", params);
      
      console.log(`🔐 Login response:`, JSON.stringify(response, null, 2));

      if (response.status && response.data?.jwtToken) {
        this.setClientCode(client_code);
        this.setAccessToken(response.data.jwtToken);
        this.setPublicToken(response.data.refreshToken);
        this.setFeedToken(response.data.feedToken || null);
        console.log(`✅ Login successful for client: ${client_code}`);
      } else {
        console.error(`❌ Login failed:`, (response as any).message || (response as any).errorcode || "Unknown error");
      }

      return response;
    } catch (err) {
      console.error(`❌ Login exception:`, err);
      throw err;
    }
  }

  getLoginURL() {
    return this.default_login_uri + "?api_key=" + this.api_key;
  }

  generateToken(refresh_token: string) {
    let token_data = this.postRequest("generate_token", {
      refreshToken: refresh_token,
    });

    token_data.then(async (response) => {
      if (response.status) {
        this.setAccessToken(response.data.jwtToken);
        this.setPublicToken((await token_data).data.refreshToken);
      }
    });

    return token_data;
  }

  logout(client_code: string | null) {
    if (client_code != null)
      return this.postRequest("logout", { clientcode: client_code });
    else
      return {
        status: 500,
        message: "Client Code is required.",
      };
  }

  marketData(params: object) {
    return this.postRequest("market_data", params);
  }

  async getMarketData({
    exchange,
    symboltoken,
    interval,
    fromdate,
    todate,
  }: {
    exchange: string;
    symboltoken: string;
    interval: string;
    fromdate: string;
    todate: string;
  }) {
    try {
      // Constructing the request body
      const params = {
        exchange,
        symboltoken,
        interval,
        fromdate,
        todate,
      };
  
      const response = await this.postRequest("candle_data", params); // Change endpoint as needed
      return response; // Return the response
    } catch (error) {
      console.error("Error fetching market data:", error);
      throw error; // Re-throw the error after logging it
    }
  }

  // Method to get Gainers/Losers
  // getGainersLosers(datatype: string) {
  //   const params = {
  //     datatype: datatype, // "PercPriceGainers" or "PercPriceLosers"
  //     expirytype: "NEAR", // Can be adjusted based on data requirement
  //   };
  //   return this.postRequest("gainers_losers", params);
  // }

  // // Example for fetching top gainers
  // async fetchTopGainers() {
  //   try {
  //     const response = await this.getGainersLosers("PercPriceGainers");
  //     console.log("Raw gainers response: ", response); // Log the full response
  //     const equityGainers = response.data.filter((gainer: any) => gainer.type === "equity");
  //     console.log("Equity gainers: ", equityGainers); // Log filtered equity gainers
  //     return equityGainers; // Return only equity gainers
  //   } catch (error) {
  //     console.error("Error fetching gainers", error);
  //     return;
  //   }
  // }

  // // Example for fetching top losers
  // async fetchTopLosers() {
  //   try {
  //     const response = await this.getGainersLosers("PercPriceLosers");
  //     console.log("losers: ", response); // Handle the response (e.g., display on homepage)
  //   } catch (error) {
  //     console.error("Error fetching losers", error);
  //   }
  // }

  private postRequest(
    route: string,
    params: object,
    responseType?: any,
    responseTransformer?: any
  ) {
    return this.requestUtil(
      route,
      "POST",
      params || {},
      responseType,
      responseTransformer
    );
  }

  private requestUtil(
    route: string,
    method: string,
    params: object,
    responseType?: any,
    responseTransformer?: any
  ) {
    let url = API[route],
      payload = null;

    if (method !== "GET" && method !== "DELETE") {
      payload = params;
    }

    let options: {
      transformResponse: any;
      method: string;
      url: any;
      data: string;
      headers: {
        [key: string]: string;
      };
    } = {
      method: method,
      url: url,
      data: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-UserType": "USER",
        "X-SourceID": "WEB",
        "X-PrivateKey": this.api_key,
      },
      transformResponse: undefined,
    };

    if (this.access_token) {
      options["headers"]["Authorization"] = "Bearer " + this.access_token;
    }

    if (responseTransformer) {
      if (axios.defaults.transformResponse) {
        if (Array.isArray(axios.defaults.transformResponse)) {
          options.transformResponse = [
            ...axios.defaults.transformResponse,
            responseTransformer,
          ];
        } else {
          options.transformResponse = [
            axios.defaults.transformResponse,
            responseTransformer,
          ];
        }
      } else {
        options.transformResponse = responseTransformer;
      }
    }

    return this.requestInstance.request(options as any);
  }
}

export default SmartApi;
