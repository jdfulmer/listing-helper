import Anthropic from "@anthropic-ai/sdk";

// Allow up to 60s for web search + analysis
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a real estate marketing expert who specializes in creating compelling property listings. You work with CB Bain (Coldwell Banker Bain) agents.

IMPORTANT: The user may provide an MLS number, a property address, or a full listing description. If you receive only an MLS number or address without full details, you MUST use web search to look up the property first. Search for the MLS number on real estate sites (Redfin, Zillow, Realtor.com, etc.) to find the full listing details including price, beds/baths, square footage, features, location, and description.

After you have gathered all the property details (either from the user's input or from web search), you MUST call the listing_analysis tool with your complete analysis.

Guidelines for the improved listing:
- Lead with the most compelling feature or the lifestyle the home enables
- Use sensory language that helps buyers imagine living there
- Be specific about finishes, materials, and features — "white oak hardwood floors" not just "hardwood floors"
- Mention neighborhood and location benefits (walkability, schools, parks, transit)
- Keep it professional but warm and inviting
- Avoid ALL CAPS, excessive exclamation marks, and generic phrases
- Optimal length: 150-250 words
- Structure with a strong opening line, detailed middle, and compelling close
- Provide exactly 5 highlights and 3-5 recommendations`;

const LISTING_ANALYSIS_TOOL: Anthropic.Messages.Tool = {
  name: "listing_analysis",
  description:
    "Return the improved listing, highlights, market insights, recommendations, and pricing notes. You MUST call this tool with your complete analysis.",
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

  try {
    const body = await request.json();
    const listing = body?.listing;

    if (!listing || typeof listing !== "string" || !listing.trim()) {
      return Response.json(
        { error: "Please provide a listing to analyze." },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey });
    const input = listing.trim();

    // Single API call: web search (server-side) finds listing + comps,
    // then Claude calls listing_analysis with structured output.
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 5,
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

    // Find the listing_analysis tool call in the response
    const toolBlock = message.content.find(
      (block) => block.type === "tool_use" && block.name === "listing_analysis"
    );

    if (!toolBlock || toolBlock.type !== "tool_use") {
      // Claude searched but didn't call listing_analysis — do a follow-up call
      const researchText = message.content
        .filter(
          (block): block is Anthropic.Messages.TextBlock =>
            block.type === "text"
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

      if (!followUpBlock || followUpBlock.type !== "tool_use") {
        return Response.json(
          { error: "No analysis generated. Please try again." },
          { status: 500 }
        );
      }

      return Response.json(followUpBlock.input);
    }

    return Response.json(toolBlock.input);
  } catch (err) {
    console.error("Analysis error:", err);

    const errMessage =
      err instanceof Error ? err.message : "Something went wrong";

    if (
      errMessage.includes("authentication") ||
      errMessage.includes("api_key")
    ) {
      return Response.json(
        { error: "Invalid API key. Please check your ANTHROPIC_API_KEY." },
        { status: 401 }
      );
    }

    return Response.json(
      { error: `Analysis failed: ${errMessage}` },
      { status: 500 }
    );
  }
}
