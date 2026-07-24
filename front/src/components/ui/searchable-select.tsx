import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";
import { cn } from "../../lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

// Fuzzy search helper function
function fuzzySearch(searchStr: string, targetStr: string): boolean {
    const search = searchStr.toLowerCase().trim();
    const target = targetStr.toLowerCase();

    if (!search) return true;

    let searchIndex = 0;
    for (let i = 0; i < target.length; i++) {
        if (search[searchIndex] === target[i]) {
            searchIndex++;
            if (searchIndex === search.length) return true;
        }
    }
    return false;
}

export interface SelectOption {
    value: string;
    label: string;
    [key: string]: any; // Allow additional properties
}

interface SearchableSelectProps {
    options: SelectOption[];
    value?: string;
    onChange: (value: SelectOption) => void;
    placeholder?: string;
    emptyMessage?: string;
    className?: string;
    disabled?: boolean;
    searchPlaceholder?: string;
    initialItemsCount?: number;
    minSearchLength?: number;
    debounceMs?: number;
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Select an option",
    emptyMessage = "No results found.",
    className,
    disabled = false,
    searchPlaceholder = "Search...",
    initialItemsCount = 10,
    minSearchLength = 1,
    debounceMs = 300,
}: SearchableSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, debounceMs);
    const searchInputRef = React.useRef<HTMLInputElement>(null);

    const selectedOption = options.find((option) => option.label === value);

    // Filter options based on search query
    const filteredOptions = React.useMemo(() => {
        if (!debouncedSearchQuery || debouncedSearchQuery.length < minSearchLength) {
            return options.slice(0, initialItemsCount);
        }
        return options.filter((option) => fuzzySearch(debouncedSearchQuery, option.label));
    }, [options, debouncedSearchQuery, minSearchLength, initialItemsCount]);

    // Focus search input when popover opens
    React.useEffect(() => {
        if (open && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [open]);

    // Custom empty message based on search state
    const getEmptyMessage = () => {
        if (!debouncedSearchQuery) {
            return options.length > initialItemsCount
                ? `Showing first ${initialItemsCount} items. Type to search more...`
                : emptyMessage;
        }
        if (debouncedSearchQuery.length < minSearchLength) {
            return `Please enter at least ${minSearchLength} character${minSearchLength > 1 ? "s" : ""} to search`;
        }
        return emptyMessage;
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="primary"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between bg-white hover:bg-white text-white cursor-pointer border-gray-800",
                        !value && "text-muted-foreground",
                        className
                    )}
                    disabled={disabled}
                >
                    {value ? (
                        <div className="flex items-center gap-2">
                            <span className="text-black">{selectedOption?.label}</span>
                        </div>
                    ) : (
                        <span className="text-black">{placeholder}</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-white border-gray-800">
                <div className="flex flex-col w-full">
                    {/* Custom Search Input */}
                    <div className="relative p-2 border-b border-gray-800">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder={searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white text-black border border-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700"
                        />
                    </div>

                    {/* Options List */}
                    <div className="max-h-[300px] overflow-auto">
                        {filteredOptions.length === 0 ? (
                            <div className="p-2 text-black text-sm">{getEmptyMessage()}</div>
                        ) : (
                            filteredOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        onChange(option);
                                        setOpen(false);
                                    }}
                                    className={cn(
                                        "w-full px-4 cursor-pointer py-2 text-left text-black hover:text-white hover:bg-gray-800 flex items-center gap-2",
                                        value === option.value && "bg-gray-800"
                                    )}
                                >
                                    <Check className={cn("h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                                    {option.label}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
