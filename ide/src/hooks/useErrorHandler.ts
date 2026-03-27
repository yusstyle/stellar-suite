/**
 * src/hooks/useErrorHandler.ts
 * ============================================================
 * Custom hook for handling and displaying translated errors
 * with user-friendly messages in the UI.
 * ============================================================
 */

import { toast } from "sonner";
import { ErrorTranslator, type TranslatedError } from "@/lib/errorTranslator";

export interface ErrorDisplayOptions {
  showDetails?: boolean;
  duration?: number;
  onError?: (error: TranslatedError) => void;
}

/**
 * Hook for handling and displaying errors
 */
export function useErrorHandler() {
  /**
   * Handles an error and displays it to the user
   */
  const handleError = (
    error: unknown,
    options: ErrorDisplayOptions & { operation?: string; contractId?: string; functionName?: string } = {}
  ): TranslatedError => {
    const { showDetails = false, duration = 6000, onError } = options;

    const translatedError = ErrorTranslator.translate(error, {
      operation: options.operation,
      contractId: options.contractId,
      functionName: options.functionName,
    });

    const display = ErrorTranslator.formatForDisplay(translatedError, showDetails);

    // Show toast based on severity
    if (translatedError.severity === "error") {
      toast.error(display.title, {
        description: display.description,
        duration,
      });
    } else if (translatedError.severity === "warning") {
      toast.warning(display.title, {
        description: display.description,
        duration,
      });
    } else {
      toast.info(display.title, {
        description: display.description,
        duration,
      });
    }

    // Call callback if provided
    if (onError) {
      onError(translatedError);
    }

    return translatedError;
  };

  /**
   * Displays a translated error in the terminal/output
   */
  const formatForTerminal = (error: unknown): string => {
    const translatedError = ErrorTranslator.translate(error);
    const { title, message } = translatedError;

    return `❌ ${title}\n   ${message}`;
  };

  /**
   * Formats error with suggestions for terminal display
   */
  const formatWithSuggestions = (error: unknown): string => {
    const translatedError = ErrorTranslator.translate(error);
    const display = ErrorTranslator.formatForDisplay(translatedError, false);

    return display.description;
  };

  /**
   * Gets the raw translated error without displaying it
   */
  const translate = (error: unknown, operation?: string): TranslatedError => {
    return ErrorTranslator.translate(error, { operation });
  };

  return {
    handleError,
    formatForTerminal,
    formatWithSuggestions,
    translate,
  };
}
