"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

type Step = "MOBILE" | "OTP" | "FORM";

export default function SubProfileSignupContainer({
  masterId,
  masterName,
}: {
  masterId: string;
  masterName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("MOBILE");
  const [number, setNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  // Backend required fields
  const [RegName, setRegName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [regNumber, setRegNumber] = useState("");

  /* ---------------- OTP REQUEST ---------------- */

  const requestOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(number)) {
      toast({
        title: "Invalid number",
        description: "Enter valid 10 digit mobile number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/requestoptformobile`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ number }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast({ title: "OTP sent successfully" });
      setStep("OTP");
    } catch (err: any) {
      toast({
        title: "OTP failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- OTP VERIFY ---------------- */

  const verifyOtp = async () => {
    if (!/^\d{4}$/.test(otp)) {
      toast({
        title: "Invalid OTP",
        description: "OTP must be 4 digits",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/checkotpnumber`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ number, otp }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Existing sub profile → login
      if (data.userExists) {
        await signIn("credentials", {
          number,
          loginAs: "provider",
          redirect: false,
        });

        router.push("/dashboard/serviceprovider/overview");
        return;
      }

      setStep("FORM");
    } catch (err: any) {
      toast({
        title: "OTP verification failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- SUB PROFILE CREATE ---------------- */

  const submitSubProfile = async () => {
    if (
      !RegName ||
      !name ||
      !email ||
      !city ||
      !state ||
      !regNumber
    ) {
      toast({
        title: "Missing fields",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();

      formData.append(
        "data",
        JSON.stringify({
          // Backend expected fields
          RegName,
          name,
          email: email.toLowerCase(),
          number,
          city,
          state,
          regNumber,

          // Fixed system values
          role: "provider",
          type: "sub profile", // 🔒 hard coded
          category: "",        // 🔒 admin will assign later
          isSubProfile: true,
          masterID: masterId,
          companyName: masterName,
        })
      );

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/provider/signup`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      await signIn("credentials", {
        number,
        loginAs: "provider",
        redirect: false,
      });

      toast({ title: "Sub profile created successfully" });
      router.replace("/dashboard/serviceprovider/myprofile/details");
    } catch (err: any) {
      toast({
        title: "Signup failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg w-full max-w-md shadow">

        <h2 className="text-xl font-semibold mb-1">
          Sub Profile Registration
        </h2>
        <p className="text-xs text-gray-500 mb-5">
          Under <b>{masterName}</b>
        </p>

        {/* STEP 1 */}
        {step === "MOBILE" && (
          <>
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))}
              placeholder="Mobile number"
              maxLength={10}
              className="w-full border p-3 rounded mb-4"
            />

            <button
              onClick={requestOtp}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded"
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </>
        )}

        {/* STEP 2 */}
        {step === "OTP" && (
          <>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter OTP"
              maxLength={4}
              className="w-full border p-3 rounded mb-4"
            />

            <button
              onClick={verifyOtp}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </>
        )}

        {/* STEP 3 */}
        {step === "FORM" && (
          <>
            <input
              value={RegName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="Registered Name"
              className="w-full border p-3 rounded mb-3"
            />

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              className="w-full border p-3 rounded mb-3"
            />

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full border p-3 rounded mb-3"
            />

            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="w-full border p-3 rounded mb-3"
            />

            <input
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="State"
              className="w-full border p-3 rounded mb-3"
            />

            <input
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              placeholder="Registration Number"
              className="w-full border p-3 rounded mb-4"
            />

            <div className="text-xs text-gray-500 mb-4">
              Type: <b>Sub Profile</b> <br />
              Category: <b>Will be assigned by Admin</b>
            </div>

            <button
              onClick={submitSubProfile}
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded"
            >
              {loading ? "Creating..." : "Create Sub Profile"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
