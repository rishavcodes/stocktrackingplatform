import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { City } from "country-state-city";

import { ProviderSignupFormdataType } from "../Auth/ServiceProvider/ServiceProviderSignUpForm/ServiceProviderTypes";

type CityListInputProps = {
  selectedState: string;
  onChange: React.Dispatch<React.SetStateAction<ProviderSignupFormdataType>>;
  value: string;
  name: string;
};

export default function CityListInput({
  selectedState,
  onChange,
  value,
  name,
}: CityListInputProps) {
  return (
    <Select
      required
      value={value}
      name={name}
      onValueChange={(e) => {
        onChange((prev) => ({ ...prev, city: e }));
      }}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="City" />
      </SelectTrigger>
      <SelectContent className=" h-[200px]">
        {City.getCitiesOfState("IN", selectedState).map((city, idx) => {
          return (
            <SelectItem key={idx} value={city.name}>
              {city.name}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
