/* =============================================================================
 * features/classes/components/NewClassForm.tsx — multi-step class creation wizard
 * -----------------------------------------------------------------------------
 * Role: Client UI for creating a class: basics, schedule, invites, review.
 *       Calls create-class and schedule actions; handles validation feedback.
 * Dependencies: create-class actions, schedule-utils, components/ui
 * Used by: app/(shell)/classes/new/page.tsx
 * Inputs: None (form state internal)
 * Outputs: Redirects to new class on success
 * ========================================================================== */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  LessonScheduleFields,
  isLessonScheduleValid,
  lessonScheduleReviewLabel,
} from "@/features/schedule/components/LessonScheduleFields";
import {
  browserTimeZone,
  buildScheduledAt,
  toDateKey,
} from "@/features/schedule/lib/schedule-utils";
import { NewClassStepper } from "@/features/classes/components/NewClassStepper";
import {
  LEVEL_CUSTOM,
  LEVELS,
  STEP_LEADS,
  SUBJECTS,
  chipButtonClass,
  effectiveLevel,
  type InviteDraft,
} from "@/features/classes/lib/new-class-utils";
import { createClassPipeline, lookupInviteEmail } from "@/features/classes/actions/create-class";

const selectClass =
  "h-11 w-full cursor-pointer rounded-xl border border-line-2 bg-surface px-3.5 text-sm text-ink outline-none transition-colors hover:bg-surface-2 focus-visible:border-accent focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-accent/30";

const chipBase =
  "cursor-pointer rounded-[11px] border px-3.5 py-2.5 text-sm transition-colors";

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={cn(chipBase, chipButtonClass(selected))}>
      {children}
    </button>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-line py-3.5 first:border-t-0">
      <span className="font-mono text-[13px] uppercase tracking-[0.03em] text-muted">{label}</span>
      <span className="text-right text-[15px] font-medium text-ink">{value}</span>
    </div>
  );
}

