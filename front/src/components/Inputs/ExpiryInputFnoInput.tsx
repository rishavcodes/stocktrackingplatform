import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  FIELD_LABEL_CLASS,
  FIELD_WRAPPER_CLASS,
  DROPDOWN_PANEL_CLASS,
  DROPDOWN_EMPTY_CLASS,
  dropdownOptionClasses,
  inputClasses,
} from "./inputStyles";
import { useKeyboardField, useKeyboardForm } from "@/lib/keyboardForm";

type CategoryInputProps = {
  onChange: React.Dispatch<React.SetStateAction<any>>;
  value: string;
  title: string;
  name: string;
  exchange: string;
  symbol: string;
  strike: string;
  segment: string;
  instrument: string;
  width?: string;
  fieldId?: string;
  required?: boolean;
  disabled?: boolean;
};

export default function ExpiryInputFnoInput({
  onChange,
  value,
  title,
  name,
  exchange,
  segment,
  symbol,
  instrument,
  strike,
  width = "w-[140px]",
  fieldId,
  required = false,
  disabled = false,
}: CategoryInputProps) {
  const [filterText, setFilterText] = useState(value ?? "");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [expiryOptions, setExpiryOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync visible text with parent `value` so cascade resets / Reset Form
  // visually clear the field instead of leaving stale filter text behind.
  useEffect(() => {
    setFilterText(value ?? "");
  }, [value]);

  // Determine the exch_seg value for the API call
  const getExchSeg = (): string | null => {
    const exchangeSegment = exchange + segment;
    if (exchangeSegment === "NSEFnO") return "NFO";
    if (exchangeSegment === "BSEFnO") return "BFO";
    if (exchange === "MCX") return "MCX";
    return null;
  };

  // Determine if strike is required based on instrument type
  const requiresStrike = (): boolean => {
    const exchangeSegment = exchange + segment;
    if (exchangeSegment === "NSEFnO" || exchangeSegment === "BSEFnO") {
      return instrument === "OPTSTK" || instrument === "OPTIDX";
    }
    if (exchange === "MCX") {
      return instrument === "OPTFUT";
    }
    return false;
  };

  // Fetch expiries from API
  useEffect(() => {
    const exchSeg = getExchSeg();
    if (!exchSeg || !instrument || !symbol) {
      setExpiryOptions([]);
      return;
    }

    // If strike is required but not yet selected, don't fetch
    if (requiresStrike() && !strike) {
      setExpiryOptions([]);
      return;
    }

    setIsLoading(true);
    const params = new URLSearchParams({
      exch_seg: exchSeg,
      instrumenttype: instrument,
      name: symbol,
    });
    if (requiresStrike() && strike) {
      params.set("strike", strike);
    }

    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scripts/expiries?${params}`)
      .then((res) => res.json())
      .then((result) => {
        setExpiryOptions(result.data || []);
      })
      .catch(() => {
        setExpiryOptions([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [exchange, segment, instrument, symbol, strike]);

  const filteredOptions = expiryOptions.filter((expiry) =>
    expiry.includes(filterText)
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [filterText, isDropdownOpen]);

  const { ref: kbRef, onKeyDown: kbKeyDown } = useKeyboardField(fieldId ?? "", {
    type: "dropdown",
    enterHandledByHost: true,
    onEscape: () => setIsDropdownOpen(false),
  });
  const { focusNext, focusPrev } = useKeyboardForm();

  const commitLive = (expiry: string) => {
    onChange((prev: any) => ({ ...prev, expiry }));
    setFilterText(expiry);
  };

  const handleSelect = (expiry: string) => {
    commitLive(expiry);
    setIsDropdownOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && isDropdownOpen && filteredOptions.length) {
      e.preventDefault();
      const next =
        highlightedIndex < filteredOptions.length - 1 ? highlightedIndex + 1 : 0;
      setHighlightedIndex(next);
      return;
    }
    if (e.key === "ArrowUp" && isDropdownOpen && filteredOptions.length) {
      e.preventDefault();
      const next =
        highlightedIndex > 0 ? highlightedIndex - 1 : filteredOptions.length - 1;
      setHighlightedIndex(next);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (isDropdownOpen && filteredOptions.length) {
        handleSelect(filteredOptions[highlightedIndex]);
      }
      if (fieldId) focusNext(fieldId);
      return;
    }
    if (e.key === "Tab" && isDropdownOpen && filteredOptions.length) {
      e.preventDefault();
      handleSelect(filteredOptions[highlightedIndex]);
      if (fieldId) {
        if (e.shiftKey) focusPrev(fieldId);
        else focusNext(fieldId);
      }
      return;
    }
    kbKeyDown(e);
  };

  return (
    <div className={FIELD_WRAPPER_CLASS} ref={dropdownRef}>
      <label htmlFor={name} className={FIELD_LABEL_CLASS}>
        {title}
        {required && !disabled && (
          <span className="text-red-500 ml-0.5">*</span>
        )}
      </label>
      <input
        ref={fieldId ? (kbRef as React.Ref<HTMLInputElement>) : undefined}
        type="text"
        disabled={disabled}
        name={name}
        required
        value={filterText || value}
        placeholder={isLoading ? "Loading..." : `Select ${title}`}
        onChange={(e) => {
          const val = e.target.value;
          setFilterText(val.toUpperCase());
          setIsDropdownOpen(true);
          if (val === "") {
            onChange((prev: any) => ({ ...prev, expiry: "" }));
          }
        }}
        onFocus={() => { if (!disabled) setIsDropdownOpen(true); }}
        onKeyDown={handleKeyDown}
        className={inputClasses(disabled)}
      />

      {isDropdownOpen && !disabled && (
        <div className={DROPDOWN_PANEL_CLASS}>
          {isLoading ? (
            <div className={DROPDOWN_EMPTY_CLASS}>Loading...</div>
          ) : filteredOptions.length > 0 ? (
            filteredOptions.map((expiry, index) => (
              <div
                key={expiry}
                onClick={() => handleSelect(expiry)}
                className={dropdownOptionClasses(index === highlightedIndex)}
              >
                {expiry}
              </div>
            ))
          ) : (
            <div className={DROPDOWN_EMPTY_CLASS}>
              No expiry dates available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
