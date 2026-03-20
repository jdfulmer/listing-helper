"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewListingPage() {
  const router = useRouter();
  const [listing, setListing] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAnalyze() {
    if (!listing.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing: listing.trim() }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Something went wrong. Please try again.");
      }

      // Read SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }

      // Parse the last data event (skip keep-alive pings)
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

      // The API should return a listing_id — redirect to it
      if (data.listing_id) {
        router.push(`/listings/${data.listing_id}`);
      } else {
        throw new Error("No listing ID returned. Please try again.");
      }
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

  return (
    <>
      {/* Input Section */}
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-800 mb-1">
          New Listing
        </h2>
        <p className="text-slate-500 text-sm leading-snug">
          Enter an MLS number, property address, or paste your full listing
          &mdash; we&apos;ll look it up and create improved copy with market
          insights.
        </p>
      </div>

      <textarea
        className="w-full h-52 p-4 text-base border border-slate-300 rounded-xl bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#1B3A5C] focus:border-transparent placeholder:text-slate-400"
        placeholder={`Enter an MLS number, address, or paste a full listing...\n\nExamples:\n\u2022 2486142\n\u2022 123 Main St, Seattle WA\n\u2022 3BR/2BA Craftsman in Ballard, $875,000...`}
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
  );
}
