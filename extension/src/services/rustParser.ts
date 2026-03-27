import * as fs from 'fs';
import { ParsedRustFile, ParsedRustFunction, ParsedRustParameter, RustVisibility, SignatureCacheEntry } from '../types/rustParser';

export class RustParser {
    private cache: Map<string, SignatureCacheEntry> = new Map();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    /**
     * Parse a Rust source file and extract contract functions
     */
    async parseFile(filePath: string): Promise<ParsedRustFile> {
        // Check cache first
        const cacheKey = this.getCacheKey(filePath);
        const cached = this.cache.get(cacheKey);
        
        if (cached && this.isCacheValid(cached)) {
            return cached.parsed;
        }

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            
            const result: ParsedRustFile = {
                filePath,
                functions: [],
                errors: []
            };

            // Extract contract name
            result.contractName = this.extractContractName(content);

            // Parse functions
            const functions = this.extractFunctions(content, lines);
            result.functions = functions;

            // Cache the result
            const hash = this.hashContent(content);
            this.cache.set(cacheKey, {
                parsed: result,
                contentHash: hash,
                cachedAt: new Date().toISOString()
            });

            return result;
        } catch (error) {
            return {
                filePath,
                functions: [],
                errors: [`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`]
            };
        }
    }

    /**
     * Extract contract name from #[contract] attribute
     */
    private extractContractName(content: string): string | undefined {
        const contractMatch = content.match(/#\[contract\]\s*pub\s+struct\s+(\w+)/);
        return contractMatch ? contractMatch[1] : undefined;
    }

    /**
     * Extract function definitions from Rust source code
     */
    private extractFunctions(content: string, lines: string[]): ParsedRustFunction[] {
        const functions: ParsedRustFunction[] = [];
        let inContractImpl = false;

        // Find #[contractimpl] blocks
        const contractImplMatch = content.match(/#\[contractimpl\]/);
        if (contractImplMatch) {
            inContractImpl = true;
        }

        // Regular expression to match function definitions
        const functionRegex = /(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*([^{]+))?/g;
        const matches = [...content.matchAll(functionRegex)];

        matches.forEach((match, index) => {
            const fullMatch = match[0];
            const functionName = match[1];
            const paramString = match[2] || '';
            const returnParam = match[3];

            // Skip if not in contractimpl and not public
            if (!inContractImpl && !fullMatch.includes('pub')) {
                return;
            }

            // Find line number
            const beforeMatch = content.substring(0, match.index!);
            const lineNumber = beforeMatch.split('\n').length;

            // Parse parameters
            const parameters = this.parseParameters(paramString);

            // Determine visibility
            const visibility: RustVisibility = fullMatch.includes('pub') ? 'pub' : 'private';

            // Extract doc comments
            const docComments = this.extractDocComments(lines, lineNumber);

            functions.push({
                name: functionName,
                visibility,
                parameters,
                returnType: returnParam?.trim(),
                docComments,
                isContractImpl: inContractImpl,
                startLine: lineNumber,
                endLine: lineNumber + this.countFunctionLines(fullMatch)
            });
        });

        return functions;
    }

    /**
     * Parse function parameters from parameter string
     */
    private parseParameters(paramString: string): ParsedRustParameter[] {
        const parameters: ParsedRustParameter[] = [];
        
        if (!paramString.trim()) return parameters;

        // Split by commas, but handle nested types
        const params = this.splitParameters(paramString);

        params.forEach(param => {
            const trimmed = param.trim();
            if (!trimmed || trimmed === '&self' || trimmed === 'self' || trimmed === 'mut self') {
                return;
            }

            // Parse parameter name and type
            const paramMatch = trimmed.match(/(?:(?:mut|&|&mut)\s+)?(\w+):\s*(.+)/);
            if (paramMatch) {
                const name = paramMatch[1];
                const typeStr = paramMatch[2].trim();
                const isReference = trimmed.includes('&');
                const isMutable = trimmed.includes('mut');

                parameters.push({
                    name,
                    typeStr,
                    isReference,
                    isMutable
                });
            }
        });

        return parameters;
    }

    /**
     * Split parameters by comma, handling nested types
     */
    private splitParameters(paramString: string): string[] {
        const params: string[] = [];
        let current = '';
        let depth = 0;
        let inString = false;

        for (let i = 0; i < paramString.length; i++) {
            const char = paramString[i];
            
            if (char === '"' && (i === 0 || paramString[i-1] !== '\\')) {
                inString = !inString;
            }
            
            if (!inString) {
                if (char === '<' || char === '(' || char === '{') {
                    depth++;
                } else if (char === '>' || char === ')' || char === '}') {
                    depth--;
                } else if (char === ',' && depth === 0) {
                    params.push(current.trim());
                    current = '';
                    continue;
                }
            }
            
            current += char;
        }
        
        if (current.trim()) {
            params.push(current.trim());
        }
        
        return params;
    }

    /**
     * Extract doc comments for a function
     */
    private extractDocComments(lines: string[], functionLine: number): string[] {
        const docComments: string[] = [];
        
        // Look backwards from function line for doc comments
        for (let i = functionLine - 2; i >= 0; i--) {
            const line = lines[i].trim();
            
            if (line.startsWith('///')) {
                docComments.unshift(line.substring(3).trim());
            } else if (line.startsWith('//') || line === '' || line.startsWith('pub')) {
                break;
            }
        }
        
        return docComments;
    }

    /**
     * Count the number of lines in a function definition
     */
    private countFunctionLines(functionMatch: string): number {
        // Simple heuristic - count newlines in the match
        return (functionMatch.match(/\n/g) || []).length + 1;
    }

    /**
     * Generate cache key for file path
     */
    private getCacheKey(filePath: string): string {
        return filePath;
    }

    /**
     * Check if cache entry is still valid
     */
    private isCacheValid(entry: SignatureCacheEntry): boolean {
        const cachedTime = new Date(entry.cachedAt).getTime();
        const now = new Date().getTime();
        return (now - cachedTime) < this.CACHE_TTL;
    }

    /**
     * Hash content for cache validation
     */
    private hashContent(content: string): string {
        // Simple hash function - in production, use crypto
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    /**
     * Clear the parser cache
     */
    clearCache(): void {
        this.cache.clear();
    }
}
