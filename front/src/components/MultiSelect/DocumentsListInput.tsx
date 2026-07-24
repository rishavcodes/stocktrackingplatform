"use client";

import fetcher from "@/lib/data/setup";
import Select from "react-select";
import makeAnimated from "react-select/animated";
import useSWR from "swr";
import { useEffect, useState } from "react";

const animatedComponents = makeAnimated();

type OptionTypes = {
  value: {
    name: string;
    link: string;
    _id: string;
  };
  label: string;
};

type DocumentData = Record<
  string,
  {
    name: string;
    link: string;
    _id: string;
  }
>;

type MultiSelectProps = {
  onChange: React.Dispatch<React.SetStateAction<any>>;
  id: string;
  initialDocuments?: {
    name: string;
    link: string;
    _id: string;
  }[];
};

export default function DocumentsListInput({
  onChange,
  id,
  initialDocuments = [],
}: MultiSelectProps) {
  const { data } = useSWR<{ data: DocumentData }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/services/getdocuments?id=${id}`,
    fetcher
  );

  const [selectedOptions, setSelectedOptions] = useState<OptionTypes[]>([]);

  const options: OptionTypes[] = [];

  if (data?.data) {
    Object.values(data.data).forEach((document) => {
      options.push({ value: document, label: document.name });
    });
  }

  useEffect(() => {
    if (initialDocuments.length > 0) {
      const defaultSelected = initialDocuments.map((doc) => ({
        value: doc,
        label: doc.name,
      }));
      setSelectedOptions(defaultSelected);
    }
  }, [initialDocuments]);

  return (
    <Select
      className="dark:text-white/70 dark:bg-black my-react-select-container"
      classNamePrefix="my-react-select"
      closeMenuOnSelect={false}
      components={animatedComponents}
      isMulti
      value={selectedOptions}
      onChange={(e) => {
        const selected = e as OptionTypes[];
        const values = selected.map((item) => item.value);
        onChange(values);
        setSelectedOptions(selected);
      }}
      options={options}
    />
  );
}
