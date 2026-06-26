/* =============================================================================
 * features/inbox/components/InboxClient.tsx — pending invites and link requests
 * -----------------------------------------------------------------------------
 * Role: Lists class invites and parent-child requests; accept/decline buttons
 *       call inbox server actions.
 * Dependencies: inbox/actions, components/ui, AppShell context
 * Used by: app/inbox/page.tsx, app/employer/inbox/page.tsx
 * Inputs: invites and parent_requests arrays from server
 * Outputs: Actionable inbox lists with respond handlers
 * ========================================================================== */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { respondInvite, respondParentRequest } from "@/features/inbox/actions";
import { PageContainer, PageHeader } from "@/components/shell/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InboxIcon } from "@/components/icons";

const ROLE_TONE: Record<string, "accent" | "ok" | "warn" | "neutral"> = {
  tutor: "accent",
  student: "ok",
  parent: "warn",
  employer: "neutral",
};

type ClassInfo = {
  id: string;
  title: string;
  subject?: string | null;
  level?: string | null;
};

type Invite = {
  id: string;
  role: string;
  status: string;
  classes: ClassInfo | null;
  invited_by_user: { full_name: string } | null;
};

type ParentRequest = {
  id: string;
  status: string;
  parent: { id: string; full_name: string } | null;
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 font-mono text-[12px] uppercase tracking-[0.06em] text-muted">{children}</h2>
  );
}

function PastRow({
  title,
  detail,
  accepted,
}: {
  title: string;
  detail?: string;
  accepted: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        <span className="text-[13px] font-medium text-ink">{title}</span>
        {detail ? <span className="ml-2 text-[12px] text-muted">{detail}</span> : null}
      </div>
      <Badge tone={accepted ? "ok" : "danger"}>{accepted ? "Accepted" : "Declined"}</Badge>
    </div>
  );
}

export default function InboxClient({
  invites,
  parentRequests,
}: {
  invites: Invite[];
  parentRequests: ParentRequest[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const pendingInvites = invites.filter((i) => i.status === "pending");
  const pastInvites = invites.filter((i) => i.status !== "pending");
  const pendingParentReqs = parentRequests.filter((r) => r.status === "pending");
  const pastParentReqs = parentRequests.filter((r) => r.status !== "pending");

  const totalPending = pendingInvites.length + pendingParentReqs.length;
  const isEmpty =
    totalPending === 0 && pastInvites.length === 0 && pastParentReqs.length === 0;

  async function handleInvite(inviteId: string, accept: boolean) {
    setLoading(inviteId);
    const { error } = await respondInvite(inviteId, accept);
    setLoading(null);
    if (error) return;
    router.refresh();
  }

  async function handleParentRequest(reqId: string, accept: boolean) {
    setLoading(reqId);
    const { error } = await respondParentRequest(reqId, accept);
    setLoading(null);
    if (error) return;
    router.refresh();
  }

  return (
    <PageContainer>
      <PageHeader
        title="Inbox"
        sub={totalPending > 0 ? `${totalPending} pending` : "Nothing pending"}
      />

      {isEmpty ? (
        <EmptyState
          icon={<InboxIcon size={20} />}
          title="Nothing here yet"
          description="Invites and parent link requests will appear here."
        />
      ) : (
        <div className="flex max-w-2xl flex-col gap-8">
          {pendingInvites.length > 0 ? (
            <section>
              <SectionHeading>Class invites</SectionHeading>
              <div className="flex flex-col gap-2.5">
                {pendingInvites.map((invite) => {
                  const cls = invite.classes;
                  const invitedBy = invite.invited_by_user?.full_name ?? "Someone";
                  const meta = [cls?.subject, cls?.level].filter(Boolean).join(" · ");
                  const roleTone = ROLE_TONE[invite.role] ?? "neutral";

                  return (
                    <Card key={invite.id}>
                      <CardContent className="flex items-center gap-3 py-4">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="text-[14px] font-semibold text-ink">
                              {cls?.title ?? "Unknown class"}
                            </span>
                            <Badge tone={roleTone} className="capitalize">
                              {invite.role}
                            </Badge>
                          </div>
                          {meta ? <div className="mb-1 text-[12px] text-ink-2">{meta}</div> : null}
                          <div className="text-[12px] text-muted">Invited by {invitedBy}</div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={loading === invite.id}
                            onClick={() => handleInvite(invite.id, false)}
                          >
                            Decline
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            busy={loading === invite.id}
                            onClick={() => handleInvite(invite.id, true)}
                          >
                            Accept
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          ) : null}

          {pendingParentReqs.length > 0 ? (
            <section>
              <SectionHeading>Parent link requests</SectionHeading>
              <div className="flex flex-col gap-2.5">
                {pendingParentReqs.map((req) => (
                  <Card key={req.id}>
                    <CardContent className="flex items-center gap-3 py-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 text-[14px] font-semibold text-ink">
                          {req.parent?.full_name ?? "Someone"}
                        </div>
                        <div className="text-[12px] text-muted">wants to link as your parent</div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={loading === req.id}
                          onClick={() => handleParentRequest(req.id, false)}
                        >
                          Decline
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          busy={loading === req.id}
                          onClick={() => handleParentRequest(req.id, true)}
                        >
                          Accept
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          {pastInvites.length > 0 ? (
            <section>
              <SectionHeading>Past invites</SectionHeading>
              <div className="flex flex-col gap-2">
                {pastInvites.map((invite) => (
                  <PastRow
                    key={invite.id}
                    title={invite.classes?.title ?? "Unknown class"}
                    detail={`as ${invite.role}`}
                    accepted={invite.status === "accepted"}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {pastParentReqs.length > 0 ? (
            <section>
              <SectionHeading>Past parent requests</SectionHeading>
              <div className="flex flex-col gap-2">
                {pastParentReqs.map((req) => (
                  <PastRow
                    key={req.id}
                    title={`${req.parent?.full_name ?? "Someone"} — parent link`}
                    accepted={req.status === "accepted"}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </PageContainer>
  );
}
