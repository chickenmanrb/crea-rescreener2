import React, { useState } from 'react';
import { Calculator, TrendingUp, AlertTriangle, CheckCircle, XCircle, ArrowLeft, Loader2, UploadCloud, FileText, Trash2 } from 'lucide-react';
import { convertPDFToBase64 } from './utils/pdfExtractor';

// Component for the custom modal
const Modal = ({ message, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
        <AlertTriangle className="h-6 w-6 text-red-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
      <p className="text-sm text-gray-600 mb-6">{message}</p>
      <button
        onClick={onClose}
        className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Close
      </button>
    </div>
  </div>
);

const REScreeningTool = () => {
  const [currentStep, setCurrentStep] = useState('input');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inputs, setInputs] = useState({
    askingPrice: '',
    targetHold: '',
    targetIRR: '',
    targetEM: '',
    leverage: '',
    interestRate: '',
    exitCap: '',
    acquisitionFee: '',
    closingCosts: '',
    legalCosts: '',
    debtOrigination: '',
    strategy: '',
    marketFocus: '',
    uploadedFile: null
  });
  const [analysis, setAnalysis] = useState(null);

  const strategies = ['Core', 'Core-plus', 'Value-add', 'Opportunistic'];

  const handleInputChange = (field, value) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const calculateReturns = () => {
    const price = parseFloat(inputs.askingPrice) || 0;
    const hold = parseFloat(inputs.targetHold) || 5;
    const leverage = parseFloat(inputs.leverage) || 0;
    const rate = parseFloat(inputs.interestRate) || 0;
    const exitCap = parseFloat(inputs.exitCap) || 5;

    if (price === 0) return { irr: '0.0', em: '0.0', exitValue: '0', equity: '0', currentNOI: '0' };
    
    const equity = price * (1 - leverage / 100);
    const debt = price * (leverage / 100);
    const currentNOI = price * 0.05; // Simplified assumption
    const futureNOI = currentNOI * Math.pow(1.03, hold);
    const exitValue = futureNOI / (exitCap / 100);
    
    const annualCashFlow = currentNOI - (debt * rate / 100);
    const totalCashFlows = annualCashFlow * hold;
    const exitProceeds = exitValue - debt;
    
    const totalReturn = (totalCashFlows + exitProceeds) / equity;
    const irr = equity > 0 ? (Math.pow(totalReturn, 1/hold) - 1) * 100 : 0;

    return {
      irr: irr.toFixed(1),
      em: equity > 0 ? totalReturn.toFixed(1) : '0.0',
      exitValue: exitValue.toFixed(0),
      equity: equity.toFixed(0),
      currentNOI: currentNOI.toFixed(0)
    };
  };

  const generatePDFAnalysis = (fileName) => {
    // Generate demo analysis based on uploaded file
    if (fileName) {
      return `**Document Analysis for ${fileName}**

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

*Note: This is a demo analysis for educational purposes.*`;
    } else {
      return "No document was uploaded for analysis.";
    }
  };

  const performAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    const pdfAnalysis = generatePDFAnalysis(inputs.uploadedFile?.name);
    const returns = calculateReturns();
    const targetIRR = parseFloat(inputs.targetIRR) || 15;
    const targetEM = parseFloat(inputs.targetEM) || 1.8;
    
    const irrScore = Math.min(100, (parseFloat(returns.irr) / targetIRR) * 100);
    const emScore = Math.min(100, (parseFloat(returns.em) / targetEM) * 100);
    const returnFeasibility = Math.round((irrScore + emScore) / 2);
    
    let recommendation = 'Pass';
    let mandateFit = 'Weak';
    
    if (returnFeasibility > 80) {
      recommendation = 'Advance';
      mandateFit = 'Strong';
    } else if (returnFeasibility > 60) {
      recommendation = 'Monitor';
      mandateFit = 'Medium';
    }

    setAnalysis({
      returns,
      returnFeasibility,
      mandateFit,
      recommendation,
      targetIRR,
      targetEM,
      pdfAnalysis
    });

    setCurrentStep('results');
    setIsLoading(false);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    const MAX_FILE_SIZE_MB = 10; // Reasonable limit for PDF analysis

    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError("Please upload a PDF file only.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    try {
      // Convert PDF to base64 for demo purposes
      const fileData = await convertPDFToBase64(file);
      
      setInputs(prev => ({
        ...prev,
        uploadedFile: { 
          name: file.name, 
          fileData: fileData, 
          originalSize: file.size,
        }
      }));
    } catch (err) {
      setError(`Error processing PDF: ${err.message}`);
    }
  };

  const removeFile = () => {
    setInputs(prev => ({ ...prev, uploadedFile: null }));
    document.getElementById('pdf-upload').value = '';
  };

  const isFormComplete = () => {
    const requiredFields = ['askingPrice', 'targetHold', 'targetIRR', 'targetEM', 'leverage', 'interestRate', 'exitCap'];
    return requiredFields.every(field => inputs[field] && inputs[field].toString().trim() !== '');
  };

  const fillDefaultValues = () => {
    const defaults = {
      askingPrice: '50000000',
      targetHold: '5',
      targetIRR: '15.0',
      targetEM: '1.8',
      leverage: '70',
      interestRate: '6.5',
      exitCap: '5.0',
      strategy: 'Value-add',
      marketFocus: ''
    };
    
    setInputs(prev => {
      const updated = { ...prev };
      Object.keys(defaults).forEach(key => {
        if (!updated[key] || updated[key].toString().trim() === '') {
          updated[key] = defaults[key];
        }
      });
      return updated;
    });
  };

  const canProceedWithPDFOnly = () => {
    return inputs.uploadedFile && !isFormComplete();
  };

  const handleAnalysisClick = () => {
    if (canProceedWithPDFOnly()) {
      fillDefaultValues();
      // Small delay to ensure state updates before analysis
      setTimeout(() => {
        performAnalysis();
      }, 100);
    } else {
      performAnalysis();
    }
  };

  const CRELogo = ({ className = "h-12 w-12" }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 118.56 156.66">
      <defs>
        <style>{`.cls-1,.cls-2{fill:none;}.cls-2{clip-rule:evenodd;}.cls-3{clip-path:url(#clip-path);}.cls-4{fill:#0073ae;}.cls-11,.cls-15,.cls-17,.cls-4,.cls-6,.cls-9{fill-rule:evenodd;}.cls-5{clip-path:url(#clip-path-2);}.cls-6{fill:#006ca4;}.cls-7{clip-path:url(#clip-path-3);}.cls-8{clip-path:url(#clip-path-4);}.cls-9{fill:#0fb7e1;}.cls-10{clip-path:url(#clip-path-5);}.cls-11{fill:#00a3d0;}.cls-12{clip-path:url(#clip-path-6);}.cls-13{clip-path:url(#clip-path-7);}.cls-14{clip-path:url(#clip-path-8);}.cls-15{fill:#fd0;}.cls-16{clip-path:url(#clip-path-9);}.cls-17{fill:#ffcb21;}.cls-18{clip-path:url(#clip-path-10);}.cls-19{clip-path:url(#clip-path-11);}`}</style>
        <clipPath id="clip-path" transform="translate(-6.06 14.35)"><rect className="cls-1" width="130.97" height="106.13"/></clipPath>
        <clipPath id="clip-path-2" transform="translate(-6.06 14.35)"><path className="cls-2" d="M82.26,79.09,41.51,110.77c-.5-.15-1-.3-1.51-.47l0-60.8L82.26,79.09Z"/></clipPath>
        <clipPath id="clip-path-3" transform="translate(-6.06 14.35)"><path className="cls-2" d="M116.89,85.91l-28.35,22.2c-.6.26-1.2.5-1.8.74l-.07-51.28,34.39,24.06c-1,1.67-3,2.71-4.17,4.28Z"/></clipPath>
        <clipPath id="clip-path-4" transform="translate(-6.06 14.35)"><path className="cls-2" d="M34.89,83.65,17,97.67A70.19,70.19,0,0,1,6.14,86.39L6.07,63.48,34.89,83.65Z"/></clipPath>
        <clipPath id="clip-path-5" transform="translate(-6.06 14.35)"><polygon className="cls-2" points="39.98 49.5 82.02 17.1 82.26 79.08 39.98 49.5 39.98 49.5"/></clipPath>
        <clipPath id="clip-path-6" transform="translate(-6.06 14.35)"><path className="cls-2" d="M86.67,57.57l17-13.62,17.7-13.25s.86,50.59.35,51.41l-17.57-12.3L86.67,57.57Z"/></clipPath>
        <clipPath id="clip-path-7" transform="translate(-6.06 14.35)"><polygon className="cls-2" points="6.07 63.48 20.05 52.29 34.86 41.49 34.89 83.65 6.07 63.48 6.07 63.48"/></clipPath>
        <clipPath id="clip-path-8" transform="translate(-6.06 14.35)"><path className="cls-2" d="M41.51,110.77,82.26,79.09l0,31.36a69.94,69.94,0,0,1-40.71.32Z"/></clipPath>
        <clipPath id="clip-path-9" transform="translate(-6.06 14.35)"><polygon className="cls-2" points="82.02 17.1 61.65 5.91 40.17 18.54 39.97 49.45 82.02 17.1 82.02 17.1"/></clipPath>
        <clipPath id="clip-path-10" transform="translate(-6.06 14.35)"><polygon className="cls-2" points="121.39 30.7 104.65 21.4 86.83 31.88 86.66 57.53 121.39 30.7 121.39 30.7"/></clipPath>
        <clipPath id="clip-path-11" transform="translate(-6.06 14.35)"><polygon className="cls-2" points="34.98 41.4 20.84 33.76 6.2 42.37 6.06 63.45 34.98 41.4 34.98 41.4"/></clipPath>
      </defs>
      <g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><g className="cls-3"><polygon className="cls-4" points="76.2 93.44 33.94 126.3 33.92 63.85 76.2 93.44 76.2 93.44"/><g className="cls-5"><polygon className="cls-6" points="55.88 75.06 79.67 75.06 79.67 115.92 55.88 115.92 55.88 75.06 55.88 75.06"/></g><polygon className="cls-4" points="115.68 96.46 80.68 123.87 80.61 71.92 115.68 96.46 115.68 96.46"/><g className="cls-7"><polygon className="cls-6" points="98.83 81.22 118.56 81.22 118.56 115.11 98.83 115.11 98.83 81.22 98.83 81.22"/></g><polygon className="cls-4" points="28.83 98 0.13 120.48 0.01 77.83 28.83 98 28.83 98"/><g className="cls-8"><polygon className="cls-6" points="14.98 85.47 31.2 85.47 31.2 113.33 14.98 113.33 14.98 85.47 14.98 85.47"/></g><polygon className="cls-9" points="33.92 63.85 75.96 31.46 76.2 93.44 33.92 63.85 33.92 63.85"/><g className="cls-10"><polygon className="cls-11" points="78.19 26.61 55.81 26.61 55.81 94.33 78.19 94.33 78.19 26.61 78.19 26.61"/></g><polygon className="cls-9" points="80.61 71.92 97.63 58.3 115.33 45.05 115.68 96.46 98.11 84.16 80.61 71.92 80.61 71.92"/><g className="cls-12"><polygon className="cls-11" points="117.33 41.02 99.21 41.02 99.21 97.2 117.33 97.2 117.33 41.02 117.33 41.02"/></g><polygon className="cls-9" points="0.01 77.83 13.99 66.64 28.8 55.84 28.83 98 0.01 77.83 0.01 77.83"/><g className="cls-13"><polygon className="cls-11" points="30.29 52.43 14.83 52.43 14.83 98.61 30.29 98.61 30.29 52.43 30.29 52.43"/></g><polygon className="cls-9" points="33.94 126.3 76.2 93.44 76.11 154.14 56.36 140.95 33.94 126.3 33.94 126.3"/><g className="cls-14"><polygon className="cls-11" points="79.54 88.94 55.77 88.94 55.77 156.66 79.54 156.66 79.54 88.94 79.54 88.94"/></g><polygon className="cls-9" points="80.68 123.87 115.68 96.46 116.24 122.37 116.8 148.17 80.68 123.87 80.68 123.87"/><polygon className="cls-11" points="115.68 95.4 99.11 109.44 99.11 148.91 116.8 148.91 115.68 95.4 115.68 95.4"/><polygon className="cls-9" points="0.13 120.48 14.91 109.14 28.84 98 28.8 140.48 15.3 130.39 0.13 120.48 0.13 120.48"/><polygon className="cls-11" points="28.82 98 14.74 109.14 14.74 141.11 28.82 141.11 28.82 98 28.82 98"/><polygon className="cls-15" points="75.96 31.46 55.59 20.26 34.11 32.89 33.91 63.81 75.96 31.46 75.96 31.46"/><g className="cls-16"><polygon className="cls-17" points="78.19 0 55.52 0 55.52 67.72 78.19 67.72 78.19 0 78.19 0"/></g><polygon className="cls-15" points="115.33 45.05 98.58 35.76 80.77 46.23 80.6 71.88 115.33 45.05 115.33 45.05"/><g className="cls-18"><polygon className="cls-17" points="117.92 18.95 99.11 18.95 99.11 75.13 117.92 75.13 117.92 18.95 117.92 18.95"/></g><polygon className="cls-15" points="28.92 55.75 14.78 48.11 0.14 56.72 0 77.8 28.92 55.75 28.92 55.75"/><g className="cls-19"><polygon className="cls-17" points="30.19 34.29 14.73 34.29 14.73 80.47 30.19 80.47 30.19 34.29 30.19 34.29"/></g></g></g></g>
    </svg>
  );

  if (currentStep === 'input') {
    return (
      <>
        {error && <Modal message={error} onClose={() => setError(null)} />}
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 font-sans">
          <div className="max-w-6xl mx-auto p-4 sm:p-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 mb-4">
              <div className="flex items-center gap-4 mb-6">
                <CRELogo className="h-16 w-16" />
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Real Estate Investment Screening Tool</h1>
                  <p className="text-base sm:text-lg font-medium text-blue-600 mt-1">by CRE Analyst</p>
                </div>
              </div>
              <div className="border-l-4 border-blue-500 pl-4">
                <p className="text-gray-700 text-base sm:text-lg leading-relaxed">Multidisciplinary investment team analysis for potential acquisitions</p>
                <p className="text-blue-600 mt-2">For more info, visit <a href="https://creanalyst.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-800 font-medium">creanalyst.com</a></p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-6" style={{backgroundColor: '#006BA3'}}>
                <h2 className="text-2xl font-bold text-white">Deal Parameters</h2>
                <p className="text-blue-100 mt-1">Enter the key investment metrics for analysis</p>
              </div>
              
              <div className="p-6 sm:p-8">
                <div className="grid lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-100">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><UploadCloud className="h-5 w-5 text-purple-600"/>Property Documentation</h3>
                      <div className="space-y-4">
                        <div>
                          <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" id="pdf-upload"/>
                          <label htmlFor="pdf-upload" className="w-full text-white font-bold py-3 px-6 rounded-lg cursor-pointer transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 hover:opacity-90" style={{backgroundColor: '#09B7E1'}}>
                            <UploadCloud className="w-5 h-5"/> Upload OM
                          </label>
                          {inputs.uploadedFile && (
                            <div className="mt-3 flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <FileText className="w-5 h-5 text-green-600 flex-shrink-0"/>
                                <div className="text-left overflow-hidden">
                                  <div className="text-sm font-medium text-gray-900 truncate">{inputs.uploadedFile.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {(inputs.uploadedFile.originalSize / 1024 / 1024).toFixed(2)} MB • Ready for analysis
                                  </div>
                                </div>
                              </div>
                              <button onClick={removeFile} className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded-full transition-colors flex-shrink-0" title="Remove file">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-2">Upload offering memorandum for AI analysis (optional).</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-100">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-blue-600"/>Financial Metrics</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Asking Price ($)</label>
                          <input type="number" value={inputs.askingPrice} onChange={(e) => handleInputChange('askingPrice', e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="e.g., 50000000"/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Target Hold (yrs)</label>
                            <input type="number" value={inputs.targetHold} onChange={(e) => handleInputChange('targetHold', e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="5"/>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Exit Cap Rate (%)</label>
                            <input type="number" step="0.1" value={inputs.exitCap} onChange={(e) => handleInputChange('exitCap', e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="5.0"/>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
                       <h3 className="text-lg font-bold text-gray-900 mb-4">Targets & Strategy</h3>
                       <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Target IRR (%)</label>
                            <input type="number" step="0.1" value={inputs.targetIRR} onChange={(e) => handleInputChange('targetIRR', e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="15.0"/>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Target EM (x)</label>
                            <input type="number" step="0.1" value={inputs.targetEM} onChange={(e) => handleInputChange('targetEM', e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="1.8"/>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Leverage (% LTV)</label>
                            <input type="number" value={inputs.leverage} onChange={(e) => handleInputChange('leverage', e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="70"/>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Interest Rate (%)</label>
                            <input type="number" step="0.1" value={inputs.interestRate} onChange={(e) => handleInputChange('interestRate', e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="6.5"/>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Investment Strategy</label>
                          <select value={inputs.strategy} onChange={(e) => handleInputChange('strategy', e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
                            <option value="">Select strategy...</option>
                            {strategies.map(strategy => (<option key={strategy} value={strategy}>{strategy}</option>))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-10 text-center">
                  <button onClick={handleAnalysisClick} disabled={(!isFormComplete() && !inputs.uploadedFile) || isLoading} className={`px-12 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 flex items-center gap-3 mx-auto disabled:cursor-not-allowed disabled:scale-100 ${(isFormComplete() || inputs.uploadedFile) ? 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white' : 'bg-gray-300 text-gray-500'}`}>
                    {isLoading ? <><Loader2 className="h-6 w-6 animate-spin" />Analyzing...</> : <><Calculator className="h-6 w-6" />Screen Investment</>}
                  </button>
                  <div className="mt-4 text-center">
                    <p className="text-xs text-gray-500 italic bg-gray-50 border border-gray-200 rounded-lg p-3 inline-block max-w-md">
                      <strong>Disclaimer:</strong> For educational use only. Do not upload confidential materials. Use a sample or fictional deal to test this tool.
                    </p>
                  </div>
                  {!isFormComplete() && !inputs.uploadedFile && !isLoading && (
                    <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3 inline-block mt-4">
                      Please complete all required fields or upload a PDF to run the analysis.
                    </p>
                  )}
                  {canProceedWithPDFOnly() && !isLoading && (
                    <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3 inline-block mt-4">
                      PDF uploaded! Click "Screen Investment" to analyze with default values, or fill in custom parameters.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (currentStep === 'results' && analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 font-sans">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8">
            <button onClick={() => setCurrentStep('input')} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4 transition-colors font-medium">
              <ArrowLeft className="h-4 w-4" /> Back to Inputs
            </button>
            <div className="flex items-center gap-4 mb-4">
              <CRELogo className="h-12 w-12" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Investment Screening Summary</h1>
                <p className="text-lg font-medium text-blue-600">by CRE Analyst</p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-8">
             <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-lg">
               <h3 className="font-bold text-blue-100 mb-2">Return Feasibility</h3>
               <div className="text-5xl font-bold">{analysis.returnFeasibility}<span className="text-3xl opacity-70">/100</span></div>
               <div className="text-blue-100 text-sm mt-1">Investment Viability Score</div>
             </div>
             <div className={`p-6 rounded-2xl text-white shadow-lg ${analysis.mandateFit === 'Strong' ? 'bg-gradient-to-br from-green-500 to-green-600' : analysis.mandateFit === 'Medium' ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' : 'bg-gradient-to-br from-red-500 to-red-600'}`}>
               <h3 className="font-bold mb-2 opacity-90">Mandate Fit</h3>
               <div className="text-3xl font-bold">{analysis.mandateFit}</div>
               <div className="text-sm mt-1 opacity-90">Strategy Alignment</div>
             </div>
             <div className={`p-6 rounded-2xl text-white shadow-lg ${analysis.recommendation === 'Advance' ? 'bg-gradient-to-br from-green-500 to-green-600' : analysis.recommendation === 'Monitor' ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' : 'bg-gradient-to-br from-red-500 to-red-600'}`}>
               <h3 className="font-bold mb-2 opacity-90">Recommendation</h3>
               <div className="flex items-center gap-2">
                 {analysis.recommendation === 'Advance' && <CheckCircle className="h-7 w-7" />}
                 {analysis.recommendation === 'Monitor' && <AlertTriangle className="h-7 w-7" />}
                 {analysis.recommendation === 'Pass' && <XCircle className="h-7 w-7" />}
                 <span className="text-3xl font-bold">{analysis.recommendation}</span>
               </div>
             </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b border-gray-200 pb-3">Detailed Analysis</h2>
            <div className="grid lg:grid-cols-5 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-5 rounded-xl border border-blue-100">
                        <h4 className="font-bold text-gray-900 mb-4">Base-Case Returns</h4>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="text-center">
                                <div className="text-sm font-medium text-gray-600 mb-1">Levered IRR</div>
                                <div className="text-3xl font-bold text-blue-600">{analysis.returns.irr}%</div>
                                <div className="text-xs text-gray-500">Target: {analysis.targetIRR}%</div>
                            </div>
                            <div className="text-center">
                                <div className="text-sm font-medium text-gray-600 mb-1">Equity Multiple</div>
                                <div className="text-3xl font-bold text-cyan-600">{analysis.returns.em}x</div>
                                <div className="text-xs text-gray-500">Target: {analysis.targetEM}x</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="text-gray-700 text-base leading-relaxed">
                          Deal shows {analysis.returnFeasibility > 70 ? 'strong' : analysis.returnFeasibility > 50 ? 'moderate' : 'weak'} return potential
                          with base-case IRR of {analysis.returns.irr}% and EM of {analysis.returns.em}x.
                          {analysis.recommendation === 'Advance' && ' Recommend advancing to full underwriting given attractive risk-adjusted returns.'}
                          {analysis.recommendation === 'Monitor' && ' Recommend monitoring for price discovery while gathering additional market intelligence.'}
                          {analysis.recommendation === 'Pass' && ' Returns do not justify the risk profile. Consider passing unless price adjusts significantly.'}
                        </p>
                    </div>
                </div>
                <div className="lg:col-span-3">
                    <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 h-full">
                      <h4 className="font-bold text-cyan-800 mb-3 flex items-center gap-2"><FileText className="h-5 w-5" /> Document Analysis</h4>
                      <div className="text-sm text-cyan-900 whitespace-pre-line leading-relaxed prose prose-sm max-w-none">
                        {analysis.pdfAnalysis}
                      </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null; // Fallback
};

export default REScreeningTool;