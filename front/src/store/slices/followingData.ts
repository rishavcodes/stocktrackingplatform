import { PayloadAction, createSlice } from "@reduxjs/toolkit";

const initialState: string[] = [];


export const followingDataSlice = createSlice({
    name: "followingData",
    initialState,
    reducers: {
      setfollowingData: (state, action: PayloadAction<string[]>) => {
        state.splice(0, state.length, ...action.payload);
      },
    },
  });


export const { setfollowingData } = followingDataSlice.actions;

export default followingDataSlice.reducer;