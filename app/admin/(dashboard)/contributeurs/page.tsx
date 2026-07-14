import type { Metadata } from "next";
import { ContributorsTable } from "@/components/admin/contributors-table";

export const metadata: Metadata = {
  title: "Contributeurs",
  robots: { index: false, follow: false },
};

export default function AdminContributorsPage() {
  return <ContributorsTable />;
}
