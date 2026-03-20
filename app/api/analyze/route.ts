import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are a real estate marketing expert who specializes in creating compelling property listings. You work with CB Bain (Coldwell Banker Bain) agents.

When given an MLS listing, you will:
1. Analyze the listing details (location, price, beds/baths, square footage, features, lot, neighborhood, etc.)
2. Create an improved, compelling listing description that will attract more buyers
3. Provide market insights and actionable recommendations

You MUST respond with valid JSON in this exact format:
{
  "headline": "A compelling one-line headline for the listing",
  "improved_listing": "The improved listing description. Multiple paragraphs separated by newlines. Use clear, compelling language that highlights the property's best features. Avoid clichés and overused real estate jargon like 'nestled' or 'boasts'. Be specific and paint a picture for potential buyers.",
  "highlights": ["Key Feature 1", "Key Feature 2", "Key Feature 3", "Key Feature 4", "Key Feature 5"],
  "market_insights": "A paragraph providing market context for this property's area, price point, and property type. Discuss what makes this property competitive, relevant buyer demographics, and any market trends that are relevant. Be specific to the area if you can identify it.",
  "recommendations": [
    {"title": "Short title", "description": "Actionable recommendation for improving the listing, marketing strategy, staging, photography, or timing"},
    {"title": "Short title", "description": "Another recommendation"}
  ],
  "pricing_notes": "Brief pricing strategy advice based on the listing details and market context. Include thoughts on positioning relative to the market."
}

Guidelines for the improved listing:
- Lead with the most compelling feature or the lifestyle the home enables
- Use sensory language that helps buyers imagine living there
- Be specific about finishes, materials, and features — "white oak hardwood floors" not just "hardwood floors"
- Mention neighborhood and location benefits (walkability, schools, parks, transit)
- Keep it professional but warm and inviting
- Avoid ALL CAPS, excessive exclamation marks, and generic phrases
- Optimal length: 150-250 words
- Structure with a strong opening line, detailed middle, and compelling close

Provide exactly 5 highlights and 3-5 recommendations.

IMPORTANT: Respond with ONLY the JSON object. No markdown formatting, no code blocks, no backticks — just raw JSON.`;

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

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here is my MLS listing to improve:\n\n${listing.trim()}`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");

    if (!textBlock || textBlock.type !== "text") {
      return Response.json(
        { error: "No response generated. Please try again." },
        { status: 500 }
      );
    }

    // Clean potential markdown code fences from the response
    let text = textBlock.text.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const result = JSON.parse(text);
    return Response.json(result);
  } catch (err) {
    console.error("Analysis error:", err);

    if (err instanceof SyntaxError) {
      return Response.json(
        { error: "Failed to parse the analysis. Please try again." },
        { status: 500 }
      );
    }

    const errMessage =
      err instanceof Error ? err.message : "Something went wrong";

    if (errMessage.includes("authentication") || errMessage.includes("api_key")) {
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
