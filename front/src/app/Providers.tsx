"use client";

import { store, persistor } from "@/store/store";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

export function SessionProviders({
  children,
  session,
}: {
  children: React.ReactNode;
  session: any;
}) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}

export function StoreProviders({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {children}
      </PersistGate>
    </Provider>
  );
}

export function ThemeProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
       forcedTheme="light"
      disableTransitionOnChange
      
    >
      {children}
    </ThemeProvider>
  );
}
