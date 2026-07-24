import { Input } from "@/components";
import { ChangeEvent } from "react";

type RecordInputProps = {
  title: { time: number; frame: string };
  name: string;
  value: number;
  changeHandler: (e: ChangeEvent<HTMLInputElement>) => void;
};

export default function RecordInput({
  title,
  value,
  name,
  changeHandler,
}: RecordInputProps) {
  return (
    <div className="flex items-stretch justify-start">
      <div
        className={`bg-lightGrey dark:bg-darkGrey ${
          title.time === 6 ? "ss:px-10 xs:px-5 px-3" : "ss:px-14 xs:px-7 px-5"
        } flex gap-1 items-center`}
      >
        <div>{title.time}</div>
        <div>{title.frame}</div>
      </div>
      <Input
        title=""
        type="number"
        name={name}
        value={value}
        height="py-2"
        roundness=""
        paddingRight="pr-2"
        required={false}
        labelStyle="text-black font-semibold dark:text-white/70 "
        onChange={changeHandler}
      />
    </div>
  );
}
