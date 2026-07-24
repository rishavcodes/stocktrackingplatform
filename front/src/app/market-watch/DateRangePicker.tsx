import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CategoryInputProps = {
  onChange: React.Dispatch<React.SetStateAction<string>>;
  value: string;
  title: string;
  name: string;
  width?: string;
};

export default function DateRangePicker({
  onChange,
  value,
  title,
  name,
  width = "w-[180px]",
}: CategoryInputProps) {
  return (
    <Select
      required
      name={name}
      value={value}
      onValueChange={(e) => onChange(e)}
    >
      <SelectTrigger className={`${width}`}>
        <SelectValue placeholder={title} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7">Previous week</SelectItem>
        <SelectItem value="30">Previous Month</SelectItem>
        <SelectItem value="90">Last 3 months</SelectItem>
      </SelectContent>
    </Select>
  );
}
