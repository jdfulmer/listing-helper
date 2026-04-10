import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const supabase = await createClient();

  // Fetch the listing by share token (no auth required — RLS policy allows it)
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, address, mls_number, status, created_at")
    .eq("share_token", token)
    .single();

  if (listingError || !listing) {
    return Response.json({ error: "Listing not found." }, { status: 404 });
  }

  // Fetch the latest analysis for this listing
  const { data: analyses, error: analysesError } = await supabase
    .from("analyses")
    .select("*")
    .eq("listing_id", listing.id)
    .order("version", { ascending: false })
    .limit(1);

  if (analysesError || !analyses || analyses.length === 0) {
    return Response.json(
      { error: "No analysis available." },
      { status: 404 }
    );
  }

  return Response.json({ listing, analysis: analyses[0] });
}
