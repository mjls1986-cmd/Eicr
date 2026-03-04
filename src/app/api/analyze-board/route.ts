import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

interface RCD {
  position: string;
  type: string;
  rating_ma: number;
}

interface Circuit {
  position: number;
  type: string;
  rating_amps: number;
  label: string;
  rcd_protected: boolean;
}

interface Observation {
  code: string;
  description: string;
  severity: "C1" | "C2" | "C3" | "FI";
}

interface BoardAnalysisResult {
  manufacturer: string;
  main_switch_amps: number;
  system_type: string;
  rcds: RCD[];
  circuits: Circuit[];
  observations: Observation[];
}

const ANALYSIS_PROMPT = `You are an expert electrical inspector analyzing a photo of an electrical distribution board (consumer unit).

Analyze this image and extract the following information in JSON format:

1. **manufacturer**: The brand/manufacturer of the board (e.g., "Hager", "MK", "Wylex", "Crabtree", etc.)
2. **main_switch_amps**: The amperage rating of the main switch (typically 63A, 80A, or 100A)
3. **system_type**: The earthing system type (e.g., "TN-C-S", "TN-S", "TT")
4. **rcds**: Array of RCDs (Residual Current Devices) with:
   - position: Location in the board (e.g., "Left", "Right", "Main")
   - type: Type of RCD (e.g., "Type A", "Type AC", "Type B")
   - rating_ma: Trip current in milliamps (typically 30mA or 100mA)
5. **circuits**: Array of circuits with:
   - position: Circuit number/position (1, 2, 3, etc.)
   - type: Type of protective device (e.g., "MCB", "RCBO")
   - rating_amps: Current rating in amps (6, 10, 16, 20, 32, etc.)
   - label: What the circuit is for (e.g., "Lighting", "Ring Main", "Cooker", "Shower")
   - rcd_protected: Whether this circuit is protected by an RCD
6. **observations**: Array of any issues or observations with:
   - code: Observation code (e.g., "4.1", "5.3")
   - description: Description of the issue
   - severity: One of "C1" (danger present), "C2" (potentially dangerous), "C3" (improvement recommended), or "FI" (further investigation required)

Look for:
- Labels on devices
- Ratings printed on MCBs and RCBOs
- Any signs of damage, overheating, or poor workmanship
- Missing knockouts or covers
- Evidence of DIY work
- Correct labeling

Return ONLY valid JSON matching this exact structure:
{
  "manufacturer": "string",
  "main_switch_amps": number,
  "system_type": "string",
  "rcds": [{ "position": "string", "type": "string", "rating_ma": number }],
  "circuits": [{ "position": number, "type": "string", "rating_amps": number, "label": "string", "rcd_protected": boolean }],
  "observations": [{ "code": "string", "description": "string", "severity": "C1" | "C2" | "C3" | "FI" }]
}

If you cannot determine a value, make a reasonable estimate based on typical UK installations or mark it as "Unknown".`;

export async function POST(request: NextRequest) {
  try {
    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY environment variable is not configured" },
        { status: 500 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const imageFile = formData.get("image");

    if (!imageFile || !(imageFile instanceof File)) {
      return NextResponse.json(
        { error: "No image file provided. Please upload an image using the 'image' field." },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${imageFile.type}. Supported types: JPEG, PNG, GIF, WebP` },
        { status: 400 }
      );
    }

    // Convert file to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    // Call Claude with vision
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: imageFile.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: base64Image,
              },
            },
            {
              type: "text",
              text: ANALYSIS_PROMPT,
            },
          ],
        },
      ],
    });

    // Extract text content from response
    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json(
        { error: "No text response received from Claude" },
        { status: 500 }
      );
    }

    // Parse JSON from response
    let analysisResult: BoardAnalysisResult;
    try {
      // Extract JSON from the response (handle potential markdown code blocks)
      let jsonText = textContent.text;
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
      analysisResult = JSON.parse(jsonText.trim());
    } catch {
      return NextResponse.json(
        {
          error: "Failed to parse analysis result as JSON",
          raw_response: textContent.text
        },
        { status: 500 }
      );
    }

    // Validate the response structure
    if (
      typeof analysisResult.manufacturer !== "string" ||
      typeof analysisResult.main_switch_amps !== "number" ||
      typeof analysisResult.system_type !== "string" ||
      !Array.isArray(analysisResult.rcds) ||
      !Array.isArray(analysisResult.circuits) ||
      !Array.isArray(analysisResult.observations)
    ) {
      return NextResponse.json(
        {
          error: "Invalid response structure from Claude",
          raw_response: textContent.text
        },
        { status: 500 }
      );
    }

    return NextResponse.json(analysisResult, { status: 200 });

  } catch (error) {
    console.error("Error analyzing board:", error);

    // Handle specific Anthropic API errors
    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: "Invalid Anthropic API key" },
          { status: 401 }
        );
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later." },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: `Anthropic API error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    // Handle generic errors
    return NextResponse.json(
      { error: "An unexpected error occurred while analyzing the board image" },
      { status: 500 }
    );
  }
}
