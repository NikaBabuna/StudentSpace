"use server";

import { createClient } from "@/utils/supabase/server";
import { classCreateSchema, firstError } from "@/lib/validation";

export async function createClass(input: {
  title: string;
  subject?: string;
  level?: string;
  description?: string;
  cycleHours: number;
  paymentAmount?: number | null;
  paymentCurrency?: string;
}): Promise<{ classId: string | null; error: string | null }> {
  const parsed = classCreateSchema.safeParse({
    title: input.title,
    subject: input.subject,
    level: input.level,
    description: input.description,
    cycleHours: input.cycleHours,
  });
  if (!parsed.success) return { classId: null, error: firstError(parsed.error) };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { classId: null, error: "Not signed in." };

  const { data: newClass, error: classError } = await supabase
    .from("classes")
    .insert({
      created_by: user.id,
      title: input.title,
      subject: input.subject || null,
      level: input.level || null,
      description: input.description || null,
      cycle_hours: input.cycleHours,
    })
    .select("id")
    .single();
  if (classError) return { classId: null, error: classError.message };

  const { error: memberError } = await supabase
    .from("class_members")
    .insert({ class_id: newClass.id, user_id: user.id, role: "tutor" });
  if (memberError) return { classId: null, error: memberError.message };

  const { error: cycleError } = await supabase.from("payment_cycles").insert({
    class_id: newClass.id,
    cycle_number: 1,
    payment_amount: input.paymentAmount ?? null,
    payment_currency: input.paymentCurrency ?? "GEL",
  });
  if (cycleError) return { classId: null, error: cycleError.message };

  return { classId: newClass.id, error: null };
}
