import Link from "next/link";
import { ClientRegisterForm } from "./client-register-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadTenantPageContext } from "@/lib/db/page-context";

export default async function ClientRegisterPage() {
  const { tenant } = await loadTenantPageContext();

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <Card className="w-full max-w-lg px-6 py-8 sm:p-12 relative gap-6">
        <CardHeader className="text-center gap-6 p-0">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-2xl font-medium text-card-foreground">
              {tenant ? `Create an account in ${tenant.name}` : "Create an account"}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground font-normal">
              {tenant ? (
                <>Workspace: <span className="font-mono">{tenant.slug}</span><br />Enter your details and password, then confirm your email with a one-time code.</>
              ) : (
                "Enter your details and password, then confirm your email with a one-time code."
              )}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex flex-col gap-6">
          <ClientRegisterForm />
          <p className="text-center text-xs text-stone-500">
            <Link href="/admin/auth/login" className="underline">
              Tenant admin sign-in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

