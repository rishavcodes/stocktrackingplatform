"use client";

import CreatableSelect from "react-select/creatable";

type OptionTypes = {
  value: string;
  label: string;
};

const options: OptionTypes[] = [
  { value: "Exclusive Stock Picks", label: "Exclusive Stock Picks" },
  { value: "In-Depth Market Analysis", label: "In-Depth Market Analysis" },
  { value: "Tailored Risk Assessment", label: "Tailored Risk Assessment" },
  {
    value: "Optimized Investment Timeframes",
    label: "Optimized Investment Timeframes",
  },
  { value: "Sector Spotlight", label: "Sector Spotlight" },
  {
    value: "Precision Entry & Exit Points",
    label: "Precision Entry & Exit Points",
  },
  {
    value: "Real-Time Performance Tracking",
    label: "Real-Time Performance Tracking",
  },
  {
    value: "Daily/Weekly Market Updates",
    label: "Daily/Weekly Market Updates",
  },
  { value: "Proactive Portfolio Management", label: "Proactive Portfolio Management" },
  {
    value: "Educational Resources",
    label: "Educational Resources",
  },
  {
    value:"input",
    label:"dfrfcerf",
  }
];

{
  /* <SelectItem value="All">All</SelectItem>
        <SelectItem value="Equity Cash">Equity Cash</SelectItem>
        <SelectItem value="Future and Option">Future and Option</SelectItem>
        <SelectItem value="Long and Option">Long and Option</SelectItem>
        <SelectItem value="Commodities">Commodities</SelectItem>
        <SelectItem value="Options Buying">Options Buying</SelectItem> */
}
import makeAnimated from "react-select/animated";
import { useEffect, useState } from "react";

const animatedComponents = makeAnimated();

type MultiSelectProps = {
  onChange: React.Dispatch<React.SetStateAction<any>>;
  initialFeatures?: string[];
};

export default function MultiSelectKeyFeatures({ onChange, initialFeatures }: MultiSelectProps) {
  const [selectedOptions, setSelectedOptions] = useState<OptionTypes[]>([]);

  useEffect(() => {
    if (initialFeatures && initialFeatures.length > 0) {
      const defaultValues = initialFeatures.map((feature) => ({
        value: feature,
        label: feature,
      }));
      setSelectedOptions(defaultValues);
    }
  }, [initialFeatures]);

  return (
    <CreatableSelect
      className="w-full border rounded-md p-2 my-react-select-container"
      classNamePrefix="my-react-select"
      closeMenuOnSelect={false}
      components={animatedComponents}
      isMulti
      value={selectedOptions} 
      onChange={(e) => {
        const values = (e as OptionTypes[]).map((item) => item.value);
        onChange(values);
        setSelectedOptions(e as OptionTypes[]); 
      }}
      options={options}
    />
  );
}




