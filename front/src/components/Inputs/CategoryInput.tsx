import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProviderSignupFormdataType } from "../Auth/ServiceProvider/ServiceProviderSignUpForm/ServiceProviderTypes";

type CategoryInputProps = {
  onChange: React.Dispatch<React.SetStateAction<ProviderSignupFormdataType>>;
  value: string;
  title: string;
  name: string;
};

export default function CategoryInput({
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
      onValueChange={(e) => onChange((prev) => ({ ...prev, category: e }))}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder={title} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Research Analyst">Research Analyst</SelectItem>
        <SelectItem value="Registered Investment Advisor">
          Registered Investment Advisor
        </SelectItem>
        <SelectItem value="PMS">PMS</SelectItem>
        <SelectItem value="Mutual Funds">Mutual Funds</SelectItem>{" "}
        <SelectItem value="Trainers">Trainers</SelectItem>
        <SelectItem value="Stock Brokers">Stock Brokers</SelectItem>
        <SelectItem value="AIF">AIF</SelectItem>
        <SelectItem value="Forex Experts">Forex Experts</SelectItem>
        <SelectItem value="Tax Experts">Tax Experts</SelectItem>
        <SelectItem value="Banking">Banking</SelectItem>
      </SelectContent>
    </Select>
  );
}
