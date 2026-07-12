import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { getPendingCount } from "@/lib/data/documents";

export default async function AdminPage() {
  const pendingCount = await getPendingCount();

  return <AdminDashboard initialPendingCount={pendingCount} />;
}
