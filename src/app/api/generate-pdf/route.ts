import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { EICRDocument } from "@/lib/pdf-document";
import { EICRFormData } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();

    // Validate required fields
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const data = body as EICRFormData;

    // Validate required top-level fields
    const requiredFields = [
      "client_name",
      "client_address",
      "installation_address",
      "inspector_name",
      "inspection_date",
      "next_inspection_date",
      "analysis",
    ];

    for (const field of requiredFields) {
      if (!(field in data)) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate analysis structure
    if (!data.analysis || typeof data.analysis !== "object") {
      return NextResponse.json(
        { error: "Invalid analysis data" },
        { status: 400 }
      );
    }

    const analysisFields = [
      "manufacturer",
      "main_switch_amps",
      "rcds",
      "circuits",
      "observations",
    ];

    for (const field of analysisFields) {
      if (!(field in data.analysis)) {
        return NextResponse.json(
          { error: `Missing required analysis field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate arrays
    if (!Array.isArray(data.analysis.rcds)) {
      return NextResponse.json(
        { error: "analysis.rcds must be an array" },
        { status: 400 }
      );
    }

    if (!Array.isArray(data.analysis.circuits)) {
      return NextResponse.json(
        { error: "analysis.circuits must be an array" },
        { status: 400 }
      );
    }

    if (!Array.isArray(data.analysis.observations)) {
      return NextResponse.json(
        { error: "analysis.observations must be an array" },
        { status: 400 }
      );
    }

    // Generate PDF
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(EICRDocument({ data }) as any);

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(pdfBuffer);

    // Return PDF response
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="EICR-${data.client_name.replace(/[^a-zA-Z0-9]/g, "_")}-${data.inspection_date}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
