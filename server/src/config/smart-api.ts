// import totp from "totp-generator";
// import SmartApi from "./angelConnect";
// // import { SmartAPI } from "smartapi-javascript";

// export let smart_api: SmartApi;
// // New instance to be exported for continuous use across files
// export let smartApiInstance: SmartApi;

// // export let smart_api: {
// //   generateSession: (
// //     arg0: string | undefined,
// //     arg1: string | undefined,
// //     arg2: string
// //   ) => any;
// //   marketData: (arg0: {
// //     mode: string;
// //     exchangeTokens: {
// //       NSE?: string[];
// //       BSE?: string[];
// //       MCX?: string[];
// //       NFO?: string[];
// //       BFO?: string[];
// //       CDS?: string[];
// //     };
// //   }) => any;
// // } | null = null;

// export async function initializeSmartAPISession() {
//   try {
//     const token = totp(process.env.TOTP as string);

//     smart_api = new SmartApi({
//       api_key: process.env.ANGEL_API_KEY || "",
//       totp: token,
//     });

//     // Attach hook to refresh token automatically
//     smart_api.setSessionExpiryHook(async () => {
//       // console.log("Session expired. Refreshing...");
//       await smart_api.generateToken(process.env.ANGEL_REFRESH_TOKEN!);
//       // console.log("Session refreshed successfully");
//     });

//     const session = await smart_api.generateSession(
//       process.env.ANGEL_ID || "",
//       process.env.ANGEL_PASS || "",
//       token
//     );

//     console.log("SmartAPI session initialized successfully");
//   } catch (error) {
//     console.error("Error initializing SmartAPI session:", error);
//   }
// }


import totp from "totp-generator";
import SmartApi from "./angelConnect";

export let smart_api: SmartApi;
export let smartApiInstance: SmartApi;

let refreshInterval: NodeJS.Timeout | null = null;

// Mutex to prevent concurrent refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

export async function initializeSmartAPISession() {
  try {
    const totpSecret = process.env.TOTP as string;
    const token = totp(totpSecret);

    console.log(`🔑 TOTP Secret length: ${totpSecret?.length || 0}`);
    console.log(`🔑 Generated TOTP: ${token}`);
    console.log(`🔑 ANGEL_ID: ${process.env.ANGEL_ID ? "Set" : "NOT SET"}`);
    console.log(`🔑 ANGEL_PASS: ${process.env.ANGEL_PASS ? "Set" : "NOT SET"}`);
    console.log(`🔑 ANGEL_API_KEY: ${process.env.ANGEL_API_KEY ? "Set" : "NOT SET"}`);

    smart_api = new SmartApi({
      api_key: process.env.ANGEL_API_KEY || "",
      totp: token,
    });

    // Wait for IP addresses to resolve before first login
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Attach hook to refresh token automatically
    smart_api.setSessionExpiryHook(async () => {
      console.log("Session expired. Refreshing...");
      await refreshSmartAPISession();
    });

    const session = await smart_api.generateSession(
      process.env.ANGEL_ID || "",
      process.env.ANGEL_PASS || "",
      token
    );

    console.log("SmartAPI session initialized successfully");

    // ✅ START PROACTIVE REFRESH - Add this line
    startProactiveRefresh();

  } catch (error) {
    console.error("Error initializing SmartAPI session:", error);
  }
}

// ✅ ADD THIS NEW FUNCTION
function startProactiveRefresh(): void {
  // Clear any existing interval first
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }

  // Refresh every 6 hours proactively (6 * 60 * 60 * 1000 = 6 hours)
  refreshInterval = setInterval(async () => {
    console.log("6-hour proactive session refresh triggered...");
    await refreshSmartAPISession();
  }, 6 * 60 * 60 * 1000);

  console.log("Proactive session refresh scheduled every 6 hours");
}

// ✅ ADD THIS NEW FUNCTION
export async function refreshSmartAPISession(): Promise<void> {
  // If already refreshing, wait for the existing refresh to complete
  if (isRefreshing && refreshPromise) {
    console.log("🔒 Refresh already in progress, waiting...");
    await refreshPromise;
    return;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      if (!smart_api) {
        console.log("No SmartAPI instance found. Initializing new session...");
        await initializeSmartAPISession();
        return;
      }

      console.log("Refreshing SmartAPI session...");
      const totpSecret = process.env.TOTP as string;
      const token = totp(totpSecret);
      console.log(`🔑 Refresh - Generated TOTP: ${token}`);

      // Add small delay before login to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));

      const newSession = await smart_api.generateSession(
        process.env.ANGEL_ID || "",
        process.env.ANGEL_PASS || "",
        token
      );

      // Wait for the promise to resolve and check actual login status
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (newSession && newSession.status) {
        console.log("SmartAPI session refreshed successfully");
      } else {
        throw new Error("Session refresh failed");
      }
    } catch (error) {
      console.error("Error refreshing SmartAPI session:", error);
      // Fallback: try full reinitialization
      await initializeSmartAPISession();
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  await refreshPromise;
}

// ✅ ADD CLEANUP HANDLER
process.on('SIGINT', () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    console.log('Proactive session refresh stopped');
  }
});