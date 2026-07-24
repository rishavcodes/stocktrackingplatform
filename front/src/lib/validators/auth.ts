export const MOBILE_REGEX = /^[6-9]\d{9}$/;

export function validateMobile(number: string) {
  if (!number) return "Mobile number is required";
  if (!MOBILE_REGEX.test(number)) return "Enter a valid 10-digit mobile number";
  return null;
}

export const OTP_REGEX = /^\d{4,6}$/;

export function validateOtp(otp: string) {
  if (!otp) return "OTP is required";
  if (!OTP_REGEX.test(otp)) return "OTP must be 4 digits";
  return null;
}
