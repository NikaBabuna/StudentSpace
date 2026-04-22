import AppLayout from "@/components/layout/AppLayout";
import SessionTabs from "@/components/layout/SessionTabs";

const dummyStudent = {
  id: "1",
  name: "Ana Svanidze",
  initials: "AS",
  grade: "Grade 11 · Math & Physics",
  cycleNumber: 3,
  cycleHours: 5,
  cycleTotal: 8,
};

export default async function StudentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AppLayout
      mode="session"
      student={{ ...dummyStudent, id }}
      tutorInitials="TN"
      tutorName="Tutor"
      role="tutor"
    >
      <div
        className="shrink-0"
        style={{ borderBottom: "0.5px solid var(--color-ss-border)" }}
      >
        <div className="px-6 pt-5">
          <div className="text-[11px] mb-3" style={{ color: "var(--color-ss-text-ghost)" }}>
            Students{" "}
            <span style={{ color: "#8a7a60" }}>› {dummyStudent.name} ›</span>
          </div>
        </div>
        <div className="px-6">
          <SessionTabs studentId={id} homeworkBadge={2} chatBadge={1} />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </AppLayout>
  );
}