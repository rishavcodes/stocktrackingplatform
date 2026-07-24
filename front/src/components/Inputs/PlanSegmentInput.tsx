"use client";

import { useEffect, useState } from "react";
import CreatableSelect from "react-select/creatable";
import makeAnimated from "react-select/animated";
import { SingleValue, MultiValue, ActionMeta } from "react-select";

const animatedComponents = makeAnimated();

type OptionType = {
  value: string;
  label: string;
};

type PlanSegmentInputProps = {
  onChange: React.Dispatch<React.SetStateAction<any>>;
  value: string;
  title: string;
  name: string;
  width?: string;
};

const defaultOptions: OptionType[] = [
  { value: "Equity Cash", label: "Equity Cash" },
  { value: "Future and Option", label: "Future and Option" },
  { value: "Commodities", label: "Commodities" },
  { value: "Options Buying", label: "Options Buying" },
];

export default function PlanSegmentInput({
  onChange,
  value,
  title,
  name,
  width = "w-[180px]",
}: PlanSegmentInputProps) {
  const [options, setOptions] = useState<OptionType[]>(defaultOptions);
  const [selectedOption, setSelectedOption] = useState<OptionType | null>(null);

  // Initialize selected option
  useEffect(() => {
    if (value) {
      const existing = options.find((opt) => opt.value === value);
      if (existing) setSelectedOption(existing);
      else {
        const newOption = { value, label: value };
        setOptions((prev) => [...prev, newOption]);
        setSelectedOption(newOption);
      }
    }
  }, [value, options]);

  const handleChange = (
    newValue: SingleValue<OptionType> | MultiValue<OptionType>, 
    actionMeta: ActionMeta<OptionType>
  ) => {
    const option = Array.isArray(newValue) ? newValue[0] : newValue; 
    if (option) {
      if (!options.find((o) => o.value === option.value)) {
        setOptions([...options, option]);
      }
      setSelectedOption(option);
      onChange((prev: any) => ({ ...prev, segment: option.value }));
    } else {
      setSelectedOption(null);
      onChange((prev: any) => ({ ...prev, segment: "" }));
    }
  };

  return (
    <div className={width}>
      <CreatableSelect
        components={animatedComponents}
        isClearable
        value={selectedOption}
        onChange={handleChange}
        options={options}
        placeholder={title}
      />
    </div>
  );
}
