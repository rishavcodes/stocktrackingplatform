import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PaidEventSelectProps = {
  name: string;
  value: string;
  onChange: React.Dispatch<React.SetStateAction<any>>;
  events: Array<{ _id: string; title: string }>;
};

const PaidEventSelect: React.FC<PaidEventSelectProps> = ({ name, value, onChange, events }) => {
  return (
    <Select
      name={name}
      value={value}
      onValueChange={(e) => onChange((prev: any) => ({ ...prev, [name]: e }))}
    >
      <SelectTrigger className="w-full ">
        <SelectValue placeholder="Select Event" />
      </SelectTrigger>
      <SelectContent>
        {events?.map((event) => (
          <SelectItem key={event._id} value={event._id}>
            {event.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default PaidEventSelect;