"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <button
      onClick={handleSignOut}
      className="px-3 py-1.5 text-sm font-medium text-blue-100 bg-white/10 rounded-lg hover:bg-white/20 active:bg-white/25 transition-colors cursor-pointer"
    >
      Sign Out
    </button>
  );
}
