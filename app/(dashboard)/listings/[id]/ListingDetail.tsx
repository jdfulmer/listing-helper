"use client";

import { useState } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
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

type TargetPersona = {
  persona_name: string;
  demographics: string;
  lifestyle: string;
  motivation: string;
  objections?: string;
};

type MarketingChannel = {
  channel: string;
  rationale: string;
  budget_tier: string;
};

type PostIdea = {
  platform: string;
  format: string;
  hook: string;
  content_description: string;
  call_to_action: string;
};

type SocialMediaStrategy = {
  primary_platform: string;
  post_ideas: PostIdea[];
  hashtags: string[];
  best_posting_times: string;
};

type StagingTip = {
  tip: string;
  persona_connection: string;
};

type OpenHouseStrategy = {
  recommended_timing: string;
  vibe_and_atmosphere: string;
  talking_points: string[];
  neighborhood_tour_suggestion: string;
};

type AdCopyVariation = {
  platform: string;
  copy: string;
  target_persona: string;
};

type NeighborhoodPoint = {
  amenity: string;
  appeal_to: string;
};

type MarketingStrategy = {
  target_personas?: TargetPersona[];
  marketing_channels?: MarketingChannel[];
  social_media_strategy?: SocialMediaStrategy;
  staging_and_showing_tips?: StagingTip[];
  open_house_strategy?: OpenHouseStrategy;
  ad_copy_variations?: AdCopyVariation[];
  neighborhood_selling_points?: NeighborhoodPoint[];
};

type AnalysisResult = {
  id: string;
  listing_id: string;
  version: number;
  revision_prompt: string | null;
  headline: string;
  improved_listing: string;
  highlights: string[];
  market_insights: string;
  recommendations: Recommendation[];
  pricing_notes: string;
  comparable_properties: ComparableProperties;
  marketing_strategy: MarketingStrategy | null;
  created_at: string;
};

type Listing = {
  id: string;
  user_id: string;
  mls_number: string | null;
  address: string | null;
  raw_input: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type ListingDetailProps = {
  listing: Listing;
  analyses: AnalysisResult[];
};

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = ["draft", "active", "pending", "sold"] as const;

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  active: "bg-blue-100 text-blue-800",
  pending: "bg-yellow-100 text-yellow-800",
  sold: "bg-emerald-100 text-emerald-800",
};

// ---------------------------------------------------------------------------
// Spinner component
// ---------------------------------------------------------------------------

