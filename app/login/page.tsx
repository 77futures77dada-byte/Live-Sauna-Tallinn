import { LoginForm } from "@/components/auth/LoginForm";
import { getLocale } from "@/lib/get-locale";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const locale = await getLocale();
  const { error } = await searchParams;
  return <LoginForm locale={locale} initialError={error === "auth_callback_failed"} />;
}
