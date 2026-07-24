import { ChangeEventHandler } from "react";
import { useKeyboardField } from "@/lib/keyboardForm";
import { FIELD_LABEL_CLASS, inputClasses } from "./inputStyles";

type InputProps = {
  title: string;
  type: string;
  name: string;
  value?: string | number;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  min?: string;
  max?: string;
  autoFocus?: boolean;
  step?: number;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onWheel?: (event: React.WheelEvent<HTMLInputElement>) => void;
  /**
   * If provided, this input registers with the surrounding KeyboardFormProvider
   * so Enter advances focus to the next field in the form's defined order.
   */
  fieldId?: string;
  /** @deprecated kept for back-compat; styling is now unified via inputClasses. */
  labelStyle?: string;
  /** @deprecated kept for back-compat; styling is now unified via inputClasses. */
  roundness?: string;
  /** @deprecated kept for back-compat; styling is now unified via inputClasses. */
  height?: string;
  /** @deprecated kept for back-compat; styling is now unified via inputClasses. */
  paddingRight?: string;
};

export default function Input({
  title,
  type,
  name,
  value,
  placeholder = "",
  min,
  max,
  disabled = false,
  required,
  step,
  onWheel,
  autoFocus = false,
  onChange,
  fieldId,
}: InputProps) {
  const { ref, onKeyDown } = useKeyboardField(fieldId ?? "", { type: "input" });

  return (
    <div className="flex flex-col w-full">
      <label htmlFor={name} className={FIELD_LABEL_CLASS}>
        {title}
        {required && !disabled && (
          <span className="text-red-500 ml-0.5">*</span>
        )}
      </label>
      <input
        ref={fieldId ? (ref as React.Ref<HTMLInputElement>) : undefined}
        onKeyDown={fieldId ? onKeyDown : undefined}
        required={required}
        type={type}
        autoFocus={autoFocus}
        name={name}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        onWheel={onWheel}
        value={value !== undefined ? value.toString() : ""}
        placeholder={disabled ? "—" : placeholder}
        onChange={onChange}
        className={inputClasses(disabled)}
      />
    </div>
  );
}
