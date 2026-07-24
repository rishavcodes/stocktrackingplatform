"use client";

import { useState, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import Image from "next/image";
import { Toaster } from "../ui/toaster";
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';
type PanData = {
    data: {
        pan_number: string;
        full_name: string;
        full_name_split: string[];
        masked_aadhaar: string;
        address: {
            line_1: string;
            line_2: string;
            street_name: string;
            zip: string;
            city: string;
            state: string;
            country: string;
            full: string;
        };
        email: string | null;
        phone_number: string | null;
        gender: "M" | "F" | string;
        dob: string;
        aadhaar_linked: boolean;
        category: string;
        status: string;
    };
    status_code: number;
    success: boolean;
    message: string | null;
    message_code: string;
};

interface AuthModalProps {
    callbackUrl?: string;
    targetAudience?: "user" | "provider";
    onLoginSuccess?: () => void;
}

export default function AuthModal({ callbackUrl, targetAudience, onLoginSuccess }: AuthModalProps) {
    const { toast } = useToast();
    const session = useSession();
    const [number, setNumber] = useState("");
    const [otp, setOtp] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [otpRequested, setOtpRequested] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [regNumber, setRegNumber] = useState("");
    const [sebiDocument, setSebiDocument] = useState<File | null>(null);
    const [useMobileForTelegram, setUseMobileForTelegram] = useState(true);

    // New states for PAN verification
    const [panNumber, setPanNumber] = useState("");
    const [panHolderName, setPanHolderName] = useState("");
    const [panData, setPanData] = useState<PanData | null>(null);
    const [panVerified, setPanVerified] = useState(false);
    const [isVerifyingPan, setIsVerifyingPan] = useState(false);
    const router = useRouter();
    // State to check if user is coming from event URL
    const [isEventRegistration, setIsEventRegistration] = useState(false);

    // Check if user is coming from event URL - ADD THIS useEffect
    useEffect(() => {
        // Check if the current URL contains the event path
        const isEventUrl = window.location.href.includes('/view/events/details/');
        setIsEventRegistration(isEventUrl);
        console.log("Is event URL:", isEventUrl);
    }, []);

    // Add this function to handle file uploads
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSebiDocument(e.target.files[0]);
        }
    };

    const handleRequestOtp = async () => {
        if (!number || number.length < 10 || number.length > 10) {
            toast({
                title: "Invalid Mobile Number",
                description: "Please enter a valid mobile number",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        try {
            // Call your backend API to send OTP
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/requestoptformobile`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    number,
                }),
            });
        
            const data = await response.json();
    
            if (!response.ok) {
                toast({
                    title: "Failed to send OTP",
                    description: data.message,
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "OTP Sent",
                    description: "Please check your mobile for the verification code",
                    variant: "default",
                });
            }
            setOtpRequested(true);


        } catch (error: any) {
            toast({
                title: "Failed to Send OTP",
                description: error.message || "An unexpected error occurred",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length < 4) {
            toast({
                title: "Invalid OTP",
                description: "Please enter a valid OTP",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
    
        try {
            // Call your backend API to verify OTP
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/checkotpnumber`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    number: number,
                    otp: otp,
                }),
            });

            const data = await response.json();
             console.log("OTP verification response:", data);
            if (!response.ok) {
                throw new Error(data.message || "Failed to verify OTP");
            }

            // ✅ Use the token securely
            if (data.token) {
                localStorage.setItem("otp_token", data.token); // Or use cookies if needed

                toast({
                    title: "OTP Verified",
                    description: "Please complete your profile",
                    variant: "default",
                });
       console.log("OTP verification data:", data);
                // ✅ If user exists, sign in
                if (data.userExists) {
                    const result = await signIn("credentials", {
                        number: number,
                        redirect: false,
                    });
                    

                    if (result?.error) {
                        toast({
                            title: "Sign In Failed",
                            description: result.error,
                            variant: "destructive",
                        });
                    } else {
                        if (onLoginSuccess) {
                            onLoginSuccess();
                        }
                    }
                    if(data.role === 'provider'){
                        router.push('/dashboard/serviceprovider/myprofile/details');
                    } else if(data.role === 'broker'){
                        router.push('/dashboard/broker/marketplace/create');
                    }
                }
                

                // ✅ Mark OTP verified to show registration form
                setOtpVerified(true);
            } else {
                throw new Error("No token received from server");
            }
        } catch (error: any) {
            toast({
                title: "OTP Verification Failed",
                description: error.message || "An unexpected error occurred",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };


    // PAN verification function
    const verifyPanWithZoopSign = async () => {
        if (!panNumber) {
            toast({
                title: "Error",
                description: "Please enter PAN number",
                variant: "destructive",
            });
            return false;
        }

        setIsVerifyingPan(true);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/verifyPan`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    panNumber,
                }),
            });

            const data: PanData = await response.json();

            if (!response.ok) {
                throw new Error((data as any).error || "PAN verification failed");
            }

            if (data.success && data.data?.status === "valid") {
                setPanData(data);
                setName(data.data.full_name);
                setPanVerified(true);

                toast({
                    title: "Success",
                    description: "PAN verified successfully",
                    variant: "default",
                });

                return true;
            } else {
                toast({
                    title: "Verification Failed",
                    description: "Invalid or inactive PAN number",
                    variant: "destructive",
                });
                return false;
            }
        } catch (err: any) {
            console.error("PAN verification error:", err);
            toast({
                title: "Verification Error",
                description: err.message,
                variant: "destructive",
            });
            return false;
        } finally {
            setIsVerifyingPan(false);
        }
    };

    const handleSubmitUserDetails = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !email) {
            toast({
                title: "Missing Information",
                description: "Name and email are required",
                variant: "destructive",
            });
            return;
        }

        // Additional validation for providers
        if (targetAudience === "provider" && (!city || !state || !regNumber)) {
            toast({
                title: "Missing Information",
                description: "All provider details are required",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        try {
            let response;

            const formData = new FormData();

            if (targetAudience === "provider") {
                // Provider signup
                // Prepare the provider data object
                const providerData = {
                    RegName: name,
                    email: email.toLowerCase(), // ensure lowercase email
                    number,
                    city,
                    state,
                    regNumber,
                    // Add any other provider-specific fields here
                };

                // Append the JSON data
                formData.append(
                    "data",
                    JSON.stringify(providerData)
                );

                // Append the SEBI document if it exists
                if (sebiDocument) {
                    formData.append("certificate", sebiDocument);
                }

                response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/provider/signup`, {
                    method: "POST",
                    body: formData, // Note: Don't set Content-Type header for FormData
                });
            } else {
                // User signup (original flow)
                response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/user/signup`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: panData?.data.full_name || null || name,
                        dob: panData?.data.dob || null,
                        pannumber: panData?.data.pan_number || null,
                        gender: panData?.data.gender || null,
                        aadhaarLast4: panData?.data.masked_aadhaar.slice(-4) || null,
                        email,
                        number,
                        callbackUrl: callbackUrl || null,
                    }),
                });
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to register user");
            }

            // If registration successful, sign in the user
            const result = await signIn("credentials", {
                number: number,  // verified mobile number
                redirect: false,  // prevent NextAuth from redirecting on error
                // callbackUrl: callbackUrl,
            });

            if (result?.error) {
                toast({
                    title: "Sign In Failed",
                    description: result.error,
                    variant: "destructive",
                });
            } else {
                // Success - run the onLoginSuccess callback if provided
                if (onLoginSuccess) {
                    onLoginSuccess();
                }
            }
        } catch (error: any) {
            toast({
                title: "Registration Failed",
                description: error.message || "An unexpected error occurred",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Render the mobile number input and OTP request button
    const renderMobileNumberInput = () => (
        <div>
            <div className="mt-1 flex rounded-md shadow-sm gap-x-4">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300">
                    +91
                </span>
                <input
                    id="number"
                    type="tel"
                    value={number}
                    onChange={(e) => setNumber(e.target.value.replace(/\s+/g, ""))}
                    placeholder="Enter your mobile number"
                    disabled={otpRequested}
                    maxLength={10}
                    className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-[#009E70] focus:border-[#009E70] focus:bg-white dark:bg-gray-800 dark:border-gray-600"
                />
            </div>
        </div>
    );

    // Render the OTP verification form
    const renderOtpVerificationForm = () => (
        <div className="space-y-4">
            <div>
                <label
                    htmlFor="otp"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                    OTP
                </label>
                <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter OTP"
                    maxLength={6}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#009E70] focus:border-[#009E70] dark:bg-gray-800 dark:border-gray-600"
                />
            </div>

            <button
                onClick={handleVerifyOtp}
                disabled={isLoading || otp.length < 4}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-[#009E70] hover:bg-[#008157] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#009E70] disabled:opacity-50"
            >
                {isLoading ? "Verifying..." : "Verify OTP"}
            </button>

            <div className="text-center">
                <button
                    onClick={() => {
                        setOtpRequested(false);
                        setOtp("");
                    }}
                    className="text-sm text-[#009E70] hover:text-[#008157]"
                >
                    Change Mobile Number
                </button>
            </div>
        </div>
    );

    // Render PAN verification form
    const renderPanVerificationForm = () => (
        <>
            <div>
                <label
                    htmlFor="panNumber"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                    PAN Number
                </label>
                <input
                    id="panNumber"
                    type="text"
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    placeholder="Enter your PAN number"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#009E70] focus:border-[#009E70] dark:bg-gray-800 dark:border-gray-600"
                />
            </div>

            <button
                type="submit"
                disabled={isVerifyingPan || !panNumber}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-[#009E70] hover:bg-[#008157] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#009E70] disabled:opacity-50"
                onClick={verifyPanWithZoopSign}
            >
                {isVerifyingPan ? "Verifying PAN..." : "Verify PAN"}
            </button>
        </>
    );

    // Add this component to render provider-specific fields
    const renderProviderFields = () => (
        <>
            <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    City
                </label>
                <input
                    id="city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Enter your city"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#009E70] focus:border-[#009E70] dark:bg-gray-800 dark:border-gray-600"
                />
            </div>

            <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    State
                </label>
                <input
                    id="state"
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Enter your state"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#009E70] focus:border-[#009E70] dark:bg-gray-800 dark:border-gray-600"
                />
            </div>

            <div>
                <label htmlFor="sebiNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    SEBI Registration Number
                </label>
                <input
                    id="sebiNumber"
                    type="text"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    placeholder="Enter SEBI registration number"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#009E70] focus:border-[#009E70] dark:bg-gray-800 dark:border-gray-600"
                />
            </div>

            <div>
                <label htmlFor="sebiDocument" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    SEBI Registration Document (Optional)
                </label>
                <input
                    id="sebiDocument"
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    required
                    className="mt-1 block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-[#009E70] file:text-white
                  hover:file:bg-[#008157]"
                />
                <p className="mt-1 text-sm text-gray-500">
                    Upload SEBI registration certificate (PDF, JPG, PNG)
                </p>
            </div>
        </>
    );

    // NEW: Simplified form for event registration (only name, email, mobile)
    const renderEventRegistrationForm = () => (
        <form onSubmit={handleSubmitUserDetails} className="space-y-4">
            <div>
                <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                    Full Name
                </label>
                <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#009E70] focus:border-[#009E70] dark:bg-gray-800 dark:border-gray-600"
                />
            </div>

            <div>
                <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                    Email Address
                </label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#009E70] focus:border-[#009E70] dark:bg-gray-800 dark:border-gray-600"
                />
            </div>

            <div>
                <label
                    htmlFor="confirmedNumber"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                    Mobile Number
                </label>
                <input
                    id="confirmedNumber"
                    type="tel"
                    value={`+91 ${number}`}
                    disabled
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                />
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-[#009E70] hover:bg-[#008157] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#009E70] disabled:opacity-50"
            >
                {isLoading ? "Registering..." : "Complete Registration"}
            </button>
        </form>
    );

    // Render the user details form after OTP verification (for regular users)
    const renderUserDetailsForm = () => (
        <form onSubmit={handleSubmitUserDetails} className="space-y-4">
            <div>
                <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                    Full Name
                </label>
                <input
                    id="name"
                    type="text"
                    value={targetAudience === "user" ? panData?.data.full_name : name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    disabled={targetAudience === "user"}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#009E70] focus:border-[#009E70] dark:bg-gray-800 dark:border-gray-600"
                />
            </div>

            {targetAudience === "user" && (
                <>
                    <div>
                        <label
                            htmlFor="name"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Date Of Birth
                        </label>
                        <input
                            id="dob"
                            type="text"
                            value={panData?.data.dob}
                            disabled
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="name"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Pan Number
                        </label>
                        <input
                            id="pannumber"
                            type="text"
                            value={panData?.data.pan_number}
                            disabled
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="gender"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Gender
                        </label>
                        <input
                            id="gender"
                            type="text"
                            value={panData?.data.gender === "M" ? "Male" : panData?.data.gender === "F" ? "Female" : "Other"}
                            disabled
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="aadhaar"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Aadhaar (Last 4 digits)
                        </label>
                        <input
                            id="aadhaar"
                            type="text"
                            value={panData?.data.masked_aadhaar?.slice(-4) || ""}
                            disabled
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                        />
                    </div>
                </>
            )}


            <div>
                <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                    Email Address
                </label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#009E70] focus:border-[#009E70] dark:bg-gray-800 dark:border-gray-600"
                />
            </div>

            <div>
                <label
                    htmlFor="confirmedNumber"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                    Mobile Number
                </label>
                <input
                    id="confirmedNumber"
                    type="tel"
                    value={`+91 ${number}`}
                    disabled
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                />
            </div>

            {targetAudience === "provider" && renderProviderFields()}

            <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-[#009E70] hover:bg-[#008157] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#009E70] disabled:opacity-50"
            >
                {isLoading ? "Registering..." : "Complete Registration"}
            </button>
        </form>
    );

    console.log("targetAudience", targetAudience, "isEventRegistration:", isEventRegistration)

    return (
        <>
            <div className="max-h-[500px] flex flex-col space-y-6 h-fit overflow-y-auto bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg dark:shadow-gray-800/50">

                <h2 className="text-2xl font-semibold text-center text-gray-800 dark:text-gray-100 mb-4">
                    {otpVerified ? "Complete Your Profile" : "Phone Verification"}
                </h2>

                <div className="space-y-6 flex-1">
                    {!otpVerified && renderMobileNumberInput()}

                    <div className="space-y-4">
                        {!otpRequested && !otpVerified ? (
                            <button
                                onClick={handleRequestOtp}
                                disabled={isLoading || number.length < 10}
                                className="w-full flex justify-center items-center py-3 px-6 rounded-lg transition-all
                                       bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800
                                       text-white font-medium focus:outline-none focus:ring-2 focus:ring-green-500
                                       focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-60
                                       disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Sending OTP...
                                    </div>
                                ) : "Request OTP"}
                            </button>
                        ) : otpRequested && !otpVerified ? (
                            renderOtpVerificationForm()
                        ) : 
                        // MODIFIED THIS CONDITION - Skip PAN verification for event URLs and show simplified form
                        otpVerified && targetAudience === "user" && !panVerified && !isEventRegistration ? (
                            renderPanVerificationForm()
                        ) : (
                            // Show simplified form for event registration, full form for regular users
                            isEventRegistration ? renderEventRegistrationForm() : renderUserDetailsForm()
                        )}
                    </div>
                </div>

                <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-auto">
                    By continuing, you agree to Tradebox&apos;s{" "}
                    <a
                        href="/documents/terms-and-conditions"
                        className="text-green-600 dark:text-green-500 hover:underline font-medium"
                    >
                        Terms of Service
                    </a>{" "}
                    and{" "}
                    <a
                        href="/documents/privacy-policy"
                        className="text-green-600 dark:text-green-500 hover:underline font-medium"
                    >
                        Privacy Policy
                    </a>
                </p>
            </div>
        </>
    );
}