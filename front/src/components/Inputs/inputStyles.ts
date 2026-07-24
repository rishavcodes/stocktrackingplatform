import { cn } from "@/lib/utils";

/**
 * Shared style primitives for the broker-terminal create-recommendation form.
 * Every input / dropdown / button on that page should pull its classes from
 * here so the field row is visually uniform — same height, padding, border,
 * focus ring, and disabled treatment regardless of which underlying component
 * renders the field.
 */

export const FIELD_LABEL_CLASS =
  "block text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1";

export const FIELD_WRAPPER_CLASS = "relative w-full";

/**
 * Single source of truth for the input box itself. Height is fixed at 36 px
 * (h-9) so every cell in the trade-setup grid lines up. Disabled state is
 * unmistakable: muted background, low-contrast text, not-allowed cursor,
 * and reduced opacity.
 */
export function inputClasses(disabled?: boolean): string {
  return cn(
    "w-full h-9 border rounded-md px-2 text-sm outline-none transition-all",
    disabled
      ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60 placeholder:text-gray-300 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-500"
      : "border-gray-300 bg-white text-gray-900 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:border-gray-500"
  );
}

export const DROPDOWN_PANEL_CLASS =
  "absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg";

export function dropdownOptionClasses(highlighted: boolean): string {
  return cn(
    "cursor-pointer px-2 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30",
    highlighted && "bg-blue-50 dark:bg-blue-900/30 font-medium"
  );
}

export const DROPDOWN_EMPTY_CLASS =
  "px-2 py-1.5 text-sm text-gray-500 dark:text-gray-400";
