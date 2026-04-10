import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

export async function POST(
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
    .select("id, user_id, share_token")
    .eq("id", id)
    .single();

  if (listingError || !listing) {
    return Response.json({ error: "Listing not found." }, { status: 404 });
  }

  if (listing.user_id !== user.id) {
    return Response.json({ error: "Listing not found." }, { status: 404 });
  }

  // Return existing token if already shared
  if (listing.share_token) {
    return Response.json({ share_token: listing.share_token });
  }

  // Generate a new share token
  const share_token = crypto.randomBytes(16).toString("hex");

  const { error: updateError } = await supabase
    .from("listings")
    .update({ share_token, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    console.error("Failed to generate share token:", updateError);
    return Response.json(
      { error: "Failed to generate share link." },
      { status: 500 }
    );
  }

  return Response.json({ share_token });
}

export async function DELETE(
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

  const { error: updateError } = await supabase
    .from("listings")
    .update({ share_token: null, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    console.error("Failed to remove share token:", updateError);
    return Response.json(
      { error: "Failed to remove share link." },
      { status: 500 }
    );
  }

  return Response.json({ success: true });
}
