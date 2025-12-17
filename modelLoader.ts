// Comprehensive GLB model loader with retry mechanism and error handling
// Provides safe fallback logic for GitHub-hosted assets with detailed logging

interface LoadModelOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

interface LoadModelResult {
  success: boolean;
  error?: string;
  statusCode?: number;
  responseText?: string;
  attemptsMade: number;
}

const DEFAULT_OPTIONS: Required<LoadModelOptions> = {
  maxRetries: 2,
  retryDelay: 1500,
  timeout: 15000,
};

/**
 * Validates model URL before attempting to load
 */
export const validateModelUrl = (url: string): boolean => {
  if (!url || url.trim() === '') {
    console.error('[Model Validation] URL is empty or null');
    return false;
  }

  if (!url.toLowerCase().endsWith('.glb')) {
    console.error('[Model Validation] URL does not end with .glb:', url);
    return false;
  }

  try {
    new URL(url);
    return true;
  } catch (e) {
    console.error('[Model Validation] Invalid URL format:', url, e);
    return false;
  }
};

/**
 * Delays execution for retry mechanism
 */
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Attempts to fetch model with timeout
 */
const fetchWithTimeout = async (
  url: string,
  timeout: number
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'cors',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

/**
 * Checks if error is transient (network-related) and should be retried
 */
const isTransientError = (error: any, statusCode?: number): boolean => {
  // Network errors (no response)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Timeout errors
  if (error.name === 'AbortError') {
    return true;
  }

  // Transient HTTP status codes
  if (statusCode) {
    return statusCode === 408 || // Request Timeout
           statusCode === 429 || // Too Many Requests
           statusCode === 500 || // Internal Server Error
           statusCode === 502 || // Bad Gateway
           statusCode === 503 || // Service Unavailable
           statusCode === 504;   // Gateway Timeout
  }

  return false;
};

/**
 * Validates model availability with comprehensive error handling and retry mechanism
 * @param modelUrl - URL of the GLB model to validate
 * @param options - Configuration options for retry behavior
 * @returns Promise with validation result including error details
 */
export const validateModelAvailability = async (
  modelUrl: string,
  options: LoadModelOptions = {}
): Promise<LoadModelResult> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  console.log('[Model Loader] Starting validation for:', modelUrl);
  console.log('[Model Loader] Options:', {
    maxRetries: opts.maxRetries,
    retryDelay: opts.retryDelay,
    timeout: opts.timeout,
  });

  // Pre-validation
  if (!validateModelUrl(modelUrl)) {
    return {
      success: false,
      error: 'Invalid model URL format',
      attemptsMade: 0,
    };
  }

  let lastError: any = null;
  let lastStatusCode: number | undefined;
  let lastResponseText: string | undefined;

  // Retry loop
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    const attemptNumber = attempt + 1;
    console.log(`[Model Loader] Attempt ${attemptNumber}/${opts.maxRetries + 1} for ${modelUrl}`);

    try {
      const response = await fetchWithTimeout(modelUrl, opts.timeout);
      lastStatusCode = response.status;

      // Success case
      if (response.ok) {
        console.log(`[Model Loader] ✅ SUCCESS - Status ${response.status} for ${modelUrl}`);
        return {
          success: true,
          statusCode: response.status,
          attemptsMade: attemptNumber,
        };
      }

      // HTTP error case
      let responseText = '';
      try {
        responseText = await response.text();
        lastResponseText = responseText.substring(0, 200); // Limit to 200 chars
      } catch (e) {
        lastResponseText = 'Unable to read response body';
      }

      console.error(`[Model Loader] ❌ HTTP Error ${response.status} ${response.statusText} for ${modelUrl}`);
      console.error(`[Model Loader] Response text:`, lastResponseText);

      // Check if error is transient and we should retry
      if (isTransientError(null, response.status) && attempt < opts.maxRetries) {
        console.warn(`[Model Loader] ⚠️ Transient error detected, retrying in ${opts.retryDelay}ms...`);
        await delay(opts.retryDelay);
        continue;
      }

      // Non-transient error or max retries reached
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      break;

    } catch (error) {
      lastError = error;
      
      // Log detailed error information
      if (error instanceof TypeError) {
        console.error(`[Model Loader] ❌ Network Error for ${modelUrl}:`, error.message);
      } else if (error instanceof Error && error.name === 'AbortError') {
        console.error(`[Model Loader] ❌ Timeout Error for ${modelUrl} (${opts.timeout}ms)`);
      } else {
        console.error(`[Model Loader] ❌ Unknown Error for ${modelUrl}:`, error);
      }

      // Check if error is transient and we should retry
      if (isTransientError(error) && attempt < opts.maxRetries) {
        console.warn(`[Model Loader] ⚠️ Transient error detected, retrying in ${opts.retryDelay}ms...`);
        await delay(opts.retryDelay);
        continue;
      }

      // Non-transient error or max retries reached
      break;
    }
  }

  // All attempts failed
  const errorMessage = lastError instanceof Error 
    ? lastError.message 
    : 'Unknown error';

  console.error(`[Model Loader] ❌ FAILED after ${opts.maxRetries + 1} attempts for ${modelUrl}`);
  console.error(`[Model Loader] Final error:`, errorMessage);
  if (lastStatusCode) {
    console.error(`[Model Loader] Final status code:`, lastStatusCode);
  }
  if (lastResponseText) {
    console.error(`[Model Loader] Final response text:`, lastResponseText);
  }

  return {
    success: false,
    error: errorMessage,
    statusCode: lastStatusCode,
    responseText: lastResponseText,
    attemptsMade: opts.maxRetries + 1,
  };
};

/**
 * Gets a human-readable error message in Russian
 */
export const getErrorMessage = (result: LoadModelResult): string => {
  if (result.success) {
    return '';
  }

  if (result.statusCode === 403) {
    return 'Доступ запрещён (403)';
  }

  if (result.statusCode === 404) {
    return 'Модель не найдена (404)';
  }

  if (result.statusCode && result.statusCode >= 500) {
    return `Ошибка сервера (${result.statusCode})`;
  }

  if (result.error?.includes('fetch') || result.error?.includes('Network')) {
    return 'Ошибка сети';
  }

  if (result.error?.includes('Timeout') || result.error?.includes('AbortError')) {
    return 'Превышено время ожидания';
  }

  return result.error || 'Неизвестная ошибка';
};
