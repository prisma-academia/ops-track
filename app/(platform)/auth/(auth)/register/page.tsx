import { RegisterWizard } from "./wizard";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <Card className="w-full max-w-2xl px-6 py-8 sm:p-12 flex flex-col relative gap-6">
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
        <CardFooter className="p-0 justify-center">
          <div className="flex items-center text-lg font-medium justify-center gap-4 text-xs text-stone-500">
            <Link href="/auth/login" className="underline">
              Back to sign in
            </Link>
            {/* <span>&bull;</span> */}
            {/* <Link href="/" className="underline">
              Back to homepage
            </Link> */}
          </div>
        </CardFooter>
      </Card>
    </main>
  );
}
