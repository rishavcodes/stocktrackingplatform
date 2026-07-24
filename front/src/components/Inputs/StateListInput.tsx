import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { State } from "country-state-city";
import { Dispatch, SetStateAction } from "react";
import { ProviderSignupFormdataType } from "../Auth/ServiceProvider/ServiceProviderSignUpForm/ServiceProviderTypes";

type StateListInputProps = {
  onChange: Dispatch<SetStateAction<ProviderSignupFormdataType>>;
  value: string;
  name: string;
};

export default function StateListInput({
  onChange,
  value,
  name,
}: StateListInputProps) {
  return (
    <div className="w-full">
      <Select
        value={value}
        name={name}
        required
        onValueChange={(e) => onChange((prev) => ({ ...prev, state: e }))}
      >
        <SelectTrigger className="w-[180px] ">
          <SelectValue placeholder="State" className="pl-20" />
        </SelectTrigger>
        <SelectContent className=" h-[200px]">
          {State.getStatesOfCountry("IN").map((state, idx) => {
            return (
              <div key={idx}>
                <SelectItem value={state.isoCode}>{state.name}</SelectItem>
              </div>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
