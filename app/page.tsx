"use client";

import { useState } from "react";

type AnalysisResult = {
  headline: string;
  improved_listing: string;
  highlights: string[];
  market_insights: string;
  recommendations: { title: string; description: string }[];
  pricing_notes: string;
  comparable_properties: {
    recommended_range: {
      low: number;
      high: number;
      reasoning: string;
    };
    comps: {
      address: string;
      price: string;
      beds_baths: string;
      sqft: string;
      status: string;
      notes?: string;
    }[];
  };
};

export default function Home() {
  const [listing, setListing] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleAnalyze() {
    if (!listing.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing: listing.trim() }),
      });

      if (!res.ok) {
        let message = "Something went wrong. Please try again.";
        try {
          const data = await res.json();
          message = data.error || message;
        } catch {
          if (res.status === 504) {
            message =
              "The analysis took too long. Try pasting the full listing text instead of just the MLS number.";
          }
        }
        throw new Error(message);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleReset() {
    setResult(null);
    setListing("");
    setError("");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-[#1B3A5C] text-white px-5 py-4 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <svg
            className="w-7 h-7 flex-shrink-0"
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
          <div>
            <h1 className="text-lg font-semibold leading-tight">
              Listing Pro
            </h1>
            <p className="text-xs text-blue-200 leading-tight">The Fulmer Team</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6">
        {!result ? (
          <>
            {/* Input Section */}
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-slate-800 mb-1">
                Improve Your Listing
              </h2>
              <p className="text-slate-500 text-sm leading-snug">
                Enter an MLS number, property address, or paste your full
                listing — we&apos;ll look it up and create improved copy with
                market insights.
              </p>
            </div>

            <textarea
              className="w-full h-52 p-4 text-base border border-slate-300 rounded-xl bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#1B3A5C] focus:border-transparent placeholder:text-slate-400"
              placeholder={`Enter an MLS number, address, or paste a full listing...\n\nExamples:\n• 2486142\n• 123 Main St, Seattle WA\n• 3BR/2BA Craftsman in Ballard, $875,000...`}
              value={listing}
              onChange={(e) => setListing(e.target.value)}
              disabled={loading}
            />

            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={loading || !listing.trim()}
              className="w-full mt-4 py-4 px-6 bg-[#1B3A5C] text-white text-lg font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
                  Looking up &amp; analyzing...
                </span>
              ) : (
                "Improve My Listing"
              )}
            </button>

            {loading && (
              <p className="text-center text-slate-400 text-sm mt-3">
                This usually takes 15-30 seconds
              </p>
            )}
          </>
        ) : (
          <>
            {/* Results */}

            {/* Improved Listing Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-slate-800">
                  Your Improved Listing
                </h3>
                <button
                  onClick={() =>
                    handleCopy(
                      (result.headline ? result.headline + "\n\n" : "") +
                        result.improved_listing
                    )
                  }
                  className="px-4 py-2 text-sm font-medium text-[#1B3A5C] bg-blue-50 rounded-lg active:bg-blue-100 transition-colors cursor-pointer"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              {result.headline && (
                <h4 className="text-base font-bold text-slate-900 mb-3">
                  {result.headline}
                </h4>
              )}

              <p className="text-slate-700 text-[15px] leading-relaxed whitespace-pre-line">
                {result.improved_listing}
              </p>

              {result.highlights && result.highlights.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Key Highlights
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.highlights.map((h, i) => (
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
            {result.market_insights && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-3">
                  Market Insights
                </h3>
                <p className="text-slate-700 text-[15px] leading-relaxed whitespace-pre-line">
                  {result.market_insights}
                </p>
              </div>
            )}

            {/* Recommended Price Range Card */}
            {result.comparable_properties?.recommended_range && (
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
                  ${result.comparable_properties.recommended_range.low.toLocaleString()}
                  {" "}&ndash;{" "}
                  ${result.comparable_properties.recommended_range.high.toLocaleString()}
                </p>
                <p className="text-emerald-800 text-sm leading-relaxed">
                  {result.comparable_properties.recommended_range.reasoning}
                </p>
              </div>
            )}

            {/* Comparable Properties Card */}
            {result.comparable_properties?.comps &&
              result.comparable_properties.comps.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">
                    Comparable Properties
                  </h3>
                  <div className="space-y-3">
                    {result.comparable_properties.comps.map((comp, i) => (
                      <div
                        key={i}
                        className="p-3 border border-slate-100 rounded-lg"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-semibold text-slate-800 text-[15px]">
                            {comp.address}
                          </p>
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
                          <p className="text-xs text-slate-400 mt-1">
                            {comp.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Recommendations Card */}
            {result.recommendations && result.recommendations.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                  Recommendations
                </h3>
                <div className="space-y-4">
                  {result.recommendations.map((rec, i) => (
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
            {result.pricing_notes && (
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
                  {result.pricing_notes}
                </p>
              </div>
            )}

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="w-full mt-2 mb-8 py-4 px-6 bg-[#1B3A5C] text-white text-lg font-semibold rounded-xl active:scale-[0.98] transition-all cursor-pointer"
            >
              Analyze Another Listing
            </button>
          </>
        )}
      </main>
    </div>
  );
}
