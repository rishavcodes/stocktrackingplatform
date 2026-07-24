export async function requestOtp(number: string, loginAs?: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/requestoptformobile`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number, loginAs }),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to send OTP");
  return data;
}

export async function verifyOtp(number: string, otp: string) {
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

  console.log("data", data)

  return data;
}

export async function updateUserKyc(payload: {
  id: string;
  name?: string;
  email?: string;
  pannumber?: string;
  dob?: string;
  gender?: string;
  aadhaarLast4?: string;
}) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/updateprofile/user/kyc`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Profile update failed");
  return data;
}

export async function signupUser(payload: any) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/user/signup`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) throw new Error("Signup failed");
}
