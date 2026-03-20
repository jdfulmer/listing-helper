import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

// Allow max duration for streaming
export const maxDuration = 300;

const SYSTEM_PROMPT = `You are a real estate marketing expert who specializes in creating compelling property listings. You work with CB Bain (Coldwell Banker Bain) agents.

IMPORTANT: The user may provide an MLS number, a property address, a URL, or a full listing description. If you receive only an MLS number, address, or URL without full details, use web search to look up the property. Keep searches focused — 1-2 targeted searches max.

After gathering property details, IMMEDIATELY call the listing_analysis tool. Do not summarize findings in text — go straight to the tool call. For comparable properties, use your knowledge of the area and any search results to estimate comps and pricing.

Guidelines for the improved listing:
- Lead with the most compelling feature or the lifestyle the home enables
- Use sensory language that helps buyers imagine living there
- Be specific about finishes, materials, and features — "white oak hardwood floors" not just "hardwood floors"
- Mention neighborhood and location benefits (walkability, schools, parks, transit)
- Keep it professional but warm and inviting
- Avoid ALL CAPS, excessive exclamation marks, and generic phrases
- Optimal length: 150-250 words
- Structure with a strong opening line, detailed middle, and compelling close
- Provide exactly 5 highlights and 3-5 recommendations

Marketing Strategy Guidelines:
- ALWAYS include a marketing_strategy section. This makes the analysis actionable.
- Go beyond "who" to target — tell the agent HOW to reach them.
- Target personas should be vivid and specific, not generic demographics. "A senior UX designer at Amazon who bikes to work and wants a Craftsman with a home office in Ballard" not "young professionals."
- Marketing channels must include at least 2 hyperlocal options (neighborhood Facebook groups, school newsletters, local coffee shops).
- Social media posts should be ready to execute — copy-paste ready with hashtags.
- Staging tips must be tied to specific personas and rooms. "Clear counters, place a Le Creuset and open cookbook — signals the young family buyer this kitchen works for real life" not "declutter."
- Ad copy must be platform-appropriate: Instagram can be conversational with emoji, Zillow should be factual and keyword-rich.
- Open house strategy should include specific timing, refreshments, and neighborhood hooks for the target market.
- Neighborhood selling points must include approximate distances and match persona priorities.`;

