import { useState, useEffect, useRef } from "react";
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
  exchange: string;
  segment: string;
  instrument: string;
  fieldId?: string;
  required?: boolean;
  disabled?: boolean;
};

export default function ScriptNameInput({
  onChange,
  value,
  title,
  name,
  exchange,
  segment,
  instrument,
  width = "w-[180px]",
  fieldId,
  required = false,
  disabled = false,
}: CategoryInputProps) {
  const [filterText, setFilterText] = useState(value ?? "");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [scriptNames, setScriptNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync visible text with parent `value` so cascade resets / Reset Form
  // visually clear the field instead of leaving stale filter text behind.
  useEffect(() => {
    setFilterText(value ?? "");
  }, [value]);

  // Determine the exch_seg value for the API call
  const getExchSeg = (): string | null => {
    if (exchange === "MCX") return "MCX";
    if (exchange + segment === "NSEEquity") return "NSE";
    if (exchange + segment === "BSEEquity") return "BSE";
    if (exchange + segment === "NSEFnO") return "NFO";
    if (exchange + segment === "BSEFnO") return "BFO";
    return null;
  };

  // Fetch symbols from API when exchange/segment/instrument changes
  useEffect(() => {
    const exchSeg = getExchSeg();
    if (!exchSeg) {
      setScriptNames([]);
      return;
    }

    const isEquity = exchSeg === "NSE" || exchSeg === "BSE";
    if (!isEquity && !instrument) {
      setScriptNames([]);
      return;
    }

    setIsLoading(true);
    const params = new URLSearchParams({ exch_seg: exchSeg });
    if (!isEquity && instrument) {
      params.set("instrumenttype", instrument);
    }

    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scripts/symbols?${params}`)
      .then((res) => res.json())
      .then((result) => {
        setScriptNames(result.data || []);
      })
      .catch(() => {
        setScriptNames([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [exchange, segment, instrument]);

  const filteredScriptNames = scriptNames.filter((scriptName) =>
    scriptName.toLowerCase().includes(filterText.toLowerCase())
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

  // Live-commit on Up/Down so cascading effects (CMP/lot-size fetch) start as
  // the user arrows through results.
  const commitLive = (scriptName: string) => {
    onChange((prev: any) => ({ ...prev, symbol: scriptName }));
    setFilterText(scriptName);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && isDropdownOpen && filteredScriptNames.length) {
      e.preventDefault();
      const next =
        highlightedIndex < filteredScriptNames.length - 1
          ? highlightedIndex + 1
          : 0;
      setHighlightedIndex(next);
      return;
    }
    if (e.key === "ArrowUp" && isDropdownOpen && filteredScriptNames.length) {
      e.preventDefault();
      const next =
        highlightedIndex > 0
          ? highlightedIndex - 1
          : filteredScriptNames.length - 1;
      setHighlightedIndex(next);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (isDropdownOpen && filteredScriptNames.length > 0) {
        const selected = filteredScriptNames[highlightedIndex];
        if (selected) handleSelect(selected);
      }
      if (fieldId) focusNext(fieldId);
      return;
    }
    if (e.key === "Tab" && isDropdownOpen && filteredScriptNames.length) {
      e.preventDefault();
      const selected = filteredScriptNames[highlightedIndex];
      if (selected) handleSelect(selected);
      if (fieldId) {
        if (e.shiftKey) focusPrev(fieldId);
        else focusNext(fieldId);
      }
      return;
    }
    // Defer Esc to the kb hook
    kbKeyDown(e);
  };

  const handleSelect = (scriptName: string) => {
    onChange((prev: any) => ({ ...prev, symbol: scriptName }));
    setFilterText(scriptName);
    setIsDropdownOpen(false);
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
        value={filterText || value}
        placeholder={disabled ? "—" : isLoading ? "Loading..." : `Search ${title}`}
        onChange={(e) => {
          if (disabled) return;
          const val = e.target.value;
          setFilterText(val);
          setIsDropdownOpen(true);
          if (val === "") {
            onChange((prev: any) => ({ ...prev, symbol: "" }));
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
          {isLoading ? (
            <div className={DROPDOWN_EMPTY_CLASS}>Loading...</div>
          ) : filteredScriptNames.length > 0 ? (
            filteredScriptNames.map((scriptName, index) => (
              <div
                key={scriptName}
                onClick={() => handleSelect(scriptName)}
                className={dropdownOptionClasses(index === highlightedIndex)}
              >
                {scriptName}
              </div>
            ))
          ) : (
            <div className={DROPDOWN_EMPTY_CLASS}>No scripts available</div>
          )}
        </div>
      )}
    </div>
  );
}
