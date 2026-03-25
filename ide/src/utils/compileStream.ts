export interface CompileResponsePayload {
  stdout?: string;
  stderr?: string;
  output?: string;
  logs?: string;
  success?: boolean;
  error?: string;
  message?: string;
}

interface StreamProcessorOptions {
  onTerminalData: (chunk: string) => void;
}

export interface StreamProcessor {
  push: (chunk: string) => void;
  flush: () => void;
  getOutput: () => string;
}

const DECODER = new TextDecoder();

export function formatTerminalChunk(chunk: string): string {
  return chunk.replace(/\r?\n/g, "\r\n");
}

export function createStreamProcessor({
  onTerminalData,
}: StreamProcessorOptions): StreamProcessor {
  let output = "";

  return {
    push(chunk) {
      if (!chunk) {
        return;
      }

      output += chunk;
      onTerminalData(formatTerminalChunk(chunk));
    },
    flush() {
      onTerminalData("");
    },
    getOutput() {
      return output;
    },
  };
}

function coercePayloadToOutput(payload: CompileResponsePayload): string {
  const combined = [payload.stdout, payload.stderr, payload.output, payload.logs]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join("");

  if (combined.length > 0) {
    return combined;
  }

  if (payload.error) {
    return payload.error;
  }

  if (payload.message) {
    return payload.message;
  }

  return JSON.stringify(payload, null, 2);
}

export async function readCompileResponse(
  response: Response,
  processor: StreamProcessor
): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const rawText = await response.text();

    let output = rawText;
    try {
      output = coercePayloadToOutput(
        JSON.parse(rawText) as CompileResponsePayload
      );
    } catch {
      output = rawText;
    }

    processor.push(output);
    processor.flush();
    return processor.getOutput();
  }

  if (response.body) {
    const reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      processor.push(DECODER.decode(value, { stream: true }));
    }

    processor.push(DECODER.decode());
    processor.flush();
    return processor.getOutput();
  }

  const text = await response.text();
  processor.push(text);
  processor.flush();
  return processor.getOutput();
}
