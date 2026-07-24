import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "./rootReducer";
import storage from "@/store/storage"; // Import fixed storage
import { persistStore, persistReducer } from "redux-persist";

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["cart"], // Persist only cart (optional)
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);
