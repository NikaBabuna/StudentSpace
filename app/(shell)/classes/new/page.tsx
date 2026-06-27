/* =============================================================================
 * app/(shell)/classes/new/page.tsx — create new class wizard route
 * -----------------------------------------------------------------------------
 * Role: Authenticated tutors open the multi-step NewClassForm.
 * Shell lives in app/(shell)/layout.tsx.
 * ========================================================================== */
import { PageContainer } from "@/components/shell/page-container";
import NewClassForm from "@/features/classes/components/NewClassForm";

export default function NewClassPage() {
  return (
    <PageContainer className="max-w-[660px]">
      <NewClassForm />
    </PageContainer>
  );
}
