"use client";

import Select from "react-select";
import makeAnimated from "react-select/animated";

type OptionTypes = {
  value: string;
  label: string;
};

const options: OptionTypes[] = [
  { value: "subscribers", label: "Subscribers" },
];

const animatedComponents = makeAnimated();

type MultiSelectProps = {
  onChange: React.Dispatch<React.SetStateAction<any>>;
};

export default function ShareWithSelect({ onChange }: MultiSelectProps) {
  const defaultValue = options; // Subscribers by default

  return (
    <div onClick={() => onChange(["subscribers"])}>
      <Select
        className="w-full border rounded-md p-2 my-react-select-container cursor-not-allowed"
        classNamePrefix="my-react-select"
        closeMenuOnSelect={true}
        components={animatedComponents}
        isMulti
        isDisabled={true} 
        value={defaultValue} 
        options={options}
      />
    </div>
  );
}
