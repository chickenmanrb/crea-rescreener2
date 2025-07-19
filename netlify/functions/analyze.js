const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { fileData } = JSON.parse(event.body);

    if (!fileData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No file data provided' }),
      };
    }

    // Check if API key is configured
    const apiKey = process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'VITE_GEMINI_API_KEY not configured in environment variables' 
        }),
      };
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Convert base64 to buffer for Gemini
    const pdfBuffer = Buffer.from(fileData, 'base64');

    const prompt = `Analyze this real estate offering memorandum PDF and provide a comprehensive investment analysis. Focus on:

1. Property Overview: Location, type, size, key features
2. Financial Highlights: Current NOI, rent roll, occupancy rates
3. Market Analysis: Submarket dynamics, comparable properties
4. Investment Thesis: Value-add opportunities, risk factors
5. Key Metrics: Cap rates, rent growth assumptions, exit strategy

Provide a detailed but concise analysis that would be useful for an investment committee review. Format the response in clear sections with bullet points where appropriate.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: fileData,
          mimeType: 'application/pdf'
        }
      }
    ]);

    const analysis = result.response.text();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ analysis }),
    };

  } catch (error) {
    console.error('Error analyzing PDF:', error);
    
    let errorMessage = 'Failed to analyze PDF';
    if (error.message.includes('API key')) {
      errorMessage = 'Invalid or missing API key configuration';
    } else if (error.message.includes('quota')) {
      errorMessage = 'API quota exceeded. Please try again later.';
    } else if (error.message.includes('safety')) {
      errorMessage = 'Content was blocked by safety filters';
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: errorMessage }),
    };
  }
};