export default function NewClassForm() {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [created, setCreated] = useState(false);
  const [createdClassId, setCreatedClassId] = useState<string | null>(null);
  const [createdTitle, setCreatedTitle] = useState("");
  const [hadSchedule, setHadSchedule] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteWarning, setInviteWarning] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [levelChoice, setLevelChoice] = useState("");
  const [customLevel, setCustomLevel] = useState("");

  const [scheduleSkipped, setScheduleSkipped] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"once" | "repeat">("repeat");
  const [dateKey, setDateKey] = useState(() => toDateKey(new Date()));
  const [startTime, setStartTime] = useState("16:00");
  const [durationHours, setDurationHours] = useState(1);
  const [weekdays, setWeekdays] = useState<number[]>([new Date().getDay()]);
  const [intervalWeeks, setIntervalWeeks] = useState(1);
  const [hasUntil, setHasUntil] = useState(false);
  const [untilDate, setUntilDate] = useState("");

  const [cycleHours, setCycleHours] = useState("8");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentCurrency, setPaymentCurrency] = useState("GEL");

  const [inviteDraft, setInviteDraft] = useState("");
  const [invites, setInvites] = useState<InviteDraft[]>([]);
  const [inviteLookupError, setInviteLookupError] = useState<string | null>(null);
  const [inviteLookupLoading, setInviteLookupLoading] = useState(false);

  const level = effectiveLevel(levelChoice, customLevel);

  const scheduleValid = useMemo(
    () => isLessonScheduleValid(scheduleMode, { dateKey, time: startTime, weekdays }),
    [scheduleMode, dateKey, startTime, weekdays]
  );

  const scheduleReview = useMemo(
    () =>
      scheduleSkipped
        ? "Skipped — set up later"
        : lessonScheduleReviewLabel(scheduleMode, {
            dateKey,
            time: startTime,
            durationHours,
            weekdays,
            intervalWeeks,
          }),
    [scheduleSkipped, scheduleMode, dateKey, startTime, durationHours, weekdays, intervalWeeks]
  );

  const canContinue =
    step === 0
      ? !!(title.trim() && subject && level)
      : step === 1
        ? scheduleSkipped || scheduleValid
        : true;

  function toggleWeekday(dow: number) {
    setWeekdays((prev) => (prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow]));
  }

  async function handleAddInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteLookupError(null);

    const email = inviteDraft.trim().toLowerCase();
    if (!email) return;
    if (invites.some((i) => i.email === email)) {
      setInviteLookupError("This email is already on the list.");
      return;
    }

    setInviteLookupLoading(true);
    const { name, error: lookupError } = await lookupInviteEmail(email);
    setInviteLookupLoading(false);

    if (lookupError || !name) {
      setInviteLookupError(lookupError ?? "Could not find that account.");
      return;
    }

    setInvites((prev) => [...prev, { email, name }]);
    setInviteDraft("");
  }

  function removeInvite(email: string) {
    setInvites((prev) => prev.filter((i) => i.email !== email));
  }

  async function handleCreate() {
    setError(null);
    setInviteWarning(null);
    setLoading(true);

    const hours = parseInt(cycleHours, 10) || 8;

    let schedule;
    if (!scheduleSkipped && scheduleValid) {
      if (scheduleMode === "once") {
        schedule = {
          mode: "once" as const,
          scheduledAt: new Date(buildScheduledAt(dateKey, startTime)).toISOString(),
          durationHours,
        };
      } else {
        schedule = {
          mode: "repeat" as const,
          weekdays,
          startTime,
          durationHours,
          intervalWeeks,
          anchorDate: toDateKey(new Date()),
          untilDate: hasUntil && untilDate ? untilDate : null,
          timezone: browserTimeZone(),
        };
      }
    }

    const { classId, error: createError, inviteErrors } = await createClassPipeline({
      title: title.trim(),
      subject,
      level,
      cycleHours: hours,
      paymentAmount: paymentAmount ? parseFloat(paymentAmount) : null,
      paymentCurrency,
      schedule,
      inviteEmails: invites.map((i) => i.email),
    });

    setLoading(false);

    if (createError || !classId) {
      setError(createError ?? "Could not create class.");
      return;
    }

    if (inviteErrors?.length) {
      setInviteWarning(
        `Class created, but ${inviteErrors.length} invite(s) could not be sent. You can retry from the class invite page.`
      );
    }

    setCreatedClassId(classId);
    setCreatedTitle(title.trim());
    setHadSchedule(!!schedule);
    setCreated(true);
  }

  function resetWizard() {
    setStep(0);
    setCreated(false);
    setCreatedClassId(null);
    setCreatedTitle("");
    setHadSchedule(false);
    setError(null);
    setInviteWarning(null);
    setTitle("");
    setSubject("");
    setLevelChoice("");
    setCustomLevel("");
    setScheduleSkipped(false);
    setScheduleMode("repeat");
    setDateKey(toDateKey(new Date()));
    setStartTime("16:00");
    setDurationHours(1);
    setWeekdays([new Date().getDay()]);
    setIntervalWeeks(1);
    setHasUntil(false);
    setUntilDate("");
    setCycleHours("8");
    setPaymentAmount("");
    setPaymentCurrency("GEL");
    setInvites([]);
    setInviteDraft("");
  }

  if (created && createdClassId) {
    return (
      <div className="py-10 text-center">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-ok-tint text-[30px] text-ok">
          ✓
        </div>
        <h1 className="font-serif text-[28px] tracking-[-0.01em] text-ink">Class created</h1>
        <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-2">
          &ldquo;{createdTitle}&rdquo; is ready.
          {hadSchedule ? " Sessions have been scheduled." : ""}
          {invites.length ? ` ${invites.length} invite(s) sent.` : ""}
        </p>
        {inviteWarning ? (
          <p className="mx-auto mt-3 max-w-md rounded-xl border border-warn/30 bg-warn-tint/50 px-3.5 py-2.5 text-[12.5px] text-warn">
            {inviteWarning}
          </p>
        ) : null}
        <div className="mt-7 flex justify-center gap-3">
          <Button size="lg" onClick={() => router.push(`/classes/${createdClassId}/overview`)}>
            Open class
          </Button>
          <Button size="lg" variant="secondary" onClick={resetWizard}>
            Create another
          </Button>
        </div>
      </div>
    );
  }

  const reviewRows = [
    { label: "Class name", value: title.trim() || "—" },
    { label: "Subject", value: subject || "—" },
    { label: "Level", value: level || "—" },
    { label: "Schedule", value: scheduleReview },
    {
      label: "Invites",
      value: invites.length ? `${invites.length} to send` : "None yet",
    },
    {
      label: "Payment cycle",
      value: `${cycleHours || "8"} hours${paymentAmount ? ` · ${paymentAmount} ${paymentCurrency}` : ""}`,
    },
  ];

  return (
    <div>
      <div className="mb-7">
        <h1 className="font-serif text-[30px] leading-[1.05] tracking-[-0.01em] text-ink">
          Create a class
        </h1>
        <p className="mt-1.5 text-[15px] text-ink-2">{STEP_LEADS[step]}</p>
      </div>

      <NewClassStepper step={step} />

      <Card>
        <CardContent className="min-h-[300px] pt-7">
          {step === 0 ? (
            <div className="flex flex-col gap-5">
              <Field label="Class name" htmlFor="class-name">
                <Input
                  id="class-name"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mechanics & Motion"
                  autoFocus
                />
              </Field>

              <Field label="Subject">
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS.map((value) => (
                    <Chip key={value} selected={subject === value} onClick={() => setSubject(value)}>
                      {value}
                    </Chip>
                  ))}
                </div>
              </Field>

              <Field label="Level">
                <div className="flex flex-wrap gap-2">
                  {LEVELS.map((value) => (
                    <Chip
                      key={value}
                      selected={levelChoice === value}
                      onClick={() => {
                        setLevelChoice(value);
                        setCustomLevel("");
                      }}
                    >
                      {value}
                    </Chip>
                  ))}
                  <Chip
                    selected={levelChoice === LEVEL_CUSTOM}
                    onClick={() => setLevelChoice(LEVEL_CUSTOM)}
                  >
                    Custom
                  </Chip>
                </div>
              </Field>

              {levelChoice === LEVEL_CUSTOM ? (
                <Field label="Custom level" htmlFor="custom-level">
                  <Input
                    id="custom-level"
                    value={customLevel}
                    onChange={(e) => setCustomLevel(e.target.value)}
                    placeholder="e.g. Grade 8, IB Year 1, Adult learner"
                    autoFocus
                  />
                </Field>
              ) : null}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="flex flex-col gap-5">
              {scheduleSkipped ? (
                <div className="rounded-[11px] border border-dashed border-line-2 px-4 py-8 text-center">
                  <p className="text-[14px] text-muted">
                    No schedule yet — you can add lessons from the class schedule tab.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-4"
                    onClick={() => setScheduleSkipped(false)}
                  >
                    Set up schedule
                  </Button>
                </div>
              ) : (
                <>
                  <LessonScheduleFields
                    mode={scheduleMode}
                    onModeChange={setScheduleMode}
                    time={startTime}
                    onTimeChange={setStartTime}
                    durationHours={durationHours}
                    onDurationHoursChange={setDurationHours}
                    dateKey={dateKey}
                    onDateKeyChange={setDateKey}
                    weekdays={weekdays}
                    onToggleWeekday={toggleWeekday}
                    intervalWeeks={intervalWeeks}
                    onIntervalWeeksChange={setIntervalWeeks}
                    hasUntil={hasUntil}
                    onHasUntilChange={setHasUntil}
                    untilDate={untilDate}
                    onUntilDateChange={setUntilDate}
                  />
                  <div className="border-t border-line pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted"
                      onClick={() => setScheduleSkipped(true)}
                    >
                      Skip for now
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="flex flex-col gap-4">
              <Field
                label={
                  <>
                    Invite students{" "}
                    <span className="font-normal text-muted">(optional — you can add them later)</span>
                  </>
                }
                error={inviteLookupError}
              >
                <form onSubmit={handleAddInvite} className="flex gap-2.5">
                  <Input
                    type="email"
                    value={inviteDraft}
                    onChange={(e) => {
                      setInviteDraft(e.target.value);
                      setInviteLookupError(null);
                    }}
                    placeholder="student@email.com"
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    busy={inviteLookupLoading}
                    className="shrink-0"
                  >
                    Add
                  </Button>
                </form>
              </Field>

              <div className="flex flex-col gap-2">
                {invites.map((invite) => (
                  <div
                    key={invite.email}
                    className="flex items-center gap-3 rounded-[10px] border border-line bg-surface-2 px-3.5 py-2.5"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-tint font-mono text-[12px] font-semibold text-accent">
                      @
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] text-ink">{invite.name}</p>
                      <p className="truncate text-[12px] text-muted">{invite.email}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${invite.email}`}
                      className="px-1 text-[18px] text-muted transition-colors hover:text-danger"
                      onClick={() => removeInvite(invite.email)}
                    >
                      ×
                    </button>
                  </div>
                ))}

                {invites.length === 0 ? (
                  <div className="rounded-[11px] border border-dashed border-line-2 px-4 py-6 text-center text-[14px] text-muted">
                    No students added yet — that&apos;s fine.
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div>
              <h2 className="mb-4 text-[17px] font-semibold text-ink">Review & confirm</h2>
              <div>
                {reviewRows.map((row) => (
                  <ReviewRow key={row.label} label={row.label} value={row.value} />
                ))}
              </div>

              <div className="mt-6 border-t border-line pt-5">
                <p className="mb-3 text-[13px] font-medium text-ink-2">Payment settings</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    label="Cycle hours"
                    htmlFor="cycle-hours"
                    hint={`A new payment cycle starts every ${cycleHours || "—"} completed hours.`}
                  >
                    <Input
                      id="cycle-hours"
                      type="number"
                      min={1}
                      value={cycleHours}
                      onChange={(e) => setCycleHours(e.target.value)}
                    />
                  </Field>
                  <Field label="Payment per cycle" optional>
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <Input
                        type="number"
                        min={0}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="e.g. 200"
                        aria-label="Payment amount"
                      />
                      <select
                        value={paymentCurrency}
                        onChange={(e) => setPaymentCurrency(e.target.value)}
                        className={selectClass}
                        aria-label="Currency"
                      >
                        <option value="GEL">GEL</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="RUB">RUB</option>
                      </select>
                    </div>
                  </Field>
                </div>
              </div>

              {error ? (
                <p className="mt-4 rounded-xl border border-danger/30 bg-danger-tint/50 px-3.5 py-2.5 text-[12.5px] text-danger">
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="mt-5 flex items-center justify-between gap-3">
        {step === 0 ? (
          <Button asChild variant="secondary" size="lg">
            <Link href="/dashboard">
              <ChevronLeftIcon size={16} /> Cancel
            </Link>
          </Button>
        ) : (
          <Button variant="secondary" size="lg" onClick={() => setStep((s) => s - 1)}>
            <ChevronLeftIcon size={16} /> Back
          </Button>
        )}

        {step < 3 ? (
          <Button size="lg" disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>
            Continue →
          </Button>
        ) : (
          <Button size="lg" busy={loading} onClick={handleCreate}>
            Create class
          </Button>
        )}
      </div>
    </div>
  );
}
