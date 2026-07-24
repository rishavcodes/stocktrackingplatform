"use client";

import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import * as React from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

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

export interface DropdownOption {
	value: string;
	label: string;
	[key: string]: unknown; // Allow additional properties
}

interface MultiSelectDropdownSearchProps {
	options: DropdownOption[];
	value: string[];
	onChange: (values: string[]) => void;
	placeholder?: string;
	emptyMessage?: string;
	className?: string;
	disabled?: boolean;
	searchPlaceholder?: string;
	initialItemsCount?: number;
	minSearchLength?: number;
	debounceMs?: number;
	onSearchChange?: (searchQuery: string) => void;
	isLoading?: boolean;
}

export function MultiSelectDropdownSearch({
	options,
	value = [],
	onChange,
	placeholder = "Select options",
	emptyMessage = "No results found.",
	className,
	disabled = false,
	searchPlaceholder = "Search...",
	initialItemsCount = 10,
	minSearchLength = 1,
	debounceMs = 300,
	onSearchChange,
	isLoading = false,
}: MultiSelectDropdownSearchProps) {
	const [open, setOpen] = React.useState(false);
	const [searchQuery, setSearchQuery] = React.useState("");
	const debouncedSearchQuery = useDebounce(searchQuery, debounceMs);
	const searchInputRef = React.useRef<HTMLInputElement>(null);

	// Cache selected options to persist their display even when they're filtered out
	const [selectedOptionsCache, setSelectedOptionsCache] = React.useState<
		Map<string, DropdownOption>
	>(new Map());

	// Update cache when options change or selections change
	React.useEffect(() => {
		setSelectedOptionsCache((prevCache) => {
			const newCache = new Map(prevCache);
			// Add any new options that are selected to the cache
			options.forEach((option) => {
				if (value.includes(option.value)) {
					newCache.set(option.value, option);
				}
			});
			// Remove options from cache that are no longer selected
			Array.from(newCache.keys()).forEach((key) => {
				if (!value.includes(key)) {
					newCache.delete(key);
				}
			});
			return newCache;
		});
	}, [options, value]);

	// Get selected options from cache to ensure they're always displayed
	const selectedOptions = React.useMemo(() => {
		return value
			.map((v) => selectedOptionsCache.get(v))
			.filter((option): option is DropdownOption => option !== undefined);
	}, [value, selectedOptionsCache]);

	// Call onSearchChange when debounced search query changes
	React.useEffect(() => {
		if (onSearchChange) {
			onSearchChange(debouncedSearchQuery);
		}
	}, [debouncedSearchQuery, onSearchChange]);

	// Filter options based on search query
	const filteredOptions = React.useMemo(() => {
		if (
			!debouncedSearchQuery ||
			debouncedSearchQuery.length < minSearchLength
		) {
			return options.slice(0, initialItemsCount);
		}
		return options.filter((option) =>
			fuzzySearch(debouncedSearchQuery, option.label),
		);
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
			return `Please enter at least ${minSearchLength} character${
				minSearchLength > 1 ? "s" : ""
			} to search`;
		}
		return emptyMessage;
	};

	const handleToggle = (optionValue: string) => {
		if (value.includes(optionValue)) {
			onChange(value.filter((v) => v !== optionValue));
		} else {
			onChange([...value, optionValue]);
		}
	};

	const handleRemove = (optionValue: string, e: React.MouseEvent) => {
		e.stopPropagation();
		onChange(value.filter((v) => v !== optionValue));
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className={cn(
						"w-full justify-between min-h-10 h-auto bg-white dark:bg-input/30 hover:bg-white dark:hover:bg-input/40 text-black dark:text-foreground border-gray-300 dark:border-input",
						!value.length && "text-muted-foreground",
						className,
					)}
					disabled={disabled}
				>
					<div className="flex flex-wrap gap-1 flex-1">
						{selectedOptions.length > 0 ? (
							selectedOptions.map((option) => (
								<div
									key={option.value}
									className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-secondary rounded-md text-sm text-black dark:text-foreground"
								>
									<span>{option.label}</span>
									<button
										type="button"
										onClick={(e) => handleRemove(option.value, e)}
										className="ml-1 hover:bg-gray-200 dark:hover:bg-secondary/80 rounded-full p-0.5 transition-colors"
									>
										<X className="h-3 w-3 text-black dark:text-foreground" />
									</button>
								</div>
							))
						) : (
							<span className="text-muted-foreground">{placeholder}</span>
						)}
					</div>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-black dark:text-foreground" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[var(--radix-popover-trigger-width)] p-0 bg-white dark:bg-popover border-gray-300 dark:border-input"
				align="start"
			>
				<div className="flex flex-col w-full">
					{/* Custom Search Input */}
					<div className="relative p-2 border-b border-gray-200 dark:border-input">
						<Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-muted-foreground" />
						<input
							ref={searchInputRef}
							type="text"
							placeholder={searchPlaceholder}
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full pl-10 pr-4 py-2 bg-white dark:bg-input/30 text-black dark:text-foreground border border-gray-300 dark:border-input rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-ring placeholder:text-gray-400 dark:placeholder:text-muted-foreground"
						/>
					</div>

					{/* Options List */}
					<div className="max-h-[300px] overflow-auto">
						{isLoading ? (
							<div className="p-2 text-gray-500 dark:text-muted-foreground text-sm">
								Loading...
							</div>
						) : filteredOptions.length === 0 ? (
							<div className="p-2 text-gray-500 dark:text-muted-foreground text-sm">
								{getEmptyMessage()}
							</div>
						) : (
							filteredOptions.map((option) => {
								const isSelected = value.includes(option.value);
								return (
									<button
										key={option.value}
										type="button"
										onClick={() => handleToggle(option.value)}
										className={cn(
											"w-full px-4 cursor-pointer py-2 text-left text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-secondary/80 flex items-center gap-2 transition-colors",
											isSelected && "bg-gray-100 dark:bg-secondary font-medium",
										)}
									>
										<Check
											className={cn(
												"h-4 w-4 text-primary dark:text-primary shrink-0",
												isSelected ? "opacity-100" : "opacity-0",
											)}
										/>
										{option.label}
									</button>
								);
							})
						)}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
