import createWebStorage from "redux-persist/lib/storage/createWebStorage";

const createNoopStorage = () => ({
  getItem() {
    return Promise.resolve(null);
  },
  setItem() {
    return Promise.resolve();
  },
  removeItem() {
    return Promise.resolve();
  },
});

const storage =
  typeof window !== "undefined"
    ? createWebStorage("local") // Use localStorage on client
    : createNoopStorage(); // No-op storage on server

export default storage;
