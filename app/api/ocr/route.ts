import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const imagePart = {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: file.type,
      },
    };

    const prompt = `Analyze this financial document (receipt, invoice, or bill). Extract the following information:
1. Total amount (just the number, no currency symbol)
2. Date (in YYYY-MM-DD format)
3. Merchant/vendor name
4. Brief description of the transaction
5. Whether this appears to be an expense or income (most likely expense for receipts)

Return the data in JSON format with these exact keys:
{
  "amount": <number>,
  "date": "<YYYY-MM-DD>",
  "title": "<merchant name>",
  "description": "<brief description>",
  "type": "expense" or "income",
  "extracted_text": "<full extracted text from image>"
}

If any field cannot be determined, use null for that field.`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    let parsedData;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        parsedData = JSON.parse(text);
      }
    } catch (parseError) {
      parsedData = {
        amount: null,
        date: null,
        title: 'OCR Document',
        description: text,
        type: 'expense',
        extracted_text: text,
      };
    }

    return NextResponse.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('OCR Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process image' },
      { status: 500 }
    );
  }
}
