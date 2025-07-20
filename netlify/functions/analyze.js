exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  console.log('Function called with method:', event.httpMethod);

  if (event.httpMethod === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    console.log('Method not allowed:', event.httpMethod);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('Parsing request body...');
    const requestBody = JSON.parse(event.body || '{}');
    const { fileName, fileData, inputs } = requestBody;
    
    console.log('Request parsed successfully');
    console.log('FileName:', fileName);
    console.log('Has fileData:', !!fileData);
    console.log('Inputs:', inputs);
    
    // Check if API key is configured
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('API Key configured:', !!apiKey);
    
    if (!apiKey) {
      console.log('No GEMINI_API_KEY found, returning demo analysis');
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

    console.log('Attempting to load Google AI...');
    
    // Try to load the Google AI library
    let GoogleGenerativeAI;
    try {
      const googleAI = require('@google/generative-ai');
      GoogleGenerativeAI = googleAI.GoogleGenerativeAI;
      console.log('Google AI loaded successfully');
    } catch (importError) {
      console.error('Failed to import Google AI:', importError);
      throw new Error('Google AI library not available');
    }

    // Initialize Gemini AI
    console.log('Initializing Gemini AI...');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Create analysis prompt
    const prompt = `Analyze this real estate investment opportunity based on the following parameters:

Asking Price: $${inputs?.askingPrice || 'Not provided'}
Target Hold Period: ${inputs?.targetHold || 'Not provided'} years
Target IRR: ${inputs?.targetIRR || 'Not provided'}%
Target Equity Multiple: ${inputs?.targetEM || 'Not provided'}x
Leverage: ${inputs?.leverage || 'Not provided'}%
Interest Rate: ${inputs?.interestRate || 'Not provided'}%
Exit Cap Rate: ${inputs?.exitCap || 'Not provided'}%
Investment Strategy: ${inputs?.strategy || 'Not provided'}

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
      try {
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
      } catch (pdfError) {
        console.error('PDF processing failed, falling back to text-only:', pdfError);
        result = await model.generateContent(prompt);
      }
    } else {
      console.log('Processing text-only input...');
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
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Return demo analysis on any error
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

*Note: Demo analysis shown due to function error. Error: ${error.message}*`
      })
    };
  }
};