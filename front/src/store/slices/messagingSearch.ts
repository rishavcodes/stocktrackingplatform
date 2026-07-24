import { PayloadAction, createSlice } from "@reduxjs/toolkit";

const initialState: string = "";

const messagingSearchSlice = createSlice({
  name: "messagingSearch",
  initialState,
  reducers: {
    setMessageSearch: (state, action: PayloadAction<string>) => {
      return action.payload;
    },
  },
});

export const { setMessageSearch } = messagingSearchSlice.actions;

export default messagingSearchSlice.reducer;
