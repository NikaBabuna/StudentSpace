/* =============================================================================
 * features/dashboard/components/ClassesClient.tsx — class list page UI
 * -----------------------------------------------------------------------------
 * Role: Groups and displays all classes the user belongs to (teaching vs
 *       attending). Uses shared ClassCard/ClassGroup components.
 * Dependencies: class-shared, lib/dashboard-data types
 * Used by: app/dashboard/classes/page.tsx
 * Inputs: Preloaded class rows from server
 * Outputs: Filterable/grouped class grid with navigation links
 * ========================================================================== */
"use client";

import Link from "next/link";

import type { DashboardClassRow } from "@/lib/dashboard-data";
import { PageContainer, PageHeader } from "@/components/shell/page-container";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PlusIcon, ClassesIcon } from "@/components/icons";
import { ClassGroup } from "@/features/dashboard/components/class-shared";

export default function ClassesClient({
  teaching,
  attending,
  observing,
  allClasses,
}: {
  teaching: DashboardClassRow[];
  attending: DashboardClassRow[];
  observing: DashboardClassRow[];
  allClasses: DashboardClassRow[];
}) {
  return (
    <PageContainer>
      <PageHeader
        title="My classes"
        sub={
          allClasses.length === 0
            ? "No classes yet"
            : `${allClasses.length} ${allClasses.length === 1 ? "class" : "classes"}`
        }
        action={
          <Button asChild>
            <Link href="/classes/new">
              <PlusIcon size={16} /> New class
            </Link>
          </Button>
        }
      />

      {allClasses.length === 0 ? (
        <EmptyState
          icon={<ClassesIcon size={20} />}
          title="No classes yet"
          description="Create your first class or wait for an invite from a tutor."
          action={
            <Button asChild>
              <Link href="/classes/new">
                <PlusIcon size={16} /> Create class
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <ClassGroup title="Classes I teach" classes={teaching} />
          <ClassGroup title="Classes I attend" classes={attending} />
          <ClassGroup title="Classes I observe" classes={observing} />
        </>
      )}
    </PageContainer>
  );
}
