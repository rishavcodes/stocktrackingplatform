import { combineReducers } from "@reduxjs/toolkit";
import followingData from "./slices/followingData";
import ScoreCardData from "./slices/ScoreCardData";
import authWindow from "./slices/authWindow";
import PaginationScoreCard from "./slices/PaginationScoreCard";
import messagingSearch from "./slices/messagingSearch";
import cart from "./slices/cartSlice"
import cartSteps from "./slices/cartStepSlice"
import auth from "./slices/authSlice"

const rootReducer = combineReducers({
  followingData,
  ScoreCardData,
  authWindow,
  PaginationScoreCard,
  messagingSearch,
  cart,
  cartSteps,
  auth,
});

export type RootState = ReturnType<typeof rootReducer>;

export default rootReducer;
