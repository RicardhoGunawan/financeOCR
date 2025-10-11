export const runtime = 'nodejs';
export const config = { api: { bodyParser: false } };
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);


export async function POST(request: NextRequest) {
  const logs: string[] = [];

  function log(message: string, data?: any) {
    const line = data ? `${message} ${JSON.stringify(data)}` : message;
    logs.push(line);
    console.log(line);
  }

  try {
    log("📩 Incoming POST request to /api/ocr");
    log("🔑 GEMINI_API_KEY available:", !!process.env.GEMINI_API_KEY);

    const formData = await request.formData();
    const file = formData.get('file') as File;

    log("📂 File received:", file?.name || "No file");

    if (!file) {
      return NextResponse.json({ error: 'No file provided', logs }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const genAI = new (require('@google/generative-ai').GoogleGenerativeAI)(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    log("🤖 Using model: gemini-2.5-flash");

    const imagePart = {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: file.type,
      },
    };

    const prompt = `
Analyze this financial document and return JSON with these keys:
{
  "amount": <number>,
  "date": "<YYYY-MM-DD>",
  "title": "<merchant name>",
  "description": "<brief description>",
  "type": "expense" or "income",
  "extracted_text": "<full extracted text>"
}
`;

    log("🚀 Sending request to Gemini API...");
    const result = await model.generateContent([prompt, imagePart]);
    log("✅ Gemini API responded:", !!result);

    const response = await result.response;
    const text = response.text();
    log("🧾 Gemini text length:", text?.length || 0);

    if (!text) {
      return NextResponse.json(
        { error: "Gemini returned empty text", logs },
        { status: 500 }
      );
    }

    let parsedData;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsedData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
      log("✅ Parsed JSON successfully");
    } catch {
      log("⚠️ JSON parse failed, using fallback text");
      parsedData = {
        amount: null,
        date: null,
        title: 'OCR Document',
        description: text,
        type: 'expense',
        extracted_text: text,
      };
    }

    log("✅ Final parsed data:", parsedData);

    return NextResponse.json({
      success: true,
      data: parsedData,
      debugLogs: logs, // <--- kirim log ke client
    });

  } catch (error: any) {
    console.error('💥 OCR Error:', error);
    logs.push("💥 OCR Error: " + (error.message || JSON.stringify(error)));
    return NextResponse.json(
      { error: error.message || 'Failed to process image', logs },
      { status: 500 }
    );
  }
}
