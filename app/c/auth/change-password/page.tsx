import { ChangePasswordForm } from "@/components/change-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClientChangePasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <Card className="w-full max-w-lg px-6 py-8 sm:p-12 relative gap-6">
        <CardHeader className="text-center gap-6 p-0">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-2xl font-medium text-card-foreground">
              Set a new password
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground font-normal">
              12+ characters, with upper, lower, digit, and symbol.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </main>
  );
}

