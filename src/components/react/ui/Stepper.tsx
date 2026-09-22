import { Icon } from './Icon';

export interface Step {
  label: string;
  state: 'done' | 'current' | 'pending';
}

const circleClasses: Record<Step['state'], string> = {
  done: 'bg-green-mid text-white',
  current: 'bg-green-dark text-white',
  pending: 'bg-white text-text-ter border border-gray-border',
};

export function Stepper({ steps }: { steps: Step[] }) {
  return (
    <div className="flex items-center mb-[18px]">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center flex-1 last:flex-initial">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-semibold ${circleClasses[step.state]}`}>
              {step.state === 'done' ? <Icon name="check" size={12} /> : i + 1}
            </div>
            <div className="text-[10px] text-text-ter whitespace-nowrap">{step.label}</div>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-[1.5px] mx-1 mb-4 ${step.state === 'done' ? 'bg-green-mid' : 'bg-gray-border'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
