import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ListingDetail from "./ListingDetail";

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the listing
  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!listing) {
    redirect("/");
  }

  // Fetch all analyses for this listing, ordered by version
  const { data: analyses } = await supabase
    .from("analyses")
    .select("*")
    .eq("listing_id", id)
    .order("version", { ascending: true });

  return (
    <ListingDetail
      listing={listing}
      analyses={analyses || []}
    />
  );
}
