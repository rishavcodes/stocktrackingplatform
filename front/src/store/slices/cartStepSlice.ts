import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface CartStepsState {
  step1Data: any;

  step2Data: {
    signedDocURL: string | null;
    isEsignCompleted: boolean;

    // 👇 KYC moved here
    kycDocuments?: {
      aadhaarURL: string | null;
      panURL: string | null;
      panNumber: string | null;
      dateOfBirth: string | null;
    };
    kycCompleted?: boolean;
    isCouponApplied?: boolean;
    discountedSubtotal?: number | null;
  };
}

const initialState: CartStepsState = {
  step1Data: null,
  step2Data: {
    signedDocURL: null,
    isEsignCompleted: false,
    kycDocuments: undefined,
    kycCompleted: false,
  },
};

const cartStepsSlice = createSlice({
  name: "cartSteps",
  initialState,
  reducers: {
    setStepData: (
      state,
      action: PayloadAction<{ step: keyof CartStepsState; data: any }>
    ) => {
      const { step, data } = action.payload;

      if (typeof state[step] === "object" && state[step] !== null) {
        state[step] = { ...state[step], ...data };
      } else {
        state[step] = data;
      }
    },
  },
});

export const { setStepData } = cartStepsSlice.actions;
export default cartStepsSlice.reducer;
