import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

// Small set of styled primitives. Server-component safe (no hooks).

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
const buttonStyles: Record<ButtonVariant, string> = {
  primary: "bg-brand text-brand-foreground hover:opacity-90",
  secondary: "bg-surface border border-border hover:bg-gray-50",
  ghost: "hover:bg-gray-100",
  danger: "bg-surface border border-border text-danger hover:bg-red-50",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: "sm" | "md" }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition disabled:opacity-50 disabled:pointer-events-none",
        size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 text-sm",
        buttonStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

const fieldBase =
  "w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldBase, "h-10", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(fieldBase, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldBase, "min-h-24 py-2", className)} {...props} />;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-lg border border-border bg-surface", className)} {...props} />;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Badge({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700", className)}
      {...props}
    />
  );
}

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="overflow-x-auto">
      <table
        className={cn(
          "w-full text-sm [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted [&_td]:px-4 [&_td]:py-3 [&_tbody_tr]:border-t [&_tbody_tr]:border-border",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-danger">{message}</p>;
}
