"use client";

import CreatableSelect from "react-select/creatable";

type OptionTypes = {
  value: string;
  label: string;
};

const bonusFeatures: OptionTypes[] = [
  {
    value: "Proactive Portfolio Management",
    label: "Proactive Portfolio Management",
  },
  {
    value: "High-Yield Dividend Insights",
    label: "High-Yield Dividend Insights",
  },
  {
    value: "Advanced Technical Analysis",
    label: "Advanced Technical Analysis",
  },
  { value: "Educational Resources", label: "Educational Resources" },
  {
    value: "Personalized Investment Recommendations",
    label: "Personalized Investment Recommendations",
  },
  { value: "Comprehensive Tax Planning", label: "Comprehensive Tax Planning" },
  { value: "Global Market Insights", label: "Global Market Insights" },
  {
    value: "Early Access to Research Reports",
    label: "Early Access to Research Reports",
  },
  { value: "VIP Customer Support", label: "VIP Customer Support" },
  {
    value: "Customized Investment Strategies",
    label: "Customized Investment Strategies",
  },
];

import makeAnimated from "react-select/animated";
import { useEffect, useState } from "react";

const animatedComponents = makeAnimated();

type MultiSelectProps = {
  onChange: React.Dispatch<React.SetStateAction<any>>;
  initialFeatures?:string[];
};

export default function MultiSelectBonusFeatures({ onChange, initialFeatures }: MultiSelectProps) {
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
      options={bonusFeatures}
    />
  );
}
