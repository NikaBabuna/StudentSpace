/* =============================================================================
 * features/settings/components/AccessClient.tsx — parent-child linking UI
 * -----------------------------------------------------------------------------
 * Role: Parents search for child by email, view linked children/parents,
 *       remove links or send new parent_requests.
 * Dependencies: settings/actions, components/ui, page-container
 * Used by: app/(shell)/settings/access/page.tsx
 * Inputs: current user id, linked parents/children from server
 * Outputs: Forms and lists for family access management
 * ========================================================================== */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  sendParentRequest,
  removeChild as removeChildAction,
  removeParent as removeParentAction,
} from "@/features/settings/actions";
import { PageContainer, PageHeader } from "@/components/shell/page-container";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-line-2 px-4 py-3 text-[13px] text-muted">
      {children}
    </p>
  );
}

function PersonRow({
  name,
  label,
  onRemove,
  removing,
}: {
  name: string;
  label?: string;
  onRemove: () => void;
  removing: boolean;
}) {
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3">
      <Avatar name={name} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-ink">{name}</div>
        {label ? <div className="mt-0.5 text-[11px] text-muted">{label}</div> : null}
      </div>
      {!confirm ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirm(true)}>
          Remove
        </Button>
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[11px] text-muted">Sure?</span>
          <Button type="button" variant="secondary" size="sm" onClick={() => setConfirm(false)}>
            No
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            busy={removing}
            onClick={onRemove}
            className="bg-danger text-white hover:brightness-105"
          >
            Yes
          </Button>
        </div>
      )}
    </div>
  );
}

function PendingRow({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3 opacity-90">
      <Avatar name={name} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] text-ink-2">{name}</div>
        <div className="mt-0.5 text-[11px] text-muted">Request pending — awaiting their response</div>
      </div>
      <Badge tone="warn">Pending</Badge>
    </div>
  );
}

type LinkedPerson = { id: string; full_name: string };
type ChildLink = { student: LinkedPerson };
type ParentLink = { parent: LinkedPerson };
type SentRequest = { id: string; student?: LinkedPerson | null };

export default function AccessClient({
  childLinks,
  parents,
  sentRequests,
}: {
  childLinks: ChildLink[];
  parents: ParentLink[];
  sentRequests: SentRequest[];
}) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  async function handleSendRequest(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    setSendError(null);
    setSendSuccess(false);

    const { error } = await sendParentRequest(email);

    setSearching(false);
    if (error) {
      setSendError(error);
      return;
    }
    setEmail("");
    setSendSuccess(true);
    router.refresh();
  }

  async function removeChild(studentId: string) {
    setRemoving(studentId);
    const { error } = await removeChildAction(studentId);
    setRemoving(null);
    if (error) return;
    router.refresh();
  }

  async function removeParent(parentId: string) {
    setRemoving(parentId);
    const { error } = await removeParentAction(parentId);
    setRemoving(null);
    if (error) return;
    router.refresh();
  }

  return (
    <PageContainer>
      <PageHeader title="Access & accounts" sub="Manage parent-child links." />

      <div className="flex max-w-xl flex-col gap-6">
        <Card>
          <CardHeader className="flex-col items-start gap-1 pb-2">
            <CardTitle>Link a child</CardTitle>
            <CardDescription>Send a request to a student — they&apos;ll accept from their inbox.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <form onSubmit={handleSendRequest} className="flex flex-col gap-3">
              <Field label="Student email" htmlFor="child-email">
                <div className="flex gap-2">
                  <Input
                    id="child-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setSendError(null);
                      setSendSuccess(false);
                    }}
                    placeholder="student@email.com"
                    required
                    className="flex-1"
                  />
                  <Button type="submit" busy={searching} className="shrink-0">
                    {searching ? "Sending…" : "Send request"}
                  </Button>
                </div>
              </Field>

              {sendError ? (
                <div className="rounded-lg bg-danger-tint px-3 py-2 text-[12px] text-danger">{sendError}</div>
              ) : null}
              {sendSuccess ? (
                <div className="rounded-lg bg-ok-tint px-3 py-2 text-[12px] text-ok">
                  Request sent — they&apos;ll see it in their inbox.
                </div>
              ) : null}
            </form>

            {sentRequests.length > 0 ? (
              <div className="flex flex-col gap-2">
                {sentRequests.map((r) => (
                  <PendingRow key={r.id} name={r.student?.full_name ?? "Unknown"} />
                ))}
              </div>
            ) : null}

            {childLinks.length > 0 ? (
              <div className="flex flex-col gap-2">
                {childLinks.map((c) => (
                  <PersonRow
                    key={c.student.id}
                    name={c.student.full_name}
                    label="Linked child"
                    onRemove={() => removeChild(c.student.id)}
                    removing={removing === c.student.id}
                  />
                ))}
              </div>
            ) : null}

            {childLinks.length === 0 && sentRequests.length === 0 ? (
              <EmptyHint>No children linked yet.</EmptyHint>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-col items-start gap-1 pb-2">
            <CardTitle>Your parents</CardTitle>
            <CardDescription>People linked as your parent. You can remove them at any time.</CardDescription>
          </CardHeader>
          <CardContent>
            {parents.length === 0 ? (
              <EmptyHint>No parents linked.</EmptyHint>
            ) : (
              <div className="flex flex-col gap-2">
                {parents.map((p) => (
                  <PersonRow
                    key={p.parent.id}
                    name={p.parent.full_name}
                    label="Linked parent"
                    onRemove={() => removeParent(p.parent.id)}
                    removing={removing === p.parent.id}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
