import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PlatformForgotPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <Card className="w-full max-w-lg px-6 py-8 sm:p-12 relative gap-6">
        <CardHeader className="text-center gap-6 p-0">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-2xl font-medium text-card-foreground">
              Forgot password
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground font-normal">
              We&apos;ll email you a link to choose a new password.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex flex-col gap-6">
          <ForgotPasswordForm surface="platform" backHref="/auth/login" backLabel="Back to sign in" />
          <p className="text-center text-xs text-stone-500">
            <Link href="/auth/register" className="underline">
              Register a workspace
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

