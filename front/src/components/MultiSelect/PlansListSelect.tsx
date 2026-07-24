"use client";

import fetcher from "@/lib/data/setup";
import { OurServicesType } from "@/lib/types";
import Select from "react-select";

type OptionTypes = {
  value: string;
  label: string;
};

import makeAnimated from "react-select/animated";
import useSWR from "swr";

const animatedComponents = makeAnimated();

type MultiSelectProps = {
  onChange: React.Dispatch<React.SetStateAction<any>>;
  id: string;
  initialValues?: string[];
};

export default function PlansListSelect({ onChange, id, initialValues = [] }: MultiSelectProps) {
  const { data } = useSWR<{ data: OurServicesType[] }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/services/allservices/sharewith?id=${id}`,
    fetcher
  );

  // Render a placeholder until the SWR fetch resolves. react-select reads
  // `defaultValue` once on mount, so mounting before `options` are available
  // means any `initialValues` we pass would never appear as preselected.
  if (!data?.data) {
    return (
      <div className="w-full h-[38px] border rounded-md bg-gray-50 dark:bg-gray-800 animate-pulse" />
    );
  }

  const options: OptionTypes[] = data.data
    .slice()
    .sort((a: any, b: any) =>
      (a.title ?? "").localeCompare(b.title ?? "", undefined, {
        sensitivity: "base",
      })
    )
    .map((plan: any) => ({
      value: plan._id,
      label: plan.title,
    }));

  const defaultValues = options.filter((option) =>
    initialValues.includes(option.value)
  );

  return (
    <Select
      className="w-full border rounded-md my-react-select-container"
      classNamePrefix="my-react-select"
      closeMenuOnSelect={false}
      components={animatedComponents}
      isMulti
      defaultValue={defaultValues.length > 0 ? defaultValues : undefined}
      onChange={(e) => {
        const values = (e as OptionTypes[]).map((item) => item.value);
        onChange(values);
      }}
      options={options}
    />
  );
}
