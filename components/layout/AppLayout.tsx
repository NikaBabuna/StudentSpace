import Sidebar from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  mode: "dashboard" | "session";
  student?: {
    id: string;
    name: string;
    initials: string;
    grade: string;
    cycleNumber: number;
    cycleHours: number;
    cycleTotal: number;
  };
  tutorInitials?: string;
  tutorName?: string;
  role?: "tutor" | "student" | "parent" | "employer";
}

export default function AppLayout({
  children,
  mode,
  student,
  tutorInitials,
  tutorName,
  role,
}: AppLayoutProps) {
  return (
    <div
      className="flex min-h-screen"
      style={{ background: "var(--color-ss-bg)" }}
    >
      <Sidebar
        mode={mode}
        student={student}
        tutorInitials={tutorInitials}
        tutorName={tutorName}
        role={role}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}