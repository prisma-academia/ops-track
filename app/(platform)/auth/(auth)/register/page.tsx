import { RegisterWizard } from "./wizard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <Card className="w-full max-w-2xl px-6 py-8 sm:p-12 relative gap-6">
        <CardHeader className="text-center gap-6 p-0">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-2xl font-medium text-card-foreground">
              Register your workspace
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground font-normal">
              Two quick steps, then a one-time code to verify your email.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <RegisterWizard />
        </CardContent>
      </Card>
    </main>
  );
}

