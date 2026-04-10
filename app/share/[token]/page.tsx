import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

// ---------------------------------------------------------------------------
// Types (mirrored from ListingDetail — only what we need for the read-only view)
// ---------------------------------------------------------------------------

type ComparableProperty = {
  address: string;
  price: string;
  beds_baths: string;
  sqft: string;
  status: string;
  url?: string;
  notes?: string;
};

type ComparableProperties = {
  recommended_range: {
    low: number;
    high: number;
    reasoning: string;
  };
  comps: ComparableProperty[];
};

type Recommendation = {
  title: string;
  description: string;
};

type MarketingStrategy = {
  target_personas?: { persona_name: string; demographics: string; lifestyle: string; motivation: string; objections?: string }[];
  marketing_channels?: { channel: string; rationale: string; budget_tier: string }[];
  social_media_strategy?: {
    primary_platform: string;
    post_ideas: { platform: string; format: string; hook: string; content_description: string; call_to_action: string }[];
    hashtags: string[];
    best_posting_times: string;
  };
  staging_and_showing_tips?: { tip: string; persona_connection: string }[];
  open_house_strategy?: {
    recommended_timing: string;
    vibe_and_atmosphere: string;
    talking_points: string[];
    neighborhood_tour_suggestion: string;
  };
  ad_copy_variations?: { platform: string; copy: string; target_persona: string }[];
  neighborhood_selling_points?: { amenity: string; appeal_to: string }[];
};

type Analysis = {
  headline: string;
  improved_listing: string;
  highlights: string[];
  market_insights: string;
  recommendations: Recommendation[];
  pricing_notes: string;
  comparable_properties: ComparableProperties;
  marketing_strategy: MarketingStrategy | null;
};

// ---------------------------------------------------------------------------
// JSON parse helper (handles multi-layered stringified JSONB)
// ---------------------------------------------------------------------------

function parseJsonbField<T>(value: T | string | null): T | null {
  if (value === null || value === undefined) return null;
  let current: unknown = value;
  while (typeof current === "string") {
    try {
      current = JSON.parse(current);
    } catch {
      return null;
    }
  }
  return current as T;
}