function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Copy button helper
// ---------------------------------------------------------------------------

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="px-3 py-1.5 text-xs font-medium text-[#1B3A5C] bg-blue-50 rounded-lg active:bg-blue-100 transition-colors cursor-pointer whitespace-nowrap"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ListingDetail({ listing, analyses }: ListingDetailProps) {
  const [allAnalyses, setAllAnalyses] = useState<AnalysisResult[]>(analyses);
  const [selectedVersion, setSelectedVersion] = useState<number>(
    analyses.length > 0 ? analyses[analyses.length - 1].version : 1
  );
  const [status, setStatus] = useState(listing.status);
  const [revision, setRevision] = useState("");
  const [revising, setRevising] = useState(false);
  const [error, setError] = useState("");

  const currentAnalysis = allAnalyses.find((a) => a.version === selectedVersion) || null;

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  async function handleRevision() {
    if (!revision.trim() || !currentAnalysis) return;

    setRevising(true);
    setError("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revision: revision.trim(),
          currentResult: {
            headline: currentAnalysis.headline,
            improved_listing: currentAnalysis.improved_listing,
            highlights: currentAnalysis.highlights,
            market_insights: currentAnalysis.market_insights,
            recommendations: currentAnalysis.recommendations,
            pricing_notes: currentAnalysis.pricing_notes,
            comparable_properties: currentAnalysis.comparable_properties,
            marketing_strategy: currentAnalysis.marketing_strategy,
          },
          listingId: listing.id,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Something went wrong. Please try again.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }

      const events = fullText
        .split("\n\n")
        .filter((e) => e.startsWith("data: "));
      const lastEvent = events[events.length - 1];

      if (!lastEvent) {
        throw new Error("No response received. Please try again.");
      }

      const data = JSON.parse(lastEvent.replace("data: ", ""));

      if (data.error) {
        throw new Error(data.error);
      }

      // Build a new analysis entry from the response
      const newVersion = allAnalyses.length > 0
        ? Math.max(...allAnalyses.map((a) => a.version)) + 1
        : 1;

      const newAnalysis: AnalysisResult = {
        id: data.analysis_id || crypto.randomUUID(),
        listing_id: listing.id,
        version: data.version || newVersion,
        revision_prompt: revision.trim(),
        headline: data.result?.headline || "",
        improved_listing: data.result?.improved_listing || "",
        highlights: data.result?.highlights || [],
        market_insights: data.result?.market_insights || "",
        recommendations: data.result?.recommendations || [],
        pricing_notes: data.result?.pricing_notes || "",
        comparable_properties: data.result?.comparable_properties || {
          recommended_range: { low: 0, high: 0, reasoning: "" },
          comps: [],
        },
        marketing_strategy: data.result?.marketing_strategy || null,
        created_at: new Date().toISOString(),
      };

      setAllAnalyses((prev) => [...prev, newAnalysis]);
      setSelectedVersion(newAnalysis.version);
      setRevision("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setRevising(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    setStatus(newStatus);
    try {
      await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      // Revert on error
      setStatus(listing.status);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (!currentAnalysis) {
    return (
      <div className="text-center py-10">
        <p className="text-slate-500">No analysis available for this listing.</p>
        <Link
          href="/"
          className="inline-block mt-4 text-[#1B3A5C] font-medium text-sm hover:underline"
        >
          &larr; Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Top Bar: Back + Status */}
      <div className="flex items-center justify-between mb-5">
        <Link
          href="/"
          className="text-[#1B3A5C] font-medium text-sm hover:underline"
        >
          &larr; Back to Dashboard
        </Link>

        <div className="flex items-center gap-3">
          <label htmlFor="status-select" className="text-xs text-slate-500 font-medium">
            Status:
          </label>
          <select
            id="status-select"
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border-0 cursor-pointer capitalize ${
              STATUS_STYLES[status] || STATUS_STYLES.draft
            }`}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Listing Address */}
      <h2 className="text-xl font-semibold text-slate-800 mb-1">
        {listing.address || listing.mls_number || "Listing Details"}
      </h2>
      {listing.mls_number && listing.address && (
        <p className="text-sm text-slate-500 mb-4">MLS# {listing.mls_number}</p>
      )}

      {/* Version Selector */}
      {allAnalyses.length > 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 shadow-sm">
          <div className="flex items-center gap-3">
            <label
              htmlFor="version-select"
              className="text-sm font-medium text-slate-700"
            >
              Analysis Version:
            </label>
            <select
              id="version-select"
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A5C] focus:border-transparent cursor-pointer"
            >
              {allAnalyses.map((a) => (
                <option key={a.version} value={a.version}>
                  v{a.version}
                  {a.revision_prompt
                    ? ` — ${a.revision_prompt.slice(0, 40)}${a.revision_prompt.length > 40 ? "..." : ""}`
                    : " — Original"}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Revision Input */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 shadow-sm">
        <p className="text-sm font-medium text-slate-700 mb-2">
          Request changes to your listing
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 px-4 py-3 text-base border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A5C] focus:border-transparent placeholder:text-slate-400"
            placeholder='e.g. "Remove the fireplace, add the pickleball court"'
            value={revision}
            onChange={(e) => setRevision(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !revising) handleRevision();
            }}
            disabled={revising}
          />
          <button
            onClick={handleRevision}
            disabled={revising || !revision.trim()}
            className="px-5 py-3 bg-[#1B3A5C] text-white text-sm font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
          >
            {revising ? <Spinner /> : "Update"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Improved Listing Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-800">
            Your Improved Listing
          </h3>
          <CopyButton
            text={
              (currentAnalysis.headline ? currentAnalysis.headline + "\n\n" : "") +
              currentAnalysis.improved_listing
            }
          />
        </div>

        {currentAnalysis.headline && (
          <h4 className="text-base font-bold text-slate-900 mb-3">
            {currentAnalysis.headline}
          </h4>
        )}

        <p className="text-slate-700 text-[15px] leading-relaxed whitespace-pre-line">
          {currentAnalysis.improved_listing}
        </p>

        {currentAnalysis.highlights && currentAnalysis.highlights.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Key Highlights
            </p>
            <div className="flex flex-wrap gap-2">
              {currentAnalysis.highlights.map((h, i) => (
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

      {/* Market Insights Card */}
      {currentAnalysis.market_insights && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">
            Market Insights
          </h3>
          <p className="text-slate-700 text-[15px] leading-relaxed whitespace-pre-line">
            {currentAnalysis.market_insights}
          </p>
        </div>
      )}

      {/* Recommended Price Range Card */}
      {currentAnalysis.comparable_properties?.recommended_range && (
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-5 mb-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <svg
              className="w-5 h-5 text-emerald-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941"
              />
            </svg>
            <h3 className="text-lg font-semibold text-emerald-900">
              Recommended Price Range
            </h3>
          </div>
          <p className="text-2xl font-bold text-emerald-900 mb-2">
            $
            {currentAnalysis.comparable_properties.recommended_range.low.toLocaleString()}
            {" "}&ndash;{" "}$
            {currentAnalysis.comparable_properties.recommended_range.high.toLocaleString()}
          </p>
          <p className="text-emerald-800 text-sm leading-relaxed">
            {currentAnalysis.comparable_properties.recommended_range.reasoning}
          </p>
        </div>
      )}

      {/* Comparable Properties Card */}
      {currentAnalysis.comparable_properties?.comps &&
        currentAnalysis.comparable_properties.comps.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Comparable Properties
            </h3>
            <div className="space-y-3">
              {currentAnalysis.comparable_properties.comps.map((comp, i) => (
                <div
                  key={i}
                  className="p-3 border border-slate-100 rounded-lg"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <a
                      href={
                        comp.url ||
                        `https://www.google.com/search?q=${encodeURIComponent(comp.address + " real estate")}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[#1B3A5C] text-[15px] underline decoration-blue-200 hover:decoration-[#1B3A5C] transition-colors"
                    >
                      {comp.address}
                    </a>
                    <span
                      className={`flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${
                        comp.status === "Sold"
                          ? "bg-emerald-100 text-emerald-800"
                          : comp.status === "Active"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {comp.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <span className="font-semibold text-[#1B3A5C]">
                      {comp.price}
                    </span>
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

      {/* Recommendations Card */}
      {currentAnalysis.recommendations &&
        currentAnalysis.recommendations.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Recommendations
            </h3>
            <div className="space-y-4">
              {currentAnalysis.recommendations.map((rec, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-7 h-7 flex-shrink-0 bg-blue-50 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-sm font-bold text-[#1B3A5C]">
                      {i + 1}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-[15px]">
                      {rec.title}
                    </p>
                    <p className="text-slate-600 text-sm mt-0.5 leading-snug">
                      {rec.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Pricing Notes Card */}
      {currentAnalysis.pricing_notes && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-5 mb-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-amber-900">
              Pricing Strategy
            </h3>
          </div>
          <p className="text-amber-800 text-[15px] leading-relaxed">
            {currentAnalysis.pricing_notes}
          </p>
        </div>
      )}

      {/* ================================================================= */}
      {/* Marketing Strategy Cards (conditional)                            */}
      {/* ================================================================= */}
      {currentAnalysis.marketing_strategy && (
        <>
          <div className="mt-6 mb-4">
            <h3 className="text-lg font-semibold text-slate-800">
              Marketing Strategy
            </h3>
            <p className="text-slate-500 text-sm">
              Tailored marketing plan for this property
            </p>
          </div>

          {/* Target Buyer Personas */}
          {currentAnalysis.marketing_strategy.target_personas &&
            currentAnalysis.marketing_strategy.target_personas.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
                <h4 className="text-base font-semibold text-slate-800 mb-3">
                  Target Buyer Personas
                </h4>
                <div className="space-y-4">
                  {currentAnalysis.marketing_strategy.target_personas.map(
                    (persona, i) => (
                      <div
                        key={i}
                        className="p-4 border border-slate-100 rounded-lg"
                      >
                        <p className="text-[15px] font-semibold text-[#1B3A5C] mb-2">
                          {persona.persona_name}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                              Demographics
                            </p>
                            <p className="text-slate-700 text-sm leading-snug">
                              {persona.demographics}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                              Lifestyle
                            </p>
                            <p className="text-slate-700 text-sm leading-snug">
                              {persona.lifestyle}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                              Motivation
                            </p>
                            <p className="text-slate-700 text-sm leading-snug">
                              {persona.motivation}
                            </p>
                          </div>
                          {persona.objections && (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                                Likely Objections
                              </p>
                              <p className="text-slate-700 text-sm leading-snug">
                                {persona.objections}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

          {/* Marketing Channels */}
          {currentAnalysis.marketing_strategy.marketing_channels &&
            currentAnalysis.marketing_strategy.marketing_channels.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
                <h4 className="text-base font-semibold text-slate-800 mb-3">
                  Marketing Channels
                </h4>
                <div className="space-y-3">
                  {currentAnalysis.marketing_strategy.marketing_channels.map(
                    (ch, i) => (
                      <div
                        key={i}
                        className="flex items-start justify-between gap-3 p-3 border border-slate-100 rounded-lg"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">
                            {ch.channel}
                          </p>
                          <p className="text-slate-600 text-sm leading-snug mt-0.5">
                            {ch.rationale}
                          </p>
                        </div>
                        <span className={`flex-shrink-0 px-2.5 py-1 text-xs font-medium rounded-full ${
                          ch.budget_tier === "free"
                            ? "bg-emerald-100 text-emerald-800"
                            : ch.budget_tier?.startsWith("low")
                              ? "bg-blue-100 text-blue-800"
                              : ch.budget_tier?.startsWith("medium")
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                        }`}>
                          {ch.budget_tier}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

          {/* Social Media Strategy */}
          {currentAnalysis.marketing_strategy.social_media_strategy && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
              <h4 className="text-base font-semibold text-slate-800 mb-1">
                Social Media Strategy
              </h4>
              <p className="text-sm text-slate-500 mb-3">
                Primary platform: <span className="font-medium text-[#1B3A5C]">{currentAnalysis.marketing_strategy.social_media_strategy.primary_platform}</span>
                {" "}&middot;{" "}Best times: {currentAnalysis.marketing_strategy.social_media_strategy.best_posting_times}
              </p>

              {currentAnalysis.marketing_strategy.social_media_strategy.post_ideas?.length > 0 && (
                <div className="space-y-4 mb-4">
                  {currentAnalysis.marketing_strategy.social_media_strategy.post_ideas.map(
                    (post, i) => (
                      <div
                        key={i}
                        className="p-3 border border-slate-100 rounded-lg"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-[#1B3A5C] uppercase tracking-wide">
                            {post.platform}
                          </span>
                          <span className="text-xs text-slate-400">&middot;</span>
                          <span className="text-xs text-slate-500">
                            {post.format}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-800 mb-1">
                          {post.hook}
                        </p>
                        <p className="text-slate-600 text-sm leading-snug">
                          {post.content_description}
                        </p>
                        <p className="text-xs text-[#1B3A5C] font-medium mt-2">
                          CTA: {post.call_to_action}
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}

              {currentAnalysis.marketing_strategy.social_media_strategy.hashtags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {currentAnalysis.marketing_strategy.social_media_strategy.hashtags.map((tag, j) => (
                    <span
                      key={j}
                      className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full"
                    >
                      {tag.startsWith("#") ? tag : `#${tag}`}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Staging & Showing Tips */}
          {currentAnalysis.marketing_strategy.staging_and_showing_tips &&
            currentAnalysis.marketing_strategy.staging_and_showing_tips.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
                <h4 className="text-base font-semibold text-slate-800 mb-3">
                  Staging &amp; Showing Tips
                </h4>
                <div className="space-y-3">
                  {currentAnalysis.marketing_strategy.staging_and_showing_tips.map(
                    (item, i) => (
                      <div key={i} className="flex gap-3 p-3 border border-slate-100 rounded-lg">
                        <div className="w-7 h-7 flex-shrink-0 bg-blue-50 rounded-full flex items-center justify-center mt-0.5">
                          <span className="text-sm font-bold text-[#1B3A5C]">
                            {i + 1}
                          </span>
                        </div>
                        <div>
                          <p className="text-slate-800 text-sm leading-snug">
                            {item.tip}
                          </p>
                          <p className="text-slate-500 text-xs mt-1">
                            {item.persona_connection}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

          {/* Open House Strategy */}
          {currentAnalysis.marketing_strategy.open_house_strategy && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
              <h4 className="text-base font-semibold text-slate-800 mb-3">
                Open House Strategy
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Timing
                  </p>
                  <p className="text-slate-700 text-sm">
                    {currentAnalysis.marketing_strategy.open_house_strategy.recommended_timing}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Vibe &amp; Atmosphere
                  </p>
                  <p className="text-slate-700 text-sm">
                    {currentAnalysis.marketing_strategy.open_house_strategy.vibe_and_atmosphere}
                  </p>
                </div>
              </div>
              {currentAnalysis.marketing_strategy.open_house_strategy.talking_points?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Talking Points
                  </p>
                  <ul className="space-y-1">
                    {currentAnalysis.marketing_strategy.open_house_strategy.talking_points.map(
                      (point, i) => (
                        <li
                          key={i}
                          className="text-slate-600 text-sm leading-snug flex gap-2"
                        >
                          <span className="text-[#1B3A5C] flex-shrink-0 mt-0.5">
                            &bull;
                          </span>
                          {point}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
              {currentAnalysis.marketing_strategy.open_house_strategy.neighborhood_tour_suggestion && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Neighborhood Tour
                  </p>
                  <p className="text-slate-700 text-sm leading-snug">
                    {currentAnalysis.marketing_strategy.open_house_strategy.neighborhood_tour_suggestion}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Ad Copy Variations */}
          {currentAnalysis.marketing_strategy.ad_copy_variations &&
            currentAnalysis.marketing_strategy.ad_copy_variations.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
                <h4 className="text-base font-semibold text-slate-800 mb-3">
                  Ad Copy
                </h4>
                <div className="space-y-4">
                  {currentAnalysis.marketing_strategy.ad_copy_variations.map((ad, i) => (
                    <div
                      key={i}
                      className="p-3 border border-slate-100 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#1B3A5C] uppercase tracking-wide">
                            {ad.platform}
                          </span>
                          <span className="text-xs text-slate-400">
                            for {ad.target_persona}
                          </span>
                        </div>
                        <CopyButton text={ad.copy} />
                      </div>
                      <p className="text-slate-700 text-sm leading-snug whitespace-pre-line">
                        {ad.copy}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Neighborhood Selling Points */}
          {currentAnalysis.marketing_strategy.neighborhood_selling_points &&
            currentAnalysis.marketing_strategy.neighborhood_selling_points.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
                <h4 className="text-base font-semibold text-slate-800 mb-3">
                  Neighborhood Selling Points
                </h4>
                <div className="space-y-2">
                  {currentAnalysis.marketing_strategy.neighborhood_selling_points.map(
                    (point, i) => (
                      <div
                        key={i}
                        className="p-2.5 bg-slate-50 rounded-lg"
                      >
                        <p className="text-slate-800 text-sm font-medium">
                          {point.amenity}
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5">
                          {point.appeal_to}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
        </>
      )}

      {/* Bottom Back Link */}
      <div className="mt-6 mb-8 text-center">
        <Link
          href="/"
          className="text-[#1B3A5C] font-medium text-sm hover:underline"
        >
          &larr; Back to Dashboard
        </Link>
      </div>
    </>
  );
}
