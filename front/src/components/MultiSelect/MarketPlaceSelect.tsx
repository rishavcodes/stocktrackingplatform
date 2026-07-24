"use client";

import { useSession } from "next-auth/react";
import Select from "react-select";
import makeAnimated from "react-select/animated";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";

const animatedComponents = makeAnimated();

type OptionTypes = {
	value: string;
	label: string;
};

type MarketPlaceProps = {
	onChange: React.Dispatch<React.SetStateAction<string[]>>;
	initialValues?: string[];
};

const MarketPlaceSelect = ({ onChange, initialValues = [] }: MarketPlaceProps) => {
	const session = useSession();

	const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace`;

	const headers = {
		"Content-Type": "application/json",
		Authorization: `Bearer ${session.data?.backendToken}`,
	};
	
	const { data, isLoading } = useSWR<{
		data: any[];
	}>(url, (url: string) => fetcher(url, { headers }));

	// Map API data to options
	const options: OptionTypes[] = data?.data?.map((marketplace: any) => ({
		value: marketplace?._id || marketplace?.id, // Use _id or id
		label: marketplace.name || marketplace.title || `Marketplace ${marketplace?._id || marketplace?.id}`
	})) || [];

	// Set initial selected values
	const defaultValues = options.filter(option => 
		initialValues.includes(option.value)
	);

	

	return (
		<div className="space-y-2">
			<Select
				className="w-full border rounded-md my-react-select-container"
				classNamePrefix="my-react-select"
				closeMenuOnSelect={false}
				components={animatedComponents}
				isMulti
				defaultValue={defaultValues} // Set initial selected values
				onChange={(selectedOptions) => {
					const values = (selectedOptions as OptionTypes[]).map((item) => item.value);
					console.log("Selected marketplace IDs:", values);
					onChange(values);
				}}
				options={options}
				placeholder="Select marketplaces..."
				noOptionsMessage={() => "No marketplaces found"}
			/>
			
			{/* Debug info - remove in production */}
			
		</div>
	);
};

export default MarketPlaceSelect;