// ---------------------------------------------------------------------------
// Dynamic metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const supabase = await createClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("address, mls_number")
    .eq("share_token", token)
    .single();

  const title = listing?.address || listing?.mls_number || "Shared Listing";

  return {
    title: `${title} | Listing Pro`,
    description: "AI-powered real estate listing analysis",
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function SharedListingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  // Fetch listing by share token
  const { data: listing } = await supabase
    .from("listings")
    .select("id, address, mls_number, status, created_at")
    .eq("share_token", token)
    .single();

  if (!listing) notFound();

  // Fetch the latest analysis
  const { data: analyses } = await supabase
    .from("analyses")
    .select("*")
    .eq("listing_id", listing.id)
    .order("version", { ascending: false })
    .limit(1);

  if (!analyses || analyses.length === 0) notFound();

  const raw = analyses[0];
  const analysis: Analysis = {
    headline: raw.headline,
    improved_listing: raw.improved_listing,
    highlights: parseJsonbField(raw.highlights) ?? [],
    market_insights: raw.market_insights,
    recommendations: parseJsonbField(raw.recommendations) ?? [],
    pricing_notes: raw.pricing_notes,
    comparable_properties: parseJsonbField(raw.comparable_properties) ?? raw.comparable_properties,
    marketing_strategy: parseJsonbField(raw.marketing_strategy),
  };

  const ms = analysis.marketing_strategy;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-medium text-[#1B3A5C] uppercase tracking-wide mb-1">
            Listing Pro
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            {listing.address || listing.mls_number || "Listing Details"}
          </h1>
          {listing.mls_number && listing.address && (
            <p className="text-sm text-slate-500 mt-1">MLS# {listing.mls_number}</p>
          )}
        </div>

        {/* Improved Listing */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">
            Listing Description
          </h2>
          {analysis.headline && (
            <h3 className="text-base font-bold text-slate-900 mb-3">
              {analysis.headline}
            </h3>
          )}
          <p className="text-slate-700 text-[15px] leading-relaxed whitespace-pre-line">
            {analysis.improved_listing}
          </p>
          {analysis.highlights.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Key Highlights
              </p>
              <div className="flex flex-wrap gap-2">
                {analysis.highlights.map((h, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 bg-blue-50 text-[#1B3A5C] text-sm rounded-full font-medium"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Market Insights */}
        {analysis.market_insights && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">
              Market Insights
            </h2>
            <p className="text-slate-700 text-[15px] leading-relaxed whitespace-pre-line">
              {analysis.market_insights}
            </p>
          </div>
        )}

        {/* Recommended Price Range */}
        {analysis.comparable_properties?.recommended_range && (
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-5 mb-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
              </svg>
              <h2 className="text-lg font-semibold text-emerald-900">
                Recommended Price Range
              </h2>
            </div>
            <p className="text-2xl font-bold text-emerald-900 mb-2">
              ${analysis.comparable_properties.recommended_range.low.toLocaleString()}
              {" "}&ndash;{" "}$
              {analysis.comparable_properties.recommended_range.high.toLocaleString()}
            </p>
            <p className="text-emerald-800 text-sm leading-relaxed">
              {analysis.comparable_properties.recommended_range.reasoning}
            </p>
          </div>
        )}

        {/* Comparable Properties */}
        {analysis.comparable_properties?.comps?.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Comparable Properties
            </h2>
            <div className="space-y-3">
              {analysis.comparable_properties.comps.map((comp, i) => (
                <div key={i} className="p-3 border border-slate-100 rounded-lg">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <a
                      href={comp.url || `https://www.google.com/search?q=${encodeURIComponent(comp.address + " real estate")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[#1B3A5C] text-[15px] underline decoration-blue-200 hover:decoration-[#1B3A5C] transition-colors"
                    >
                      {comp.address}
                    </a>
                    <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${
                      comp.status === "Sold" ? "bg-emerald-100 text-emerald-800"
                        : comp.status === "Active" ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {comp.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <span className="font-semibold text-[#1B3A5C]">{comp.price}</span>
                    <span>{comp.beds_baths}</span>
                    <span>{comp.sqft}</span>
                  </div>
                  {comp.notes && (
                    <p className="text-xs text-slate-400 mt-1">{comp.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {analysis.recommendations?.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Recommendations
            </h2>
            <div className="space-y-4">
              {analysis.recommendations.map((rec, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-7 h-7 flex-shrink-0 bg-blue-50 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-sm font-bold text-[#1B3A5C]">{i + 1}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-[15px]">{rec.title}</p>
                    <p className="text-slate-600 text-sm mt-0.5 leading-snug">{rec.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing Strategy */}
        {analysis.pricing_notes && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-5 mb-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <h2 className="text-lg font-semibold text-amber-900">Pricing Strategy</h2>
            </div>
            <p className="text-amber-800 text-[15px] leading-relaxed">{analysis.pricing_notes}</p>
          </div>
        )}

        {/* Marketing Strategy */}
        {ms && (
          <>
            <div className="mt-6 mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Marketing Strategy</h2>
              <p className="text-slate-500 text-sm">Tailored marketing plan for this property</p>
            </div>

            {/* Target Buyer Personas */}
            {ms.target_personas && ms.target_personas.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
                <h3 className="text-base font-semibold text-slate-800 mb-3">Target Buyer Personas</h3>
                <div className="space-y-4">
                  {ms.target_personas.map((persona, i) => (
                    <div key={i} className="p-4 border border-slate-100 rounded-lg">
                      <p className="text-[15px] font-semibold text-[#1B3A5C] mb-2">{persona.persona_name}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Demographics</p>
                          <p className="text-slate-700 text-sm leading-snug">{persona.demographics}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Lifestyle</p>
                          <p className="text-slate-700 text-sm leading-snug">{persona.lifestyle}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Motivation</p>
                          <p className="text-slate-700 text-sm leading-snug">{persona.motivation}</p>
                        </div>
                        {persona.objections && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Likely Objections</p>
                            <p className="text-slate-700 text-sm leading-snug">{persona.objections}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Marketing Channels */}
            {ms.marketing_channels && ms.marketing_channels.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
                <h3 className="text-base font-semibold text-slate-800 mb-3">Marketing Channels</h3>
                <div className="space-y-3">
                  {ms.marketing_channels.map((ch, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 p-3 border border-slate-100 rounded-lg">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{ch.channel}</p>
                        <p className="text-slate-600 text-sm leading-snug mt-0.5">{ch.rationale}</p>
                      </div>
                      <span className={`flex-shrink-0 px-2.5 py-1 text-xs font-medium rounded-full ${
                        ch.budget_tier === "free" ? "bg-emerald-100 text-emerald-800"
                          : ch.budget_tier?.startsWith("low") ? "bg-blue-100 text-blue-800"
                            : ch.budget_tier?.startsWith("medium") ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                      }`}>
                        {ch.budget_tier}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Social Media Strategy */}
            {ms.social_media_strategy && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
                <h3 className="text-base font-semibold text-slate-800 mb-1">Social Media Strategy</h3>
                <p className="text-sm text-slate-500 mb-3">
                  Primary platform: <span className="font-medium text-[#1B3A5C]">{ms.social_media_strategy.primary_platform}</span>
                  {" "}&middot;{" "}Best times: {ms.social_media_strategy.best_posting_times}
                </p>
                {ms.social_media_strategy.post_ideas?.length > 0 && (
                  <div className="space-y-4 mb-4">
                    {ms.social_media_strategy.post_ideas.map((post, i) => (
                      <div key={i} className="p-3 border border-slate-100 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-[#1B3A5C] uppercase tracking-wide">{post.platform}</span>
                          <span className="text-xs text-slate-400">&middot;</span>
                          <span className="text-xs text-slate-500">{post.format}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-800 mb-1">{post.hook}</p>
                        <p className="text-slate-600 text-sm leading-snug">{post.content_description}</p>
                        <p className="text-xs text-[#1B3A5C] font-medium mt-2">CTA: {post.call_to_action}</p>
                      </div>
                    ))}
                  </div>
                )}
                {ms.social_media_strategy.hashtags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {ms.social_media_strategy.hashtags.map((tag, j) => (
                      <span key={j} className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {tag.startsWith("#") ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Staging & Showing Tips */}
            {ms.staging_and_showing_tips && ms.staging_and_showing_tips.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
                <h3 className="text-base font-semibold text-slate-800 mb-3">Staging &amp; Showing Tips</h3>
                <div className="space-y-3">
                  {ms.staging_and_showing_tips.map((item, i) => (
                    <div key={i} className="flex gap-3 p-3 border border-slate-100 rounded-lg">
                      <div className="w-7 h-7 flex-shrink-0 bg-blue-50 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-sm font-bold text-[#1B3A5C]">{i + 1}</span>
                      </div>
                      <div>
                        <p className="text-slate-800 text-sm leading-snug">{item.tip}</p>
                        <p className="text-slate-500 text-xs mt-1">{item.persona_connection}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Open House Strategy */}
            {ms.open_house_strategy && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
                <h3 className="text-base font-semibold text-slate-800 mb-3">Open House Strategy</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Timing</p>
                    <p className="text-slate-700 text-sm">{ms.open_house_strategy.recommended_timing}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Vibe &amp; Atmosphere</p>
                    <p className="text-slate-700 text-sm">{ms.open_house_strategy.vibe_and_atmosphere}</p>
                  </div>
                </div>
                {ms.open_house_strategy.talking_points?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Talking Points</p>
                    <ul className="space-y-1">
                      {ms.open_house_strategy.talking_points.map((point, i) => (
                        <li key={i} className="text-slate-600 text-sm leading-snug flex gap-2">
                          <span className="text-[#1B3A5C] flex-shrink-0 mt-0.5">&bull;</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {ms.open_house_strategy.neighborhood_tour_suggestion && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Neighborhood Tour</p>
                    <p className="text-slate-700 text-sm leading-snug">{ms.open_house_strategy.neighborhood_tour_suggestion}</p>
                  </div>
                )}
              </div>
            )}

            {/* Ad Copy Variations */}
            {ms.ad_copy_variations && ms.ad_copy_variations.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
                <h3 className="text-base font-semibold text-slate-800 mb-3">Ad Copy</h3>
                <div className="space-y-4">
                  {ms.ad_copy_variations.map((ad, i) => (
                    <div key={i} className="p-3 border border-slate-100 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-[#1B3A5C] uppercase tracking-wide">{ad.platform}</span>
                        <span className="text-xs text-slate-400">for {ad.target_persona}</span>
                      </div>
                      <p className="text-slate-700 text-sm leading-snug whitespace-pre-line">{ad.copy}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Neighborhood Selling Points */}
            {ms.neighborhood_selling_points && ms.neighborhood_selling_points.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
                <h3 className="text-base font-semibold text-slate-800 mb-3">Neighborhood Selling Points</h3>
                <div className="space-y-2">
                  {ms.neighborhood_selling_points.map((point, i) => (
                    <div key={i} className="p-2.5 bg-slate-50 rounded-lg">
                      <p className="text-slate-800 text-sm font-medium">{point.amenity}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{point.appeal_to}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="mt-8 mb-6 text-center">
          <p className="text-xs text-slate-400">
            Powered by Listing Pro &middot; The Fulmer Team
          </p>
        </div>
      </div>
    </div>
  );
}
