import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireClientPage } from "@/lib/auth/page-guards";
import { clientProfileIncomplete } from "@/lib/auth/client-profile";
import { PageHeader, Card } from "@/components/shell";
import { ClientProfileForm } from "./profile-form";

export default async function ClientProfilePage() {
  const actor = await requireClientPage();
  const client = await prisma.client.findUnique({ where: { id: actor.clientId } });
  if (!client) redirect("/auth/login");

  const profile = (client.profileJson as Record<string, unknown>) ?? {};
  const displayName = typeof profile.name === "string" ? profile.name : "";
  if (!clientProfileIncomplete(client.profileJson)) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-8">
      <PageHeader title="Complete your profile" />
      <Card>
        <p className="mb-4 text-sm text-stone-600">
          Add a display name so we know how to address you. You can update the rest of your profile anytime.
        </p>
        <ClientProfileForm
          initialDisplayName={displayName}
          initialFirstName={client.firstName ?? ""}
          initialLastName={client.lastName ?? ""}
          initialPhone={client.phone ?? ""}
        />
      </Card>
    </div>
  );
}
