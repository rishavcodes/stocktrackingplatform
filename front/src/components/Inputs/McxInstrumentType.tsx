import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useKeyboardField, useKeyboardForm } from "@/lib/keyboardForm";

type CategoryInputProps = {
  onChange: React.Dispatch<React.SetStateAction<any>>;
  value: string;
  title: string;
  name: string;
  width?: string;
  fieldId?: string;
};

const options = ["FUTCOM", "FUTIDX", "OPTFUT"];

export default function McxInstrumentType({
  onChange,
  value,
  title,
  name,
  width = "w-[120px]",
  fieldId,
}: CategoryInputProps) {
  const [filterText, setFilterText] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
  const { focusNext } = useKeyboardForm();

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
      if (fieldId) focusNext(fieldId);
      return;
    }
    kbKeyDown(e);
  };

  return (
    <div className="relative w-full min-w-[80px]" ref={dropdownRef}>
      <label htmlFor={name} className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
        {title}
      </label>
      <input
        ref={fieldId ? (kbRef as React.Ref<HTMLInputElement>) : undefined}
        type="text"
        name={name}
        required
        value={filterText || value}
        placeholder={`Select ${title}`}
        onChange={(e) => {
          const val = e.target.value;
          setFilterText(val);
          setIsDropdownOpen(true);
          if (val === "") {
            onChange((prev: any) => ({ ...prev, instrument: "" }));
          }
        }}
        onFocus={() => setIsDropdownOpen(true)}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-sm outline-none",
          "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
          "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          "transition-all hover:border-gray-400 dark:hover:border-gray-500"
        )}
      />

      {isDropdownOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, index) => (
              <div
                key={opt}
                onClick={() => handleSelect(opt)}
                className={cn(
                  "cursor-pointer px-2 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30",
                  index === highlightedIndex && "bg-blue-50 dark:bg-blue-900/30 font-medium"
                )}
              >
                {opt}
              </div>
            ))
          ) : (
            <div className="px-2 py-1.5 text-sm text-gray-500 dark:text-gray-400">No options available</div>
          )}
        </div>
      )}
    </div>
  );
}
