import { ChangePasswordForm } from "./form";

export default function ChangePasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-sm rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Set a new password</h1>
        <p className="mt-1 text-sm text-stone-600">
          12+ characters, with upper, lower, digit, and symbol.
        </p>
        <div className="mt-6">
          <ChangePasswordForm />
        </div>
      </div>
    </main>
  );
}
