"use client";

import Select from "react-select";

type OptionTypes = {
  value: string;
  label: string;
};

const options: OptionTypes[] = [
  { value: "equity", label: "Equity" },
  { value: "commodity", label: "Commodity" },
  { value: "forex", label: "Forex" },
  { value: "bonds", label: "Bonds" },
  { value: "option buying", label: "option buying" },
  { value: "future options", label: "future options" },
  { value: "investing", label: "investing" },
];

{/* <SelectItem value="All">All</SelectItem>
        <SelectItem value="Equity Cash">Equity Cash</SelectItem>
        <SelectItem value="Future and Option">Future and Option</SelectItem>
        <SelectItem value="Long and Option">Long and Option</SelectItem>
        <SelectItem value="Commodities">Commodities</SelectItem>
        <SelectItem value="Options Buying">Options Buying</SelectItem> */}
import makeAnimated from "react-select/animated";

const animatedComponents = makeAnimated();

type MultiSelectProps = {
  onChange: React.Dispatch<React.SetStateAction<any>>;
  value?: string[];
};

export default function MultiSelect({ onChange, value = [] }: MultiSelectProps) {
  const selectedOptions = options.filter((o) => value.includes(o.value));
  return (
    <Select
      className="dark:text-white/70 dark:bg-black my-react-select-container"
      classNamePrefix="my-react-select"
      closeMenuOnSelect={false}
      components={animatedComponents}
      isMulti
      value={selectedOptions}
      onChange={(e) => {
        const values = (e as OptionTypes[]).map((item) => item.value);
        onChange(values);
      }}
      options={options}
    />
  );
}
