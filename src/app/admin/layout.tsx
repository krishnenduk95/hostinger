import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/shared/sidebar";
import Header from "@/components/shared/header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "ADMIN") {
    redirect("/login");
  }

  // Verify user still exists in DB (handles stale sessions after reseed)
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, isActive: true },
  });

  if (!user || !user.isActive) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        role="admin"
        userName={session.name}
        userEmail={session.email}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userName={session.name} />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
