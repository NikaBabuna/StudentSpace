/* =============================================================================
 * ui/field.tsx — labelled form field wrapper
 * -----------------------------------------------------------------------------
 * Composes a <Label>, the control (passed as children), and an optional error
 * or hint line. Standardises form spacing so screens don't re-implement it.
 *
 *   <Field label="Email" htmlFor="email" error={err}>
 *     <Input id="email" … />
 *   </Field>
 * ========================================================================== */
import * as React from "react";

import { cn } from "@/lib/utils";
import { Label } from "./label";

type FieldProps = {
  label?: React.ReactNode;
  /** Associates the label with the control. */
  htmlFor?: string;
  /** Error message — takes precedence over `hint` and colors red. */
  error?: string | null;
  /** Helper text shown when there is no error. */
  hint?: React.ReactNode;
  /** Appends a muted "(optional)" suffix to the label. */
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
};

function Field({ label, htmlFor, error, hint, optional, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <Label htmlFor={htmlFor}>
          {label}
          {optional ? <span className="font-normal text-muted">(optional)</span> : null}
        </Label>
      ) : null}
      {children}
      {error ? (
        <p className="text-[12px] text-danger">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export { Field };
