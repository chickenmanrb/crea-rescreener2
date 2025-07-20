const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
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
    console.log('Function started');
    
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    const { fileData } = requestBody;

    if (!fileData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No file data provided' }),
      };
    }

    // Check if API key is configured
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    console.log('API key available:', !!apiKey);
    
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'GEMINI_API_KEY not configured in Netlify environment variables. Please add it in your Netlify dashboard under Site settings > Environment variables.' 
        }),
      };
    }

    console.log('Initializing Gemini AI');
    
    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    console.log('Processing file data');

    const prompt = `Analyze this real estate offering memorandum PDF and provide a comprehensive investment analysis. Focus on:

1. Property Overview: Location, type, size, key features
2. Financial Highlights: Current NOI, rent roll, occupancy rates
3. Market Analysis: Submarket dynamics, comparable properties
4. Investment Thesis: Value-add opportunities, risk factors
5. Key Metrics: Cap rates, rent growth assumptions, exit strategy

Provide a detailed but concise analysis that would be useful for an investment committee review. Format the response in clear sections with bullet points where appropriate.`;

    console.log('Sending request to Gemini');

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: fileData,
          mimeType: 'application/pdf'
        }
      }
    ]);

    console.log('Received response from Gemini');

    const analysis = result.response.text();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ analysis }),
    };

  } catch (error) {
    console.error('Error in analyze function:', error);
    console.error('Error stack:', error.stack);
    
    let errorMessage = 'Failed to analyze PDF';
    let statusCode = 500;
    
    if (error.message.includes('API key')) {
      errorMessage = 'Invalid or missing API key configuration';
      statusCode = 401;
    } else if (error.message.includes('quota')) {
      errorMessage = 'API quota exceeded. Please try again later.';
      statusCode = 429;
    } else if (error.message.includes('safety')) {
      errorMessage = 'Content was blocked by safety filters';
      statusCode = 400;
    } else if (error.message.includes('PERMISSION_DENIED')) {
      errorMessage = 'API key does not have permission to access Gemini API';
      statusCode = 403;
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify({ 
        error: errorMessage,
        details: error.message 
      }),
    };
  }
};