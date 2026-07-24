// authSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UserState {
  _id: string;
  name: string;
  RegName: string;
  role: string;
  email: string;
  verified: boolean;
  type: string;
  category: string;
  profileUrl?: string;
  number: number;
  aboutMe?: string;
  backendToken: string;
}

interface AuthState {
  user: UserState | null;
}

const initialState: AuthState = {
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserState>) => {
      state.user = action.payload;
    },
    clearUser: (state) => {
      state.user = null;
    },
  },
});

export const { setUser, clearUser } = authSlice.actions;
export default authSlice.reducer;
