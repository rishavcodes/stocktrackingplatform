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

type OptionInputProps = {
  onChange: React.Dispatch<React.SetStateAction<any>>;
  value: string;
  title: string;
  name: string;
  width?: string;
  fieldId?: string;
  required?: boolean;
  disabled?: boolean;
};

const OPTIONS = ["CE", "PE"];

export default function OptionTypeInput({
  onChange,
  value,
  title,
  name,
  width = "w-[80px]",
  fieldId,
  required = false,
  disabled = false,
}: OptionInputProps) {
  const [filterText, setFilterText] = useState(value ?? "");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync visible text with parent `value` so cascade resets / Reset Form
  // visually clear the field instead of leaving stale filter text behind.
  useEffect(() => {
    setFilterText(value ?? "");
  }, [value]);

  const filteredOptions = OPTIONS.filter((opt) =>
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

  const commitLive = (option: string) => {
    onChange((prev: any) => ({ ...prev, option }));
    setFilterText(option);
  };

  const handleSelect = (option: string) => {
    commitLive(option);
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
        placeholder="Select"
        onChange={(e) => {
          const val = e.target.value;
          setFilterText(val);
          setIsDropdownOpen(true);
          if (val === "") {
            onChange((prev: any) => ({ ...prev, option: "" }));
          }
        }}
        onFocus={() => { if (!disabled) setIsDropdownOpen(true); }}
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
