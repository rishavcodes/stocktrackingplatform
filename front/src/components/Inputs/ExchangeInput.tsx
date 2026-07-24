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
  width?: string;
  fieldId?: string;
  required?: boolean;
  disabled?: boolean;
};

export default function ExchangeInput({
  onChange,
  value,
  title,
  name,
  width = "w-[120px]",
  fieldId,
  required = false,
  disabled = false,
}: CategoryInputProps) {
  const [filterText, setFilterText] = useState(value ?? "");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Keep the visible text in sync when the parent clears/changes `value`
  // (cascade reset, Reset Form button, etc.). Without this the field shows
  // stale filter text after the parent has emptied the underlying value.
  useEffect(() => {
    setFilterText(value ?? "");
  }, [value]);

  const exchanges = ["NSE", "BSE", "MCX"];

  const filteredExchanges = exchanges.filter((exch) =>
    exch.toLowerCase().includes(filterText.toLowerCase())
  );

  // Close dropdown when clicking outside
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

  // Reset highlight when list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filterText, isDropdownOpen]);

  const { ref: kbRef, onKeyDown: kbKeyDown } = useKeyboardField(fieldId ?? "", {
    type: "dropdown",
    enterHandledByHost: true,
    onEscape: () => setIsDropdownOpen(false),
  });
  const { focusNext, focusPrev } = useKeyboardForm();

  const commitLive = (exch: string) => {
    onChange((prev: any) => ({ ...prev, exchange: exch }));
    setFilterText(exch);
  };

  const handleSelect = (exch: string) => {
    commitLive(exch);
    setIsDropdownOpen(false);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && isDropdownOpen && filteredExchanges.length) {
      e.preventDefault();
      const next =
        highlightedIndex < filteredExchanges.length - 1 ? highlightedIndex + 1 : 0;
      setHighlightedIndex(next);
      return;
    }
    if (e.key === "ArrowUp" && isDropdownOpen && filteredExchanges.length) {
      e.preventDefault();
      const next =
        highlightedIndex > 0 ? highlightedIndex - 1 : filteredExchanges.length - 1;
      setHighlightedIndex(next);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (isDropdownOpen && filteredExchanges.length) {
        handleSelect(filteredExchanges[highlightedIndex]);
      }
      if (fieldId) focusNext(fieldId);
      return;
    }
    if (e.key === "Tab" && isDropdownOpen && filteredExchanges.length) {
      e.preventDefault();
      handleSelect(filteredExchanges[highlightedIndex]);
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
        placeholder={`Select ${title}`}
        onChange={(e) => {
          const val = e.target.value;
          setFilterText(val);
          setIsDropdownOpen(true);
          if (val === "") {
            onChange((prev: any) => ({ ...prev, exchange: "" }));
          }
        }}
        onFocus={() => { if (!disabled) setIsDropdownOpen(true); }}
        onKeyDown={handleKeyDown}
        className={inputClasses(disabled)}
      />

      {isDropdownOpen && !disabled && (
        <div className={DROPDOWN_PANEL_CLASS}>
          {filteredExchanges.length > 0 ? (
            filteredExchanges.map((exch, index) => (
              <div
                key={exch}
                onClick={() => handleSelect(exch)}
                className={dropdownOptionClasses(index === highlightedIndex)}
              >
                {exch}
              </div>
            ))
          ) : (
            <div className={DROPDOWN_EMPTY_CLASS}>No match found</div>
          )}
        </div>
      )}
    </div>
  );
}
