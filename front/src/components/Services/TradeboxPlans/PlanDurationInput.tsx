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

export default function PlanDurationInput({
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
      onValueChange={(e) =>
        onChange((prev) => ({ ...prev, duration: Number(e) }))
      }
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder={title} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="30">1 Month</SelectItem>
        <SelectItem value="90">3 Month</SelectItem>
        <SelectItem value="180">6 Months</SelectItem>
        <SelectItem value="360">12 Months</SelectItem>
      </SelectContent>
    </Select>
  );
}
