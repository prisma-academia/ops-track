import { RegisterWizard } from "./wizard";
import { AuthLayoutWrapper } from "@/components/auth-layout-wrapper";

export default function RegisterPage() {
  return (
    <AuthLayoutWrapper
      gridClassName="lg:grid-cols-[4fr_6fr] xl:grid-cols-[4.5fr_7.5fr]"
      cardContainerClassName="lg:justify-stretch"
    >
      <RegisterWizard />
    </AuthLayoutWrapper>
  );
}
