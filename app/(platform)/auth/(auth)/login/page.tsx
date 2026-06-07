import Link from "next/link";
import { LoginForm } from "./form";
import { WorkspaceJumpForm } from "./workspace-jump";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PlatformLoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
        <Card className="relative gap-6 p-6 sm:p-8">
          <CardHeader className="gap-1 p-0">
            <CardTitle className="text-lg font-semibold text-card-foreground">
              Platform sign in
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground font-normal">
              For platform staff only.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex flex-col gap-6">
            <LoginForm />
            <p className="text-xs text-stone-500">
              <Link href="/auth/forgot-password" className="underline">
                Forgot password?
              </Link>
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="relative gap-4 p-6">
            <CardHeader className="gap-1 p-0">
              <CardTitle className="text-base font-semibold text-card-foreground">
                New here?
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground font-normal">
                Spin up your own workspace in under a minute.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 mt-2">
              <Link href="/auth/register">
                <Button className="w-full">Register as a tenant</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="relative gap-4 p-6">
            <CardHeader className="gap-1 p-0">
              <CardTitle className="text-base font-semibold text-card-foreground">
                Go to your workspace
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground font-normal">
                Already have an account? Select your workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 mt-2">
              <WorkspaceJumpForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

