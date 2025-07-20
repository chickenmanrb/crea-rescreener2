/**
 * PDF File Handling Utility
 * Handles PDF file conversion for server-side processing
 */

/**
 * Convert PDF file to base64 for server transmission
 * @param {File} file - The PDF file to convert
 * @returns {Promise<string>} - Base64 encoded file data
 */
export async function convertPDFToBase64(file) {
  try {
    // Convert file to array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Convert array buffer to base64
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    
    return btoa(binary);
  } catch (error) {
    console.error('Error converting PDF to base64:', error);
    throw new Error(`Failed to convert PDF: ${error.message}`);
  }
}