export const NAME_REGEX = /^[a-zA-Z ]{2,50}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateName(name: string) {
  if (!name) return "Full name is required";
  if (!NAME_REGEX.test(name))
    return "Name should contain only letters and spaces";
  return null;
}

export function validateEmail(email: string) {
  if (!email) return "Email is required";
  if (!EMAIL_REGEX.test(email)) return "Enter a valid email address";
  return null;
}
