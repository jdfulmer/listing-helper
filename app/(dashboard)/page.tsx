import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  active: "bg-blue-100 text-blue-800",
  pending: "bg-yellow-100 text-yellow-800",
  sold: "bg-emerald-100 text-emerald-800",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch listings with their latest analysis headline
  const { data: listings } = await supabase
    .from("listings")
    .select(
      `
      id,
      address,
      mls_number,
      status,
      created_at,
      analyses (
        headline,
        version
      )
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // For each listing, pick the latest analysis by version
  const listingsWithHeadline = (listings || []).map((listing) => {
    const analyses = (listing.analyses as { headline: string; version: number }[]) || [];
    const latest = analyses.sort((a, b) => b.version - a.version)[0];
    return {
      ...listing,
      headline: latest?.headline || null,
    };
  });

  return (
    <>
      {/* Header Row */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-800">Your Listings</h2>
        <Link
          href="/listings/new"
          className="px-5 py-2.5 bg-[#1B3A5C] text-white text-sm font-semibold rounded-lg active:scale-[0.98] transition-all"
        >
          New Listing
        </Link>
      </div>

      {listingsWithHeadline.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center">
          <svg
            className="w-12 h-12 text-slate-300 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
            />
          </svg>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            No listings yet
          </h3>
          <p className="text-slate-500 text-sm mb-6">
            Create your first listing to get AI-powered copy and market
            insights!
          </p>
          <Link
            href="/listings/new"
            className="inline-block px-6 py-3 bg-[#1B3A5C] text-white text-sm font-semibold rounded-xl active:scale-[0.98] transition-all"
          >
            Create Your First Listing
          </Link>
        </div>
      ) : (
        /* Listing Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {listingsWithHeadline.map((listing) => (
            <Link
              key={listing.id}
              href={`/listings/${listing.id}`}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md hover:border-slate-300 transition-all block"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-semibold text-slate-800 text-[15px] leading-snug">
                  {listing.address || listing.mls_number || "Untitled Listing"}
                </h3>
                <span
                  className={`flex-shrink-0 px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${
                    STATUS_STYLES[listing.status] || STATUS_STYLES.draft
                  }`}
                >
                  {listing.status}
                </span>
              </div>

              {listing.headline && (
                <p className="text-slate-600 text-sm leading-snug mb-3 line-clamp-2">
                  {listing.headline}
                </p>
              )}

              <p className="text-xs text-slate-400">
                {new Date(listing.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
