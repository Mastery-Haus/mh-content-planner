import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const user = await requireUser();
  if (user) redirect("/");

  return (
    <div className="login-screen">
      <LoginForm />
    </div>
  );
}
