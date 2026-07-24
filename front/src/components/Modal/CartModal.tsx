"use client";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/rootReducer";
import { setStepData } from "@/store/slices/cartStepSlice";
import { clearCart } from "@/store/slices/cartSlice";
import Step1 from "@/components/Cart/StepOne";
import Step2 from "@/components/Cart/StepTwo";

interface CartModalProps {
    onClose: () => void;
    serviceData: any;
    onPaymentInitiated?: () => void;
}

export default function CartModal({ onClose, serviceData, onPaymentInitiated }: CartModalProps) {
    const dispatch = useDispatch();
    const [step, setStep] = useState(1);
    const cartSteps = useSelector((state: RootState) => state.cartSteps);

    console.log("🔄 Current step:", step);
    console.log("🛒 Is Renewal:", serviceData?.isRenewal);

    // Initialize step data
    useEffect(() => {
        if (serviceData) {
            // Check if this is a renewal with existing data
            if (serviceData.isRenewal && serviceData.previousOrderData) {
                console.log("🔄 Renewal flow detected, setting step to 2 (Payment)");

                setStep(2);

                dispatch(
                    setStepData({
                        step: "step2Data",
                        data: {
                            signedDocURL:
                                serviceData.previousOrderData.data.signedDocumentUrl,
                            isEsignCompleted: true,

                            kycDocuments: {
                                aadhaarURL:
                                    serviceData.previousOrderData.data.aadhaarURL || null,
                                panURL:
                                    serviceData.previousOrderData.data.panURL || null,
                                panNumber:
                                    serviceData.previousOrderData.data.panNumber,
                                dateOfBirth:
                                    serviceData.previousOrderData.data.dateOfBirth,
                            },
                            kycCompleted: true,
                        },
                    })
                );
            }
            else {
                // Regular purchase flow
                console.log("🔄 Regular purchase flow, starting at step 1");
                dispatch(
                    setStepData({
                        step: "step1Data",
                        data: [{
                            id: serviceData._id,
                            title: serviceData.title,
                            author: serviceData.author,
                            validity: serviceData.validity,
                            price: serviceData.price,
                            tncFileURL: serviceData.tncFileURL,
                        }]
                    })
                );
            }
        }
    }, [serviceData, dispatch]);

    return (
        <div>
            {/* Debug info */}


            {step === 1 && (
                <Step1
                    tncFileURL={serviceData?.tncFileURL}
                    serviceId={serviceData?.serviceId}
                    setStep={setStep}
                />
            )}
            {step === 2 && serviceData && (
                <Step2
                    onPaymentInitiated={onPaymentInitiated}
                />
            )}
        </div>
    );
}