import Link from "next/link";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PlatformResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <Card className="w-full max-w-lg px-6 py-8 sm:p-12 relative gap-6 text-sm text-stone-600 shadow-sm">
          <CardHeader className="p-0">
            <CardTitle className="text-2xl font-medium text-card-foreground">
              Missing token
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground font-normal">
              Missing reset token. Request a new link from the forgot password page.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <p className="mt-4">
              <Link href="/auth/forgot-password" className="underline">
                Forgot password
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <Card className="w-full max-w-lg px-6 py-8 sm:p-12 relative gap-6 shadow-sm">
        <CardHeader className="text-center gap-6 p-0">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-2xl font-medium text-card-foreground">
              Set a new password
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ResetPasswordForm token={token} backHref="/auth/login" backLabel="Back to sign in" />
        </CardContent>
      </Card>
    </main>
  );
}
