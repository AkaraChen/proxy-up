import type { ReactNode } from "react";
import { Alert } from "@heroui/react/alert";
import { Card } from "@heroui/react/card";
import { Description } from "@heroui/react/description";
import { Input } from "@heroui/react/input";
import { Label } from "@heroui/react/label";
import { NumberField } from "@heroui/react/number-field";
import { Switch } from "@heroui/react/switch";
import { TextField } from "@heroui/react/textfield";

export function SectionIntro({
  actions,
  description,
  eyebrow,
  title,
}: {
  actions?: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          {eyebrow}
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

export function MetricCard({
  caption,
  label,
  tone,
  value,
}: {
  caption: string;
  label: string;
  tone: "accent" | "mint" | "sun";
  value: string;
}) {
  return (
    <Card.Root className={`metric-card metric-card--${tone}`} variant="secondary">
      <Card.Content className="p-4">
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            {label}
          </span>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-semibold tracking-tight text-slate-950">{value}</span>
            <span className="pb-1 text-sm text-slate-600">{caption}</span>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  );
}

export function InlineAlert({
  description,
  status,
  title,
}: {
  description: string;
  status: "accent" | "danger" | "success" | "warning";
  title: string;
}) {
  return (
    <Alert.Root className="shadow-sm" status={status}>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        <Alert.Description>{description}</Alert.Description>
      </Alert.Content>
    </Alert.Root>
  );
}

export function ConfigTextField({
  description,
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  description?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "password" | "text";
  value?: string;
}) {
  return (
    <TextField.Root className="grid gap-2" fullWidth variant="secondary">
      <Label className="text-sm font-medium text-slate-900">{label}</Label>
      <Input
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value ?? ""}
      />
      {description ? (
        <Description className="text-xs leading-5 text-slate-500">{description}</Description>
      ) : null}
    </TextField.Root>
  );
}

export function ConfigNumberField({
  description,
  label,
  onChange,
  value,
}: {
  description?: string;
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <NumberField.Root
      className="grid gap-2"
      formatOptions={{ useGrouping: false }}
      fullWidth
      maxValue={65535}
      minValue={1}
      onChange={(nextValue) => {
        if (Number.isFinite(nextValue)) {
          onChange(nextValue);
        }
      }}
      value={value}
      variant="secondary"
    >
      <Label className="text-sm font-medium text-slate-900">{label}</Label>
      <NumberField.Group className="flex items-center gap-2">
        <NumberField.DecrementButton aria-label={`Decrease ${label}`}>
          -
        </NumberField.DecrementButton>
        <NumberField.Input />
        <NumberField.IncrementButton aria-label={`Increase ${label}`}>
          +
        </NumberField.IncrementButton>
      </NumberField.Group>
      {description ? (
        <Description className="text-xs leading-5 text-slate-500">{description}</Description>
      ) : null}
    </NumberField.Root>
  );
}

export function ConfigSwitchCard({
  description,
  isSelected,
  label,
  onChange,
}: {
  description: string;
  isSelected: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <Switch.Root
      className="flex items-center justify-between gap-4 rounded-[26px] border border-white/80 bg-white/85 px-4 py-4 shadow-sm"
      isSelected={isSelected}
      onChange={onChange}
      size="md"
    >
      <Switch.Content className="space-y-1">
        <p className="text-sm font-semibold text-slate-950">{label}</p>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </Switch.Content>
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
    </Switch.Root>
  );
}

export function CodePanel({
  description,
  title,
  value,
}: {
  description: string;
  title: string;
  value: string;
}) {
  return (
    <Card.Root className="h-full" variant="secondary">
      <Card.Header className="flex flex-col items-start gap-2 p-5">
        <Card.Title>{title}</Card.Title>
        <Card.Description>{description}</Card.Description>
      </Card.Header>
      <Card.Content className="p-5 pt-0">
        <pre className="code-surface content-auto max-h-[30rem] overflow-auto rounded-[24px] p-4 text-[13px] leading-6">
          {value}
        </pre>
      </Card.Content>
    </Card.Root>
  );
}
