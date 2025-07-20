const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { fileName, fileData, inputs } = JSON.parse(event.body);
    
    // Check if API key is configured
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Return demo analysis if no API key
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          analysis: `**Demo Analysis for ${fileName || 'uploaded document'}**

**Property Overview:**
- Multi-family residential property
- Located in prime urban submarket  
- 150 units across 3 buildings
- Built in 1985, recently renovated common areas

**Financial Highlights:**
- Current NOI: $2.1M annually
- Average rent: $1,850/month
- Occupancy rate: 94%
- Operating expense ratio: 42%

**Market Analysis:**
- Submarket rent growth: 4.2% annually
- Low vacancy rates (2.8% average)
- Strong employment fundamentals
- Limited new supply pipeline

**Investment Thesis:**
- Value-add opportunity through unit renovations
- Potential 15-20% rent increases post-renovation
- Strong cash flow profile with upside potential
- Defensive asset class in current market

**Key Risks:**
- Capital expenditure requirements
- Regulatory rent control considerations
- Interest rate sensitivity
- Market saturation risk

**Recommendation:**
Proceed with detailed due diligence. Property shows strong fundamentals with clear value-add path. Consider sensitivity analysis on renovation costs and timeline.

*Note: This is a demo analysis. Configure GEMINI_API_KEY environment variable for AI-powered analysis.*`
        })
      };
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Create analysis prompt
    let prompt = `Analyze this real estate investment opportunity based on the following parameters:

Asking Price: $${inputs.askingPrice}
Target Hold Period: ${inputs.targetHold} years
Target IRR: ${inputs.targetIRR}%
Target Equity Multiple: ${inputs.targetEM}x
Leverage: ${inputs.leverage}%
Interest Rate: ${inputs.interestRate}%
Exit Cap Rate: ${inputs.exitCap}%
Investment Strategy: ${inputs.strategy}

${fileName ? `Document Name: ${fileName}` : 'No document provided'}`;

    // If we have PDF data, process it with Gemini's multimodal capabilities
    if (fileData && fileName) {
      prompt += `\n\nUploaded Document: ${fileName}
I have uploaded a PDF document that contains details about this real estate investment opportunity. Please analyze the document content along with the investment parameters provided above.`;
    }

    prompt += `
Please provide a comprehensive real estate investment analysis including:
1. Property overview and key characteristics
2. Financial highlights and performance metrics
3. Market analysis and positioning
4. Investment thesis and value creation opportunities
5. Key risks and mitigation strategies
6. Overall recommendation

Format the response in markdown with clear sections and bullet points.

${fileData ? 'Base your analysis primarily on the uploaded PDF document content, supplemented by the investment parameters.' : 'Since no document was provided, base your analysis on the investment parameters and general market assumptions.'}`;

    let result;    
    if (fileData && fileName) {
      // Convert base64 to binary for Gemini
      const binaryData = Buffer.from(fileData, 'base64');
      
      result = await model.generateContent([
        {
          text: prompt
        },
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: fileData
          }
        }
      ]);
    } else {
      // Standard text-only analysis
      result = await model.generateContent(prompt);
    }
    
    const analysis = result.response.text();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ analysis })
    };

  } catch (error) {
    console.error('Function error:', error);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        analysis: `**Analysis Error - Using Demo Data**

**Property Overview:**
- Multi-family residential property
- Located in prime urban submarket  
- 150 units across 3 buildings
- Built in 1985, recently renovated common areas

**Financial Highlights:**
- Current NOI: $2.1M annually
- Average rent: $1,850/month
- Occupancy rate: 94%
- Operating expense ratio: 42%

**Market Analysis:**
- Submarket rent growth: 4.2% annually
- Low vacancy rates (2.8% average)
- Strong employment fundamentals
- Limited new supply pipeline

**Investment Thesis:**
- Value-add opportunity through unit renovations
- Potential 15-20% rent increases post-renovation
- Strong cash flow profile with upside potential
- Defensive asset class in current market

**Key Risks:**
- Capital expenditure requirements
- Regulatory rent control considerations
- Interest rate sensitivity
- Market saturation risk

**Recommendation:**
Proceed with detailed due diligence. Property shows strong fundamentals with clear value-add path.

*Note: Demo analysis shown due to API error. Error: ${error.message}*`
      })
    };
  }
};