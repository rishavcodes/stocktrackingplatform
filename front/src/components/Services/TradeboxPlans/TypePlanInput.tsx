import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { planDataTypes } from "./TradeboxPlans";

type CategoryInputProps = {
  onChange: React.Dispatch<React.SetStateAction<planDataTypes>>;
  value: string;
  title: string;
  name: string;
};

export default function TypePlanInput({
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
      onValueChange={(e) => onChange((prev) => ({ ...prev, planName: e }))}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder={title} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="silver">Silver</SelectItem>
        <SelectItem value="gold">Gold</SelectItem>
        <SelectItem value="platinum">Platinum</SelectItem>
      </SelectContent>
    </Select>
  );
}
