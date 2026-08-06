import Link from "next/link";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadTenantPageContext } from "@/lib/db/page-context";
import { AuthLayoutWrapper } from "@/components/auth-layout-wrapper";
import { parseTenantSettings } from "@/lib/tenant/settings";
import { publicUrlForKey, s3Configured } from "@/lib/storage/s3";

export default async function AdminResetPasswordPage(props: {
  searchParams: Promise<{ token?: string }>;
}) {
  const searchParams = await props.searchParams;
  const token = searchParams.token || "";
  const { tenant } = await loadTenantPageContext();
  const settings = tenant ? parseTenantSettings(tenant.settingsJson) : null;
  const logoUrl =
    settings?.logoKey?.startsWith("http")
      ? settings.logoKey
      : settings?.logoKey && s3Configured()
      ? publicUrlForKey(settings.logoKey)
      : null;

  if (!token) {
    return (
      <AuthLayoutWrapper logoUrl={logoUrl} tenantName={tenant?.name}>
        <Card className="w-full max-w-lg px-6 py-8 sm:p-12 relative gap-6 text-sm text-stone-600">
          <CardHeader className="p-0">
            <CardTitle className="text-2xl font-medium text-card-foreground">
              Missing token
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground font-normal">
              Missing reset token.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <p className="mt-4">
              <Link href="/admin/auth/forgot-password" className="underline">
                Request a new link
              </Link>
            </p>
          </CardContent>
        </Card>
      </AuthLayoutWrapper>
    );
  }
  return (
    <AuthLayoutWrapper logoUrl={logoUrl} tenantName={tenant?.name}>
      <Card className="w-full max-w-lg px-6 py-8 sm:p-12 relative gap-6">
        <CardHeader className="text-center gap-6 p-0">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-2xl font-medium text-card-foreground">
              Set a new password
            </CardTitle>
            {tenant && (
              <CardDescription className="text-sm text-muted-foreground font-normal">
               <span className="font-semibold text-white">{tenant.name}</span>
              </CardDescription>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ResetPasswordForm token={token} backHref="/admin/auth/login" backLabel="Back to login" />
        </CardContent>
      </Card>
    </AuthLayoutWrapper>
  );
}
