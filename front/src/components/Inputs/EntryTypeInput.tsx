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
import { ChevronDown, DropletIcon } from "lucide-react";
import { Input } from "@/components";
import { useKeyboardField, useKeyboardForm } from "@/lib/keyboardForm";

type EntryTypeInputProps = {
  onChange: React.Dispatch<React.SetStateAction<any>>;
  value: string;
  title: string;
  name: string;
  width?: string;
  fieldId?: string;
  required?: boolean;
  disabled?: boolean;
};

const OPTIONS = ["BUY", "SELL"]; // Display as uppercase
const OPTIONS_LOWERCASE = ["buy", "sell"]; // Store as lowercase

export default function EntryTypeInput({
  onChange,
  value,
  title,
  name,
  fieldId,
  required = false,
  disabled = false,
}: EntryTypeInputProps) {
  const [filterText, setFilterText] = useState(value ? value.toUpperCase() : OPTIONS[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Default to first element if no value
  useEffect(() => {
    if (!value) {
      onChange((prev: any) => ({ ...prev, entryType: OPTIONS_LOWERCASE[0] })); // Store as "buy"
      setFilterText(OPTIONS[0]); // Display as "BUY"
    } else {
      // Sync display text with current value
      setFilterText(value.toUpperCase());
    }
  }, [value, onChange]);

  // Handle click outside to close dropdown
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

  // Reset highlight when filter changes or dropdown opens
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filterText, isDropdownOpen]);

  const { ref: kbRef, onKeyDown: kbKeyDown } = useKeyboardField(fieldId ?? "", {
    type: "dropdown",
    enterHandledByHost: true,
    onEscape: () => setIsDropdownOpen(false),
  });
  const { focusNext, focusPrev } = useKeyboardForm();

  const commitLive = (option: string) => {
    setFilterText(option);
    onChange((prev: any) => ({ ...prev, entryType: option.toLowerCase() }));
  };

  const handleSelect = (option: string) => {
    commitLive(option);
    setIsDropdownOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && isDropdownOpen) {
      e.preventDefault();
      const next = (highlightedIndex + 1) % OPTIONS.length;
      setHighlightedIndex(next);
      return;
    }
    if (e.key === "ArrowUp" && isDropdownOpen) {
      e.preventDefault();
      const next =
        highlightedIndex > 0 ? highlightedIndex - 1 : OPTIONS.length - 1;
      setHighlightedIndex(next);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (isDropdownOpen) handleSelect(OPTIONS[highlightedIndex]);
      if (fieldId) focusNext(fieldId);
      return;
    }
    if (e.key === "Tab" && isDropdownOpen) {
      e.preventDefault();
      handleSelect(OPTIONS[highlightedIndex]);
      if (fieldId) {
        if (e.shiftKey) focusPrev(fieldId);
        else focusNext(fieldId);
      }
      return;
    }
    kbKeyDown(e);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase(); // force uppercase for display
    setFilterText(val);
    setIsDropdownOpen(true);
    
    if (val === "") {
      onChange((prev: any) => ({ ...prev, entryType: "" }));
    } else {
      // Find matching option and store as lowercase
      const matchedOption = OPTIONS.find(opt => 
        opt.toUpperCase().includes(val.toUpperCase())
      );
      if (matchedOption) {
        onChange((prev: any) => ({ ...prev, entryType: matchedOption.toLowerCase() }));
      } else {
        onChange((prev: any) => ({ ...prev, entryType: val.toLowerCase() }));
      }
    }
  };

  return (
    <div ref={dropdownRef} className={FIELD_WRAPPER_CLASS}>
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
        placeholder={`Select ${title}`}
        onChange={handleInputChange}
        onFocus={() => { if (!disabled) setIsDropdownOpen(true); }}
        onKeyDown={handleKeyDown}
        className={inputClasses(disabled)}
      />

      {isDropdownOpen && !disabled && (
        <div className={DROPDOWN_PANEL_CLASS}>
          {OPTIONS.length > 0 ? (
            OPTIONS.map((opt, index) => (
              <div
                key={opt}
                onClick={() => handleSelect(opt)}
                className={dropdownOptionClasses(index === highlightedIndex)}
              >
                {opt}
              </div>
            ))
          ) : (
            <div className={DROPDOWN_EMPTY_CLASS}>No options available</div>
          )}
        </div>
      )}
    </div>
  );
}