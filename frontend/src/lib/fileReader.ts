// File text extraction utilities for PRD uploads
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker - use worker file from public folder
// This worker file is served by Vite from /public/pdf.worker.mjs
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

/**
 * Extract text content from an uploaded file
 * Supports: .txt, .md, .markdown, .pdf
 *
 * @param file - The uploaded File object
 * @returns Promise<string> - The extracted text content
 * @throws Error if file type is unsupported or reading fails
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();
  const fileType = file.type;

  // Handle text-based files directly
  if (
    fileType === "text/plain" ||
    fileType === "text/markdown" ||
    fileName.endsWith(".txt") ||
    fileName.endsWith(".md") ||
    fileName.endsWith(".markdown")
  ) {
    return await readTextFile(file);
  }

  // Handle PDF files (basic text extraction)
  if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
    return await readPDFFile(file);
  }

  // Unsupported file type
  throw new Error(
    `Unsupported file type: ${fileType || "unknown"}. ` +
      `Please upload a .txt, .md, or .pdf file.`
  );
}

/**
 * Read a text file using FileReader API
 */
async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        resolve(text);
      } else {
        reject(new Error("Failed to read file as text"));
      }
    };

    reader.onerror = () => {
      reject(new Error("Error reading file"));
    };

    reader.readAsText(file);
  });
}

/**
 * Read a PDF file and extract text using pdf.js
 */
async function readPDFFile(file: File): Promise<string> {
  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const textPages: string[] = [];

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Combine all text items from the page
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');

      textPages.push(pageText);
    }

    // Combine all pages with double newline separator
    const fullText = textPages.join('\n\n');

    if (!fullText || fullText.trim().length === 0) {
      throw new Error(
        "PDF appears to be empty or contains only images. " +
        "Please try a PDF with text content, or convert it to .txt/.md format."
      );
    }

    return fullText;
  } catch (error) {
    if (error instanceof Error) {
      // If it's already our custom error, re-throw it
      if (error.message.includes("PDF appears to be empty")) {
        throw error;
      }
      // Otherwise wrap it with helpful context
      throw new Error(
        `Failed to extract text from PDF: ${error.message}. ` +
        "Please try converting it to a .txt or .md file first."
      );
    }
    throw new Error(
      "Failed to extract text from PDF. Please try a .txt or .md file instead."
    );
  }
}

/**
 * Validate that extracted text is not empty and contains meaningful content
 */
export function validatePRDText(text: string): { valid: boolean; error?: string } {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return {
      valid: false,
      error: "The file appears to be empty. Please upload a file with content.",
    };
  }

  if (trimmed.length < 50) {
    return {
      valid: false,
      error: "The PRD content is too short (minimum 50 characters). Please upload a complete PRD document.",
    };
  }

  // Check if it looks like a PRD (has some common keywords)
  const lowerText = trimmed.toLowerCase();
  const hasPRDKeywords =
    lowerText.includes("problem") ||
    lowerText.includes("solution") ||
    lowerText.includes("requirement") ||
    lowerText.includes("feature") ||
    lowerText.includes("user");

  if (!hasPRDKeywords) {
    return {
      valid: true, // Still allow it, but could warn
      error: undefined,
    };
  }

  return { valid: true };
}
