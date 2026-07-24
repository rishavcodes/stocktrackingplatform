import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProviderSignupFormdataType } from "./ServiceProviderTypes";

type CategoryInputProps = {
  onChange: React.Dispatch<React.SetStateAction<ProviderSignupFormdataType>>;
  value: string;
  title: string;
  name: string;
};

export default function SPTypesInput({
  onChange,
  value,
  title,
  name,
}: CategoryInputProps) {
  return (
    <Select
      required
      name={name}
      value={value}
      onValueChange={(e) => onChange((prev) => ({ ...prev, type: e }))}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder={title} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Individual">Individual</SelectItem>
        <SelectItem value="Non Individual">Non Individual</SelectItem>
      </SelectContent>
    </Select>
  );
}
