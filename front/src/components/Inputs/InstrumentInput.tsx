import { useState, useRef, useEffect, useMemo } from "react";
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

/**
 * Unified Instrument selector. Replaces the older split between
 * `McxInstrumentType` (FUTCOM/FUTIDX/OPTFUT) and `InstrunmentTypeInput`
 * (FUTIDX/FUTSTK/OPTSTK/OPTIDX). Derives the option list from `exchange`
 * and `segment` so the create form can render this once with always-mounted
 * static layout, toggling `disabled` rather than swapping components.
 */
type InstrumentInputProps = {
  onChange: React.Dispatch<React.SetStateAction<any>>;
  value: string;
  title: string;
  name: string;
  exchange: string;
  segment: string;
  fieldId?: string;
  required?: boolean;
  disabled?: boolean;
};

function getInstrumentOptions(exchange: string, segment: string): string[] {
  if (exchange === "MCX") return ["FUTCOM", "FUTIDX", "OPTFUT"];
  if (segment === "FnO") return ["FUTIDX", "FUTSTK", "OPTSTK", "OPTIDX"];
  return [];
}

export default function InstrumentInput({
  onChange,
  value,
  title,
  name,
  exchange,
  segment,
  fieldId,
  required = false,
  disabled = false,
}: InstrumentInputProps) {
  const options = useMemo(
    () => getInstrumentOptions(exchange, segment),
    [exchange, segment]
  );

  const [filterText, setFilterText] = useState(value ?? "");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync visible text with parent `value` so cascade resets / Reset Form
  // visually clear the field instead of leaving stale filter text behind.
  useEffect(() => {
    setFilterText(value ?? "");
  }, [value]);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(filterText.toLowerCase())
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

  const commitLive = (val: string) => {
    onChange((prev: any) => ({ ...prev, instrument: val }));
    setFilterText(val);
  };

  const handleSelect = (val: string) => {
    commitLive(val);
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
      <label
        htmlFor={name}
        className={FIELD_LABEL_CLASS}
      >
        {title}
      </label>
      <input
        ref={fieldId ? (kbRef as React.Ref<HTMLInputElement>) : undefined}
        type="text"
        name={name}
        required={!disabled}
        disabled={disabled}
        value={filterText || value}
        placeholder={disabled ? "—" : `Select ${title}`}
        onChange={(e) => {
          if (disabled) return;
          const val = e.target.value;
          setFilterText(val);
          setIsDropdownOpen(true);
          if (val === "") {
            onChange((prev: any) => ({ ...prev, instrument: "" }));
          }
        }}
        onFocus={() => {
          if (!disabled) setIsDropdownOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className={inputClasses(disabled)}
      />

      {isDropdownOpen && !disabled && (
        <div className={DROPDOWN_PANEL_CLASS}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, index) => (
              <div
                key={opt}
                onClick={() => handleSelect(opt)}
                className={cn(
                  "cursor-pointer px-2 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30",
                  index === highlightedIndex &&
                    "bg-blue-50 dark:bg-blue-900/30 font-medium"
                )}
              >
                {opt}
              </div>
            ))
          ) : (
            <div className={DROPDOWN_EMPTY_CLASS}>
              No options available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
