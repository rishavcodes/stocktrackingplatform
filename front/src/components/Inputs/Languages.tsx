import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CategoryInputProps = {
  onChange: React.Dispatch<React.SetStateAction<any>>;
  value: string;
  title: string;
  name: string;
  width?:string;
};

export default function LanguagesInput({
  onChange,
  value,
  title,
  name,
  width="w-[180px]"
}: CategoryInputProps) {
  return (
    <Select
      required
      name={name}
      value={value}
      onValueChange={(e) => onChange((prev: any) => ({ ...prev, language: e }))}
    >
      <SelectTrigger className={`${width}`}>
        <SelectValue placeholder={title} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="english">English</SelectItem>
        <SelectItem value="hindi">Hindi</SelectItem>
        <SelectItem value="gujrati">Gujrati</SelectItem>
        <SelectItem value="marathi">Marathi</SelectItem>{" "}
        <SelectItem value="tamil">Tamil</SelectItem>
        <SelectItem value="telgu">Telgu</SelectItem>
        <SelectItem value="punjabi">Punjabi</SelectItem>
        <SelectItem value="kannada">Kannada</SelectItem>
        <SelectItem value="bengali">Bengali</SelectItem>
        <SelectItem value="malyalam">Malayalam</SelectItem>
      </SelectContent>
    </Select>
  );
}
