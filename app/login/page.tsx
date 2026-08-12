import { LoginForm } from "@/components/auth/LoginForm";
import { getLocale } from "@/lib/get-locale";

export default async function LoginPage() {
  const locale = await getLocale();
  return <LoginForm locale={locale} />;
}
