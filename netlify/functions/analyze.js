// This is the secure, server-side function that will call the Google AI API.
// It lives in `netlify/functions/analyze.js`

// Use node-fetch for a reliable, server-side fetch implementation
const fetch = require('node-fetch');

exports.handler = async function (event) {
  // We only accept POST requests
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  try {
    const { fileData } = JSON.parse(event.body);

    // Get the secret API key from the environment variables
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("GEMINI_API_KEY is not configured on the server.");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "API key is not configured on the server. Deployment is missing the GEMINI_API_KEY environment variable." })
      };
    }
    
    const prompt = `Analyze this real estate document for key insights relevant to investment screening. Focus on:
      1. Property details (location, size, type, age, condition)
      2. Financial metrics (NOI, rent roll, expenses, cap rates)
      3. Market conditions and comparables
      4. Risk factors and opportunities
      5. Any red flags or concerns
      Provide a concise summary of the most important findings that would impact investment decision-making. Keep response under 500 words and focus on actionable insights.`;
    
    const payload = {
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: fileData
            }
          }
        ]
      }],
    };
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      console.error("Google AI API Error:", errorBody);
      return {
        statusCode: apiResponse.status,
        body: JSON.stringify({ error: `Google AI API Error: ${errorBody}` })
      };
    }

    const result = await apiResponse.json();
    const analysisText = result.candidates?.[0]?.content?.parts?.[0]?.text || "Could not extract analysis from the API response.";

    return {
      statusCode: 200,
      body: JSON.stringify({ analysis: analysisText }),
    };

  } catch (error) {
    console.error('Error in analyze function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