const LISTING_ANALYSIS_TOOL: Anthropic.Messages.Tool = {
  name: "listing_analysis",
  description:
    "Return the improved listing, highlights, market insights, recommendations, pricing notes, and marketing strategy. You MUST call this tool with your complete analysis.",
  input_schema: {
    type: "object" as const,
    properties: {
      headline: {
        type: "string",
        description: "A compelling one-line headline for the listing",
      },
      improved_listing: {
        type: "string",
        description:
          "The improved listing description, 150-250 words. Multiple paragraphs separated by newlines.",
      },
      highlights: {
        type: "array",
        items: { type: "string" },
        description: "Exactly 5 key feature highlights",
      },
      market_insights: {
        type: "string",
        description:
          "A paragraph providing market context for this property's area, price point, and type. Be specific.",
      },
      recommendations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
          },
          required: ["title", "description"],
        },
        description: "3-5 actionable recommendations",
      },
      pricing_notes: {
        type: "string",
        description: "Brief pricing strategy advice",
      },
      comparable_properties: {
        type: "object",
        description:
          "Comparable properties analysis with recommended price range and individual comps",
        properties: {
          recommended_range: {
            type: "object",
            properties: {
              low: {
                type: "number",
                description: "Low end of recommended price range",
              },
              high: {
                type: "number",
                description: "High end of recommended price range",
              },
              reasoning: {
                type: "string",
                description:
                  "Explanation of how the recommended range was determined based on comps",
              },
            },
            required: ["low", "high", "reasoning"],
          },
          comps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                address: {
                  type: "string",
                  description: "Full address of the comparable property",
                },
                price: {
                  type: "string",
                  description: "Sale or list price, e.g. '$750,000'",
                },
                beds_baths: {
                  type: "string",
                  description: "Beds and baths, e.g. '3BR/2BA'",
                },
                sqft: {
                  type: "string",
                  description: "Square footage, e.g. '1,850 sqft'",
                },
                status: {
                  type: "string",
                  description: "'Sold', 'Active', or 'Pending'",
                },
                notes: {
                  type: "string",
                  description:
                    "Optional brief comparison note, e.g. 'Similar layout, smaller lot'",
                },
              },
              required: [
                "address",
                "price",
                "beds_baths",
                "sqft",
                "status",
              ],
            },
            description: "3-5 comparable properties",
          },
        },
        required: ["recommended_range", "comps"],
      },
      marketing_strategy: {
        type: "object",
        description:
          "Comprehensive marketing strategy with target personas, channels, social media plan, staging tips, and ad copy",
        properties: {
          target_personas: {
            type: "array",
            items: {
              type: "object",
              properties: {
                persona_name: {
                  type: "string",
                  description:
                    "A vivid, specific persona name, e.g. 'The Amazon Tech Lead Downsizer'",
                },
                demographics: {
                  type: "string",
                  description: "Age range, income, household composition",
                },
                lifestyle: {
                  type: "string",
                  description:
                    "How they spend their time, hobbies, daily routines",
                },
                motivation: {
                  type: "string",
                  description: "Why they are looking to buy this type of home",
                },
                objections: {
                  type: "string",
                  description:
                    "Likely hesitations or concerns this persona would have",
                },
              },
              required: [
                "persona_name",
                "demographics",
                "lifestyle",
                "motivation",
                "objections",
              ],
            },
            description:
              "2-4 vivid, specific target buyer personas — not generic demographics",
          },
          marketing_channels: {
            type: "array",
            items: {
              type: "object",
              properties: {
                channel: {
                  type: "string",
                  description:
                    "The marketing channel, e.g. 'Ballard Neighbors Facebook Group'",
                },
                rationale: {
                  type: "string",
                  description: "Why this channel reaches the target personas",
                },
                budget_tier: {
                  type: "string",
                  enum: [
                    "free",
                    "low ($0-100)",
                    "medium ($100-500)",
                    "high ($500+)",
                  ],
                  description: "Estimated cost tier for this channel",
                },
              },
              required: ["channel", "rationale", "budget_tier"],
            },
            description:
              "5-8 marketing channels, including at least 2 hyperlocal options",
          },
          social_media_strategy: {
            type: "object",
            properties: {
              primary_platform: {
                type: "string",
                description:
                  "The most important platform for this listing, e.g. 'Instagram'",
              },
              post_ideas: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    platform: {
                      type: "string",
                      description: "e.g. 'Instagram', 'Facebook', 'TikTok'",
                    },
                    format: {
                      type: "string",
                      description:
                        "e.g. 'Reel', 'Carousel', 'Story', 'Post'",
                    },
                    hook: {
                      type: "string",
                      description:
                        "The opening line or concept that grabs attention",
                    },
                    content_description: {
                      type: "string",
                      description: "What the post contains and shows",
                    },
                    call_to_action: {
                      type: "string",
                      description: "The CTA for viewers",
                    },
                  },
                  required: [
                    "platform",
                    "format",
                    "hook",
                    "content_description",
                    "call_to_action",
                  ],
                },
                description: "3-5 ready-to-execute post ideas",
              },
              hashtags: {
                type: "array",
                items: { type: "string" },
                description:
                  "10-15 relevant hashtags including neighborhood-specific ones",
              },
              best_posting_times: {
                type: "string",
                description:
                  "Recommended days and times for maximum engagement",
              },
            },
            required: [
              "primary_platform",
              "post_ideas",
              "hashtags",
              "best_posting_times",
            ],
          },
          staging_and_showing_tips: {
            type: "array",
            items: {
              type: "object",
              properties: {
                tip: {
                  type: "string",
                  description:
                    "A specific, actionable staging or showing tip tied to a room or area",
                },
                persona_connection: {
                  type: "string",
                  description:
                    "Which target persona this tip appeals to and why",
                },
              },
              required: ["tip", "persona_connection"],
            },
            description:
              "5-8 staging tips tied to specific personas and rooms",
          },
          open_house_strategy: {
            type: "object",
            properties: {
              recommended_timing: {
                type: "string",
                description:
                  "Specific day(s) and time window, e.g. 'Sunday 11am-1pm to catch post-brunch foot traffic'",
              },
              vibe_and_atmosphere: {
                type: "string",
                description:
                  "Music, scents, refreshments, and overall atmosphere to create",
              },
              talking_points: {
                type: "array",
                items: { type: "string" },
                description:
                  "Key points to highlight during walkthroughs",
              },
              neighborhood_tour_suggestion: {
                type: "string",
                description:
                  "A suggested pre or post open house neighborhood walk or drive route",
              },
            },
            required: [
              "recommended_timing",
              "vibe_and_atmosphere",
              "talking_points",
              "neighborhood_tour_suggestion",
            ],
          },
          ad_copy_variations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                platform: {
                  type: "string",
                  description:
                    "The platform this copy is written for, e.g. 'Instagram', 'Zillow', 'Facebook'",
                },
                copy: {
                  type: "string",
                  description:
                    "Ready-to-use ad copy appropriate for the platform's tone and format",
                },
                target_persona: {
                  type: "string",
                  description:
                    "Which persona this copy is designed to attract",
                },
              },
              required: ["platform", "copy", "target_persona"],
            },
            description:
              "3-5 platform-specific ad copy variations",
          },
          neighborhood_selling_points: {
            type: "array",
            items: {
              type: "object",
              properties: {
                amenity: {
                  type: "string",
                  description:
                    "The neighborhood amenity or feature with approximate distance",
                },
                appeal_to: {
                  type: "string",
                  description:
                    "Which persona(s) this appeals to and why",
                },
              },
              required: ["amenity", "appeal_to"],
            },
            description:
              "5-10 neighborhood selling points with distances and persona connections",
          },
        },
        required: [
          "target_personas",
          "marketing_channels",
          "social_media_strategy",
          "staging_and_showing_tips",
          "open_house_strategy",
          "ad_copy_variations",
          "neighborhood_selling_points",
        ],
      },
    },
    required: [
      "headline",
      "improved_listing",
      "highlights",
      "market_insights",
      "recommendations",
      "pricing_notes",
      "comparable_properties",
    ],
  },
};

