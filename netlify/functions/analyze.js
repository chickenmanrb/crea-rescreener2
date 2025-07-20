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
      console.log('No GEMINI_API_KEY found, returning demo analysis');
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

    console.log('Initializing Gemini AI...');
    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Create analysis prompt
    let prompt = `Analyze this real estate investment opportunity based on the following parameters:

Asking Price: $${inputs.askingPrice || 'Not provided'}
Target Hold Period: ${inputs.targetHold || 'Not provided'} years
Target IRR: ${inputs.targetIRR || 'Not provided'}%
Target Equity Multiple: ${inputs.targetEM || 'Not provided'}x
Leverage: ${inputs.leverage || 'Not provided'}%
Interest Rate: ${inputs.interestRate || 'Not provided'}%
Exit Cap Rate: ${inputs.exitCap || 'Not provided'}%
Investment Strategy: ${inputs.strategy || 'Not provided'}

${fileName ? `Document Name: ${fileName}` : 'No document provided'}

Please provide a comprehensive real estate investment analysis including:
1. Property overview and key characteristics
2. Financial highlights and performance metrics
3. Market analysis and positioning
4. Investment thesis and value creation opportunities
5. Key risks and mitigation strategies
6. Overall recommendation

Format the response in markdown with clear sections and bullet points.`;

    console.log('Generating content with Gemini...');
    let result;
    
    if (fileData && fileName) {
      console.log('Processing PDF with multimodal input...');
      // Send PDF data to Gemini for analysis
      result = await model.generateContent([
        {
          text: prompt + '\n\nPlease analyze the uploaded PDF document along with the investment parameters provided above.'
        },
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: fileData
          }
        }
      ]);
    } else {
      console.log('Processing text-only input...');
      // Standard text-only analysis
      result = await model.generateContent(prompt);
    }
    
    const analysis = result.response.text();
    console.log('Analysis generated successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ analysis })
    };

  } catch (error) {
    console.error('Function error:', error);
    console.error('Error stack:', error.stack);
    
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