import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const metadata: Metadata = { title: "Store settings" };

export default async function SettingsPage() {
  const s = await getSettings();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Store settings</h1>
      <SettingsForm s={s} />
    </div>
  );
}
