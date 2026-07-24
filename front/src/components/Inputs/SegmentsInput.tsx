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

// label = displayed text | value = stored backend value
const segments = [
  { label: "Equity", value: "Equity" },
  { label: "F&O", value: "FnO" },
];

export default function SegmentInput({
  onChange,
  value,
  title,
  name,
  width = "w-[120px]",
  fieldId,
  required = false,
  disabled = false,
}: CategoryInputProps) {
  // Initialize filterText with the display label, not the raw value
  const getDisplayLabel = (val: string) => segments.find((seg) => seg.value === val)?.label || val || "";

  const [filterText, setFilterText] = useState(getDisplayLabel(value));
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync filterText when value prop changes externally (e.g., form reset)
  useEffect(() => {
    setFilterText(getDisplayLabel(value));
  }, [value]);

  const filteredSegments = segments.filter((seg) =>
    seg.label.toLowerCase().includes(filterText.toLowerCase())
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

  const commitLive = (seg: { label: string; value: string }) => {
    onChange((prev: any) => ({ ...prev, segment: seg.value }));
    setFilterText(seg.label);
  };

  const handleSelect = (seg: { label: string; value: string }) => {
    commitLive(seg);
    setIsDropdownOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && isDropdownOpen && filteredSegments.length) {
      e.preventDefault();
      const next =
        highlightedIndex < filteredSegments.length - 1 ? highlightedIndex + 1 : 0;
      setHighlightedIndex(next);
      return;
    }
    if (e.key === "ArrowUp" && isDropdownOpen && filteredSegments.length) {
      e.preventDefault();
      const next =
        highlightedIndex > 0 ? highlightedIndex - 1 : filteredSegments.length - 1;
      setHighlightedIndex(next);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (isDropdownOpen && filteredSegments.length) {
        handleSelect(filteredSegments[highlightedIndex]);
      }
      if (fieldId) focusNext(fieldId);
      return;
    }
    if (e.key === "Tab" && isDropdownOpen && filteredSegments.length) {
      e.preventDefault();
      handleSelect(filteredSegments[highlightedIndex]);
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
        value={
          filterText ||
          segments.find((seg) => seg.value === value)?.label ||
          ""
        }
        placeholder={`Select ${title}`}
        onChange={(e) => {
          const val = e.target.value;
          setFilterText(val);
          setIsDropdownOpen(true);
          if (val === "") {
            onChange((prev: any) => ({ ...prev, segment: "" }));
          }
        }}
        onFocus={() => { if (!disabled) setIsDropdownOpen(true); }}
        onKeyDown={handleKeyDown}
        className={inputClasses(disabled)}
      />

      {isDropdownOpen && !disabled && (
        <div className={DROPDOWN_PANEL_CLASS}>
          {filteredSegments.length > 0 ? (
            filteredSegments.map((seg, index) => (
              <div
                key={seg.value}
                onClick={() => handleSelect(seg)}
                className={dropdownOptionClasses(index === highlightedIndex)}
              >
                {seg.label}
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
