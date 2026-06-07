import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadTenantPageContext } from "@/lib/db/page-context";

export default async function ClientForgotPasswordPage() {
  const { tenant } = await loadTenantPageContext();

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <Card className="w-full max-w-lg px-6 py-8 sm:p-12 relative gap-6">
        <CardHeader className="text-center gap-6 p-0">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-2xl font-medium text-card-foreground">
              Forgot password
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground font-normal">
              {tenant ? (
                <>We&apos;ll email you a link to reset your password for <span className="font-semibold text-stone-900">{tenant.name}</span> (<span className="font-mono text-stone-500">{tenant.slug}</span>).</>
              ) : (
                "We'll email you a link to reset your client password."
              )}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex flex-col gap-6">
          <ForgotPasswordForm surface="tenant_client" backHref="/auth/login" backLabel="Back to sign in" />
          <p className="text-center text-xs text-stone-500">
            <Link href="/admin/auth/login" className="underline">
              Tenant admin sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

