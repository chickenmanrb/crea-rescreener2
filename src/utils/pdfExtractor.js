/**
 * PDF Text Extraction Utility
 * Extracts text from PDF files to reduce payload size for API calls
 */

import pdfParse from 'pdf-parse';

/**
 * Extract text content from a PDF file
 * @param {File} file - The PDF file to extract text from
 * @returns {Promise<string>} - Extracted text content
 */
export async function extractTextFromPDF(file) {
  try {
    // Convert file to array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Parse PDF and extract text
    const data = await pdfParse(arrayBuffer);
    
    // Return the extracted text, trimmed and cleaned
    return data.text.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Truncate text to fit within API limits while preserving important content
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length in characters (default: 30000)
 * @returns {string} - Truncated text
 */
export function truncateText(text, maxLength = 30000) {
  if (text.length <= maxLength) {
    return text;
  }
  
  // Try to truncate at a sentence boundary near the limit
  const truncated = text.substring(0, maxLength);
  const lastSentence = truncated.lastIndexOf('.');
  
  if (lastSentence > maxLength * 0.8) {
    return truncated.substring(0, lastSentence + 1) + '\n\n[Document truncated for analysis]';
  }
  
  return truncated + '\n\n[Document truncated for analysis]';
}