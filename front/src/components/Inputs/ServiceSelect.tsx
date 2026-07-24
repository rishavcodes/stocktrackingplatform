import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ServiceSelectProps = {
  name: string;
  value: string;
  onChange: React.Dispatch<React.SetStateAction<any>>;
  services: Array<{ _id: string; title: string }>;
};

const ServiceSelect: React.FC<ServiceSelectProps> = ({
  name,
  value,
  onChange,
  services,
}) => {
  return (
    <Select
      name={name}
      value={value}
      onValueChange={(e) => onChange((prev: any) => ({ ...prev, [name]: e }))}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select Service" />
      </SelectTrigger>
      <SelectContent>
        {services.map((service) => (
          <SelectItem key={service._id} value={service._id}>
            {service.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default ServiceSelect;
