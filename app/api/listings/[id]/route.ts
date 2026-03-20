import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  // Fetch the listing and verify ownership
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();

  if (listingError || !listing) {
    return Response.json({ error: "Listing not found." }, { status: 404 });
  }

  if (listing.user_id !== user.id) {
    return Response.json({ error: "Listing not found." }, { status: 404 });
  }

  // Fetch all analyses for this listing, ordered by version
  const { data: analyses, error: analysesError } = await supabase
    .from("analyses")
    .select("*")
    .eq("listing_id", id)
    .order("version", { ascending: true });

  if (analysesError) {
    console.error("Failed to fetch analyses:", analysesError);
    return Response.json(
      { error: "Failed to fetch analyses." },
      { status: 500 }
    );
  }

  return Response.json({ listing, analyses: analyses ?? [] });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  let status: string;
  try {
    const body = await request.json();
    status = body?.status;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!status || typeof status !== "string") {
    return Response.json(
      { error: "Status is required." },
      { status: 400 }
    );
  }

  // Fetch the listing and verify ownership
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (listingError || !listing) {
    return Response.json({ error: "Listing not found." }, { status: 404 });
  }

  if (listing.user_id !== user.id) {
    return Response.json({ error: "Listing not found." }, { status: 404 });
  }

  // Update the listing status
  const { data: updated, error: updateError } = await supabase
    .from("listings")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError) {
    console.error("Failed to update listing:", updateError);
    return Response.json(
      { error: "Failed to update listing." },
      { status: 500 }
    );
  }

  return Response.json({ listing: updated });
}
