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

type StrikeInputProps = {
  onChange: React.Dispatch<React.SetStateAction<any>>;
  value: string;
  title: string;
  name: string;
  exchange: string;
  segment: string;
  instrument: string;
  symbol: string;
  width?: string;
  fieldId?: string;
  required?: boolean;
  disabled?: boolean;
};

export default function StrikeInput({
  onChange,
  value,
  title,
  name,
  exchange,
  segment,
  instrument,
  symbol,
  width = "w-[120px]",
  fieldId,
  required = false,
  disabled = false,
}: StrikeInputProps) {
  const [filterText, setFilterText] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [strikes, setStrikes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize filterText with the current value when component mounts or value changes
  useEffect(() => {
    if (value) {
      setFilterText(String(Math.round(Number(value) / 100)));
    } else {
      setFilterText("");
    }
  }, [value]);

  // Determine the exch_seg value for the API call
  const getExchSeg = (): string | null => {
    if (exchange + segment === "NSEFnO") return "NFO";
    if (exchange + segment === "BSEFnO") return "BFO";
    if (exchange === "MCX") return "MCX";
    return null;
  };

  // Fetch strikes from API when exchange/segment/instrument/symbol changes
  useEffect(() => {
    const exchSeg = getExchSeg();
    if (!exchSeg || !instrument || !symbol) {
      setStrikes([]);
      return;
    }

    setIsLoading(true);
    const params = new URLSearchParams({
      exch_seg: exchSeg,
      instrumenttype: instrument,
      name: symbol,
    });

    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scripts/strikes?${params}`)
      .then((res) => res.json())
      .then((result) => {
        setStrikes(result.data || []);
      })
      .catch(() => {
        setStrikes([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [exchange, segment, instrument, symbol]);

  // Prefix-match against the displayed strike (raw API value ÷ 100). The user
  // types what they see in the dropdown, so "27500" should match 27500 (raw
  // "2750000") but NOT 35270 (raw "3527000").
  const filteredStrikes = strikes.filter((s) => {
    const display = String(Math.round(Number(s) / 100));
    return display.startsWith(filterText.trim());
  });

  // Handle click outside dropdown
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
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const commitLive = (strike: string) => {
    onChange((prev: any) => ({ ...prev, strike }));
    setFilterText(String(Math.round(Number(strike) / 100)));
  };

  const handleSelect = (strike: string) => {
    commitLive(strike);
    setIsDropdownOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFilterText(val);
    setIsDropdownOpen(true);

    // Only clear parent strike if input is completely empty
    if (val === "") {
      onChange((prev: any) => ({ ...prev, strike: "" }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && isDropdownOpen && filteredStrikes.length) {
      e.preventDefault();
      const next =
        highlightedIndex < filteredStrikes.length - 1 ? highlightedIndex + 1 : 0;
      setHighlightedIndex(next);
      return;
    }
    if (e.key === "ArrowUp" && isDropdownOpen && filteredStrikes.length) {
      e.preventDefault();
      const next =
        highlightedIndex > 0 ? highlightedIndex - 1 : filteredStrikes.length - 1;
      setHighlightedIndex(next);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (isDropdownOpen && filteredStrikes.length) {
        handleSelect(filteredStrikes[highlightedIndex]);
      }
      if (fieldId) focusNext(fieldId);
      return;
    }
    if (e.key === "Tab" && isDropdownOpen && filteredStrikes.length) {
      e.preventDefault();
      handleSelect(filteredStrikes[highlightedIndex]);
      if (fieldId) {
        if (e.shiftKey) focusPrev(fieldId);
        else focusNext(fieldId);
      }
      return;
    }
    kbKeyDown(e);
  };

  const handleFocus = () => {
    setIsDropdownOpen(true);
    if (!filterText && strikes.length > 0) {
      setHighlightedIndex(0);
    }
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
        value={filterText}
        placeholder={isLoading ? "Loading..." : `Select ${title}`}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        className={inputClasses(disabled)}
      />

      {isDropdownOpen && filteredStrikes.length > 0 && (
        <div className={DROPDOWN_PANEL_CLASS}>
          {isLoading ? (
            <div className={DROPDOWN_EMPTY_CLASS}>Loading...</div>
          ) : (
            filteredStrikes.map((strikePrice, index) => (
              <div
                key={strikePrice}
                onClick={() => handleSelect(strikePrice)}
                className={cn(
                  "cursor-pointer px-2 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30",
                  index === highlightedIndex && "bg-blue-50 dark:bg-blue-900/30 font-medium",
                  value === strikePrice && "font-semibold text-blue-600 dark:text-blue-400"
                )}
              >
                {Math.round(Number(strikePrice) / 100)}
              </div>
            ))
          )}
        </div>
      )}

      {isDropdownOpen && filteredStrikes.length === 0 && !isLoading && (
        <div className={DROPDOWN_PANEL_CLASS}>
          <div className={DROPDOWN_EMPTY_CLASS}>
            No strike prices available
          </div>
        </div>
      )}
    </div>
  );
}
