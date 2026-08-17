interface RadioOption<T extends string> {
  value: T;
  label: string;
}

interface RadioGroupProps<T extends string> {
  options: RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function RadioGroup<T extends string>({ options, value, onChange }: RadioGroupProps<T>) {
  return (
    <div className="flex gap-3.5">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <label key={option.value} className="flex items-center gap-1.5 text-[12.5px] cursor-pointer">
            <span
              onClick={() => onChange(option.value)}
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                selected ? 'border-green-dark bg-green-dark' : 'border-gray-border'
              }`}
            >
              {selected && <span className="w-[5px] h-[5px] rounded-full bg-white" />}
            </span>
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