async function runRevision(
  client: Anthropic,
  currentResult: Record<string, unknown>,
  revision: string
): Promise<Record<string, unknown>> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    tools: [LISTING_ANALYSIS_TOOL],
    tool_choice: { type: "tool", name: "listing_analysis" },
    messages: [
      {
        role: "user",
        content: `Here is the current listing analysis:\n\n${JSON.stringify(currentResult, null, 2)}\n\nThe user wants these changes:\n${revision}\n\nApply the requested changes and return the full updated analysis. Keep everything else the same unless the change affects it.`,
      },
    ],
  });

  const toolBlock = message.content.find(
    (block) => block.type === "tool_use"
  );

  if (toolBlock && toolBlock.type === "tool_use") {
    return toolBlock.input as Record<string, unknown>;
  }

  throw new Error("No revised analysis generated");
}

async function runAnalysis(
  client: Anthropic,
  input: string
): Promise<Record<string, unknown>> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 3,
      } as Anthropic.Messages.WebSearchTool20250305,
      LISTING_ANALYSIS_TOOL,
    ],
    messages: [
      {
        role: "user",
        content: `Analyze and improve this listing. If this is an MLS number, address, or URL, search the web to find the full details first. Also search for comparable properties in the area.\n\n${input}`,
      },
    ],
  });

  // Find listing_analysis tool call
  const toolBlock = message.content.find(
    (block) => block.type === "tool_use" && block.name === "listing_analysis"
  );

  if (toolBlock && toolBlock.type === "tool_use") {
    return toolBlock.input as Record<string, unknown>;
  }

  // Fallback: Claude searched but didn't call the tool — do a quick follow-up
  const researchText = message.content
    .filter(
      (block): block is Anthropic.Messages.TextBlock => block.type === "text"
    )
    .map((block) => block.text)
    .join("\n");

  const followUp = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [LISTING_ANALYSIS_TOOL],
    tool_choice: { type: "tool", name: "listing_analysis" },
    messages: [
      {
        role: "user",
        content: `Analyze and improve this listing based on the research below. Include comparable properties and a recommended price range.\n\n${researchText}`,
      },
    ],
  });

  const followUpBlock = followUp.content.find(
    (block) => block.type === "tool_use"
  );

  if (followUpBlock && followUpBlock.type === "tool_use") {
    return followUpBlock.input as Record<string, unknown>;
  }

  throw new Error("No analysis generated");
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return Response.json(
      {
        error:
          "API key not configured. Please add your ANTHROPIC_API_KEY to the .env.local file.",
      },
      { status: 500 }
    );
  }

  // Auth check
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

  let listing: string;
  let revision: string | undefined;
  let currentResult: Record<string, unknown> | undefined;
  let listingId: string | undefined;
  try {
    const body = await request.json();
    listing = body?.listing;
    revision = body?.revision;
    currentResult = body?.currentResult;
    listingId = body?.listingId;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  // Revision mode: need revision text + current result
  if (revision && currentResult) {
    const client = new Anthropic({ apiKey });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const keepAlive = setInterval(() => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ status: "processing" })}\n\n`)
          );
        }, 5000);

        try {
          const result = await runRevision(client, currentResult!, revision!);
          clearInterval(keepAlive);

          // Save revision to database
          let savedListingId = listingId;
          try {
            if (savedListingId) {
              // Get the max version for this listing
              const { data: maxVersionRow } = await supabase
                .from("analyses")
                .select("version")
                .eq("listing_id", savedListingId)
                .order("version", { ascending: false })
                .limit(1)
                .single();

              const nextVersion = (maxVersionRow?.version ?? 0) + 1;

              // Update the listing's raw revision prompt
              await supabase
                .from("listings")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", savedListingId);

              // Create a new analysis row for the revision
              await supabase.from("analyses").insert({
                listing_id: savedListingId,
                version: nextVersion,
                revision_prompt: revision,
                headline: (result as Record<string, unknown>).headline ?? null,
                improved_listing:
                  (result as Record<string, unknown>).improved_listing ?? null,
                highlights:
                  (result as Record<string, unknown>).highlights ?? null,
                market_insights:
                  (result as Record<string, unknown>).market_insights ?? null,
                recommendations:
                  (result as Record<string, unknown>).recommendations ?? null,
                pricing_notes:
                  (result as Record<string, unknown>).pricing_notes ?? null,
                comparable_properties:
                  (result as Record<string, unknown>).comparable_properties ??
                  null,
                marketing_strategy:
                  (result as Record<string, unknown>).marketing_strategy ??
                  null,
              });
            }
          } catch (dbErr) {
            console.error("Failed to save revision to database:", dbErr);
            // Don't fail the request — still return the result
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ result, listing_id: savedListingId })}\n\n`
            )
          );
        } catch (err) {
          clearInterval(keepAlive);
          console.error("Revision error:", err);
          const errMessage =
            err instanceof Error ? err.message : "Something went wrong";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: errMessage })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  if (!listing || typeof listing !== "string" || !listing.trim()) {
    return Response.json(
      { error: "Please provide a listing to analyze." },
      { status: 400 }
    );
  }

  const client = new Anthropic({ apiKey });
  const input = listing.trim();

  // Use streaming response to keep connection alive and avoid Vercel timeout
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send keep-alive pings every 5 seconds while processing
      const keepAlive = setInterval(() => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ status: "processing" })}\n\n`)
        );
      }, 5000);

      try {
        const result = await runAnalysis(client, input);
        clearInterval(keepAlive);

        // Save to database
        let savedListingId: string | undefined;
        try {
          // Extract address from result or use first line of input
          const address =
            typeof (result as Record<string, unknown>).headline === "string"
              ? ((result as Record<string, unknown>).headline as string)
              : input.split("\n")[0].substring(0, 255);

          // Create the listing row
          const { data: listingRow, error: listingErr } = await supabase
            .from("listings")
            .insert({
              user_id: user.id,
              address,
              raw_input: input,
              status: "active",
            })
            .select("id")
            .single();

          if (listingErr) {
            console.error("Failed to create listing:", listingErr);
          } else if (listingRow) {
            savedListingId = listingRow.id;

            // Create the first analysis row
            const { error: analysisErr } = await supabase
              .from("analyses")
              .insert({
                listing_id: savedListingId,
                version: 1,
                headline:
                  (result as Record<string, unknown>).headline ?? null,
                improved_listing:
                  (result as Record<string, unknown>).improved_listing ?? null,
                highlights:
                  (result as Record<string, unknown>).highlights ?? null,
                market_insights:
                  (result as Record<string, unknown>).market_insights ?? null,
                recommendations:
                  (result as Record<string, unknown>).recommendations ?? null,
                pricing_notes:
                  (result as Record<string, unknown>).pricing_notes ?? null,
                comparable_properties:
                  (result as Record<string, unknown>).comparable_properties ??
                  null,
                marketing_strategy:
                  (result as Record<string, unknown>).marketing_strategy ??
                  null,
              });

            if (analysisErr) {
              console.error("Failed to create analysis:", analysisErr);
            }
          }
        } catch (dbErr) {
          console.error("Failed to save to database:", dbErr);
          // Don't fail the request — still return the result
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ result, listing_id: savedListingId })}\n\n`
          )
        );
      } catch (err) {
        clearInterval(keepAlive);
        console.error("Analysis error:", err);
        const errMessage =
          err instanceof Error ? err.message : "Something went wrong";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: errMessage })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
