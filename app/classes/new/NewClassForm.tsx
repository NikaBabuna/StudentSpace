"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { classCreateSchema, firstError } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClass } from "./actions";

// Shared select styling — matches the <Input> primitive (no Select primitive yet).
const selectClass =
  "h-11 w-full cursor-pointer rounded-xl border border-line-2 bg-surface px-3.5 text-sm text-ink outline-none transition-colors focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30";

export default function NewClassForm() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [description, setDescription] = useState("");
  const [cycleHours, setCycleHours] = useState("8");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentCurrency, setPaymentCurrency] = useState("GEL");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const hours = parseInt(cycleHours) || 8;
    const parsed = classCreateSchema.safeParse({ title, subject, level, description, cycleHours: hours });
    if (!parsed.success) {
      setError(firstError(parsed.error));
      return;
    }

    setLoading(true);

    const { classId, error: createError } = await createClass({
      title,
      subject,
      level,
      description,
      cycleHours: hours,
      paymentAmount: paymentAmount ? parseFloat(paymentAmount) : null,
      paymentCurrency,
    });

    if (createError || !classId) {
      setError(createError ?? "Could not create class.");
      setLoading(false);
      return;
    }

    router.push(`/classes/${classId}/overview`);
  }

  return (
    <Card className="max-w-[560px]">
      <CardContent className="pt-5">
        <form onSubmit={handleCreate} className="flex flex-col gap-5">
          <Field label="Class title" htmlFor="title" error={error && !title.trim() ? error : null}>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Ana — Math & Physics"
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Subject" htmlFor="subject" optional>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Math & Physics"
              />
            </Field>
            <Field label="Level" htmlFor="level" optional>
              <Input
                id="level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                placeholder="e.g. Grade 11"
              />
            </Field>
          </div>

          <Field label="Description" htmlFor="description" optional>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Any notes visible to all class members…"
            />
          </Field>

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
              placeholder="e.g. 8"
            />
          </Field>

          <div className="border-t border-line pt-5">
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
                  <option value="GEL">GEL — Lari</option>
                  <option value="USD">USD — Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="RUB">RUB — Ruble</option>
                </select>
              </div>
            </Field>
          </div>

          {error && title.trim() ? (
            <p className="rounded-xl border border-danger/30 bg-danger-tint/50 px-3.5 py-2.5 text-[12.5px] text-danger">
              {error}
            </p>
          ) : null}

          <div className="flex gap-3 pt-1">
            <Button asChild variant="secondary" className="flex-1">
              <Link href="/dashboard">Cancel</Link>
            </Button>
            <Button type="submit" busy={loading} className="flex-1">
              {loading ? "Creating" : "Create class"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
