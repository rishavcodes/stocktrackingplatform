import { PayloadAction, createSlice } from "@reduxjs/toolkit";

const initialState: boolean = false;

export const authWindowSlice = createSlice({
  name: "authWindow",
  initialState,
  reducers: {
    setauthWindow: (state, action: PayloadAction<boolean>) => {
      return action.payload;
    },
  },
});

export const { setauthWindow } = authWindowSlice.actions;

export default authWindowSlice.reducer;
