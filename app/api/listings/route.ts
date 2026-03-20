import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  // Get all listings for this user with their latest analysis headline
  const { data: listings, error } = await supabase
    .from("listings")
    .select("id, mls_number, address, status, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch listings:", error);
    return Response.json(
      { error: "Failed to fetch listings." },
      { status: 500 }
    );
  }

  // For each listing, get the latest analysis headline
  const listingsWithHeadlines = await Promise.all(
    (listings ?? []).map(async (listing) => {
      const { data: latestAnalysis } = await supabase
        .from("analyses")
        .select("headline")
        .eq("listing_id", listing.id)
        .order("version", { ascending: false })
        .limit(1)
        .single();

      return {
        ...listing,
        latest_headline: latestAnalysis?.headline ?? null,
      };
    })
  );

  return Response.json({ listings: listingsWithHeadlines });
}
