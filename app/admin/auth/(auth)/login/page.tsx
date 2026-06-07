import Link from "next/link";
import { AdminLoginForm } from "./form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadTenantPageContext } from "@/lib/db/page-context";

export default async function AdminLoginPage() {
  const { tenant } = await loadTenantPageContext();

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <Card className="w-full max-w-lg px-6 py-8 sm:p-12 relative gap-6">
        <CardHeader className="text-center gap-6 p-0">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-2xl font-medium text-card-foreground">
              {tenant ? `Admin sign in` : "Tenant admin sign in"}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground font-normal">
              {tenant ? (
                <>
                  Sign in to manage the workspace <span className="font-semibold text-stone-900">{tenant.name}</span> (<span className="font-mono text-stone-500">{tenant.slug}</span>).
                </>
              ) : (
                "Use the credentials your administrator sent."
              )}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex flex-col gap-6">
          <AdminLoginForm />
          <p className="text-xs text-stone-500 text-center">
            <Link href="/admin/auth/forgot-password" className="underline">
              Forgot password?
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

