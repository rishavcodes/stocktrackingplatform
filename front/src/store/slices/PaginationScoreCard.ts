import { PayloadAction, createSlice } from "@reduxjs/toolkit";

const initialState: number = 0;

export const paginationScorecardSlice = createSlice({
  name: "paginationScorecard",
  initialState,
  reducers: {
    setScorecardPage: (state, action: PayloadAction<number>) => {
      return action.payload;
    },
  },
});

export const { setScorecardPage } = paginationScorecardSlice.actions;

export default paginationScorecardSlice.reducer;
