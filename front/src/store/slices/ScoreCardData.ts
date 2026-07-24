import { PayloadAction, createSlice } from "@reduxjs/toolkit";

const initialStateDropDownOpen: boolean = false;

export const DropDownOpenSlice = createSlice({
  name: "isDropdownOpen",
  initialState: initialStateDropDownOpen,
  reducers: {
    setDropDownState: (state, action: PayloadAction<boolean>) => {
      return action.payload;
    },
  },
});

export const { setDropDownState } = DropDownOpenSlice.actions;

export default DropDownOpenSlice.reducer;
