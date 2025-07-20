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
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    console.log('API key available:', !!apiKey);
    
    if (!apiKey) {
      console.log('No API key found, returning fallback analysis');
      const fallbackAnalysis = `**Document Analysis (Demo Mode)**

**Property Overview:**
- Document uploaded successfully for analysis
- PDF contains ${Math.floor(fileData.length / 1000)} KB of data
- Analysis requires GEMINI_API_KEY configuration

**Setup Instructions:**
1. Go to your Netlify dashboard
2. Navigate to Site settings > Environment variables
3. Add GEMINI_API_KEY with your Google AI API key
4. Redeploy the site

**Demo Analysis:**
This appears to be a real estate offering memorandum. In full mode, this tool would analyze:
- Property details and location
- Financial performance metrics
- Market comparables and trends
- Investment risks and opportunities
- Recommended due diligence items

To enable full AI analysis, please configure the GEMINI_API_KEY environment variable.`;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ analysis: fallbackAnalysis }),
      };
    }

    console.log('Attempting to load Google Generative AI');
    
    // Try to load the Google Generative AI package
    let GoogleGenerativeAI;
    try {
      const genAI = require('@google/generative-ai');
      GoogleGenerativeAI = genAI.GoogleGenerativeAI;
    } catch (importError) {
      console.error('Failed to import Google Generative AI:', importError);
      
      const errorAnalysis = `**Document Analysis (Import Error)**

**Error Details:**
- Failed to load Google Generative AI package
- This may be due to missing dependencies in the serverless environment

**Fallback Analysis:**
- Document received: ${Math.floor(fileData.length / 1000)} KB PDF
- To enable full AI analysis, ensure @google/generative-ai is properly installed
- Consider using a different deployment method or contact support

**Technical Details:**
${importError.message}`;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ analysis: errorAnalysis }),
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

    // Always return a 200 with error details to avoid Netlify's generic error page
    const fallbackAnalysis = `**Document Analysis (Error)**

**Error Details:**
- ${errorMessage}
- Technical error: ${error.message}

**Fallback Analysis:**
- Document received: ${Math.floor((event.body?.length || 0) / 1000)} KB of data
- PDF analysis requires proper API configuration
- Please check environment variables and try again

**Next Steps:**
1. Verify GEMINI_API_KEY is set in Netlify environment variables
2. Ensure API key has proper permissions
3. Check API quota limits
4. Contact support if issues persist`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ analysis: fallbackAnalysis }),
    };
  }
};