import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadTenantPageContext } from "@/lib/db/page-context";
import { AuthLayoutWrapper } from "@/components/auth-layout-wrapper";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { parseTenantSettings } from "@/lib/tenant/settings";
import { publicUrlForKey, s3Configured } from "@/lib/storage/s3";

export default async function AdminForgotPasswordPage() {
  const { tenant } = await loadTenantPageContext();
  const settings = tenant ? parseTenantSettings(tenant.settingsJson) : null;
  const logoUrl =
    settings?.logoKey?.startsWith("http")
      ? settings.logoKey
      : settings?.logoKey && s3Configured()
      ? publicUrlForKey(settings.logoKey)
      : null;

  return (
    <AuthLayoutWrapper logoUrl={logoUrl} tenantName={tenant?.name}>
      <Card className="w-full max-w-lg px-6 py-8 sm:p-12 relative gap-6">
        <CardHeader className="text-center gap-6 p-0">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-2xl font-medium text-card-foreground">
              Forgot password
            </CardTitle>
            <div className="mt-2 text-left">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-muted-foreground">
                  {tenant ? (
                    <>We&apos;ll email you a link to reset your admin password for <span className="font-semibold text-foreground">{tenant.name}</span></>
                  ) : (
                    "We'll email you a link to reset your admin password."
                  )}
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex flex-col gap-6">
          <ForgotPasswordForm
            surface="tenant_admin"
            backHref="/admin/auth/login"
            backLabel="Back to login"
          />
        </CardContent>
      </Card>
    </AuthLayoutWrapper>
  );
}

