/* =============================================================================
 * features/classes/components/NewClassStepper.tsx — wizard step indicator
 * -----------------------------------------------------------------------------
 * Role: Visual progress for the new-class wizard (Basics → Schedule → …).
 * Dependencies: new-class-utils (WIZARD_STEPS), lib/utils (cn)
 * Used by: NewClassForm
 * Inputs: step (1-based current step index)
 * Outputs: Horizontal stepper UI
 * ========================================================================== */
import { cn } from "@/lib/utils";
import { WIZARD_STEPS } from "@/features/classes/lib/new-class-utils";

export function NewClassStepper({ step }: { step: number }) {
  return (
    <div className="mb-7 flex items-center">
      {WIZARD_STEPS.map((wizardStep, index) => {
        const done = index < step;
        const active = index === step;
        const isLast = index === WIZARD_STEPS.length - 1;

        return (
          <div key={wizardStep.label} className="flex flex-1 items-center">
            <div className="flex min-w-0 items-center gap-2">
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-[13px] font-semibold",
                  done && "bg-accent text-accent-ink",
                  active && !done && "border-[1.5px] border-accent bg-accent-tint text-accent",
                  !active && !done && "border border-line-2 bg-surface-2 text-muted"
                )}
              >
                {done ? "✓" : index + 1}
              </div>
              <span
                className={cn(
                  "hidden truncate text-[13px] sm:inline",
                  active || done ? "font-semibold text-ink" : "font-medium text-muted"
                )}
              >
                {wizardStep.label}
              </span>
            </div>
            {!isLast ? (
              <div className={cn("mx-2 h-0.5 flex-1 sm:mx-3", done ? "bg-accent" : "bg-line")} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
