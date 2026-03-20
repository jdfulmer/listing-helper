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
    },
    required: [
      "headline",
      "improved_listing",
      "highlights",
      "market_insights",
      "recommendations",
      "pricing_notes",
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

    // Step 1: Use web search to look up the listing, then get a text summary
    const researchMessage = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system:
        "You are a real estate research assistant. Your job is to find complete property listing details. If given an MLS number or address, search the web to find the full listing. If given a full listing description, just pass it through. Return a comprehensive summary of the property including: address, price, beds/baths, square footage, lot size, year built, property type, all features, description, neighborhood details, and any other relevant information. Be as detailed as possible.",
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 5,
        } as Anthropic.Messages.WebSearchTool20250305,
      ],
      messages: [
        {
          role: "user",
          content: `Find the complete property details for this listing:\n\n${input}`,
        },
      ],
    });

    // Extract the text summary from the research step
    const researchText = researchMessage.content
      .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    if (!researchText.trim()) {
      return Response.json(
        {
          error:
            "Could not find listing details. Try pasting the full listing description instead.",
        },
        { status: 400 }
      );
    }

    // Step 2: Analyze the listing with structured output
    const analysisMessage = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [LISTING_ANALYSIS_TOOL],
      tool_choice: { type: "tool", name: "listing_analysis" },
      messages: [
        {
          role: "user",
          content: `Here are the complete property details to analyze and improve:\n\n${researchText}`,
        },
      ],
    });

    const toolBlock = analysisMessage.content.find(
      (block) => block.type === "tool_use"
    );

    if (!toolBlock || toolBlock.type !== "tool_use") {
      return Response.json(
        { error: "No analysis generated. Please try again." },
        { status: 500 }
      );
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
