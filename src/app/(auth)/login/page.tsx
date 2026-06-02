import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginCard from "./LoginCard";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) redirect("/");

  const params = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <LoginCard
        errorParam={params.error}
        messageParam={params.message}
      />
    </main>
  );
}
