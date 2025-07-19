// This is the secure, server-side function that will call the Google AI API.
// It lives in `netlify/functions/analyze.js`

// Use built-in fetch API (available in Node.js 18+)

exports.handler = async function (event, context) {
  console.log('Function called with method:', event.httpMethod);
  console.log('Request headers:', event.headers);
  
  // Set CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // We only accept POST requests
  if (event.httpMethod !== 'POST') {
    console.log('Invalid method:', event.httpMethod);
    return { 
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  try {
    console.log('Processing POST request...');
    
    // Parse request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
      console.log('Request body parsed successfully');
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid JSON in request body" })
      };
    }

    const { fileData } = requestBody;

    // Support both old fileData (base64) and new extractedText formats
    const { extractedText } = requestBody;
    
    if (!fileData && !extractedText) {
      console.log('No file data provided');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "No file data or extracted text provided" })
      };
    }

    // Handle text-based analysis (new approach)
    if (extractedText) {
      console.log('Extracted text received, length:', extractedText.length);
      
      if (typeof extractedText !== 'string' || extractedText.trim().length === 0) {
        console.error('Invalid extracted text format');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Invalid extracted text format" })
        };
      }
      
      // Use text-based analysis
      return await analyzeExtractedText(extractedText, process.env.GEMINI_API_KEY, headers);
    }
    
    // Handle legacy base64 file data (fallback)
    if (fileData) {
      console.log('File data received, length:', fileData.length);
      
      // Validate base64 data
      if (typeof fileData !== 'string' || fileData.length === 0) {
        console.error('Invalid file data format');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Invalid file data format" })
        };
      }
      
      // Log file data info for debugging
      console.log('File data type:', typeof fileData);
      console.log('File data length:', fileData.length);
      console.log('File data sample (first 50 chars):', fileData.substring(0, 50));
      
      // Check if it looks like valid base64
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(fileData)) {
        console.error('File data does not appear to be valid base64');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "File data is not valid base64" })
        };
      }
      
      // Use legacy PDF analysis
      return await analyzePDFFile(fileData, process.env.GEMINI_API_KEY, headers);
    }

  } catch (error) {
    console.error('Unexpected error in analyze function:', error);
    console.error('Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: `Server error: ${error.message}`,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};

// New function to analyze extracted text
async function analyzeExtractedText(extractedText, apiKey, headers) {
  try {
    console.log('API key found, preparing text analysis request...');
    
    const prompt = `Analyze this real estate document text for key insights relevant to investment screening. Focus on:
      1. Property details (location, size, type, age, condition)
      2. Financial metrics (NOI, rent roll, expenses, cap rates)
      3. Market conditions and comparables
      4. Risk factors and opportunities
      5. Any red flags or concerns
      Provide a concise summary of the most important findings that would impact investment decision-making. Keep response under 500 words and focus on actionable insights.
      
      Document text:
      ${extractedText}`;
    
    const payload = {
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    };
    
    return await callGeminiAPI(payload, apiKey, headers);
    
  } catch (error) {
    console.error('Error in text analysis:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `Text analysis error: ${error.message}` })
    };
  }
}

// Legacy function to analyze PDF files (kept for backward compatibility)
async function analyzePDFFile(fileData, apiKey, headers) {
  try {
    console.log('API key found, preparing PDF analysis request...');
    
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
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    };
    
    return await callGeminiAPI(payload, apiKey, headers);
    
  } catch (error) {
    console.error('Error in PDF analysis:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `PDF analysis error: ${error.message}` })
    };
  }
}

// Shared function to call Gemini API
async function callGeminiAPI(payload, apiKey, headers) {
  try {
    // Get the secret API key from the environment variables
    console.log('Environment check:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- GEMINI_API_KEY exists:', !!apiKey);
    console.log('- GEMINI_API_KEY type:', typeof apiKey);
    console.log('- GEMINI_API_KEY length:', apiKey ? apiKey.length : 'N/A');

    if (!apiKey) {
      console.error("GEMINI_API_KEY is not configured on the server.");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: "API key is not configured on the server. Please set the GEMINI_API_KEY environment variable in your Netlify site settings."
        })
      };
    }
    
    // Log API key status (without exposing the actual key)
    console.log('API key length:', apiKey.length);
    console.log('API key starts with:', apiKey.substring(0, 10) + '...');
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    console.log("Making request to Google AI API...");
    console.log("Request payload size:", JSON.stringify(payload).length);
    console.log("API URL (without key):", apiUrl.split('?key=')[0]);
    console.log("Using model: gemini-2.0-flash");
    
    // Validate payload structure
    console.log("Payload structure check:");
    console.log("- contents exists:", !!payload.contents);
    console.log("- contents length:", payload.contents?.length);
    console.log("- first content has parts:", !!payload.contents?.[0]?.parts);
    console.log("- parts length:", payload.contents?.[0]?.parts?.length);
    
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Real-Estate-Screening-Tool/1.0'
      },
      body: JSON.stringify(payload)
    });

    console.log("API Response status:", apiResponse.status);
    console.log("API Response headers:", JSON.stringify([...apiResponse.headers.entries()]));

    if (!apiResponse.ok) {
      let errorBody;
      try {
        errorBody = await apiResponse.text();
        console.error("Google AI API Error Response:", errorBody);
        
        // Try to parse the error as JSON for more details
        try {
          const errorJson = JSON.parse(errorBody);
          console.error("Parsed error details:", JSON.stringify(errorJson, null, 2));
        } catch (jsonParseError) {
          console.error("Error response is not valid JSON");
        }
      } catch (textError) {
        console.error("Failed to read error response:", textError);
        errorBody = `HTTP ${apiResponse.status} - Unable to read error details`;
      }
      
      return {
        statusCode: apiResponse.status,
        headers,
        body: JSON.stringify({ 
          error: `Google AI API Error (${apiResponse.status}): ${errorBody.substring(0, 1000)}`,
          statusCode: apiResponse.status
        })
      };
    }

    // Read the response text once
    let responseText;
    try {
      responseText = await apiResponse.text();
      console.log("Raw API response length:", responseText.length);
      console.log("Raw API response preview:", responseText.substring(0, 200));
    } catch (readError) {
      console.error("Failed to read API response:", readError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Failed to read response from Google AI API" })
      };
    }

    // Parse the JSON response
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (jsonError) {
      console.error("Failed to parse API response as JSON:", jsonError);
      console.error("Response text that failed to parse:", responseText.substring(0, 500));
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: `Invalid JSON response from Google AI API. Response: ${responseText.substring(0, 500)}` })
      };
    }

    // Extract analysis text with better error handling
    let analysisText;
    try {
      if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts[0]) {
        analysisText = result.candidates[0].content.parts[0].text;
      } else {
        console.error("Unexpected API response structure:", JSON.stringify(result, null, 2));
        analysisText = "The document was processed but the analysis could not be extracted from the API response.";
      }
    } catch (extractError) {
      console.error("Error extracting analysis text:", extractError);
      analysisText = "Error occurred while processing the document analysis.";
    }

    if (!analysisText || analysisText.trim() === '') {
      analysisText = "The document was processed but no analysis text was generated.";
    }

    console.log("Analysis completed successfully, length:", analysisText.length);

    const finalResponse = { analysis: analysisText };
    console.log("Sending final response:", JSON.stringify(finalResponse).substring(0, 200));
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(finalResponse)
    };

  } catch (error) {
    console.error('Error in Gemini API call:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `API call error: ${error.message}` })
    };
  }
}