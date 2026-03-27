import * as fs from 'fs';
import * as path from 'path';
import { 
    SecurityAnalysisResult, 
    ReentrancyVulnerability, 
    ExternalCall, 
    StateAccessPattern,
    RiskLevel, 
    ReentrancyType,
    SecurityAnalysisConfig 
} from '../types/securityAnalysis';
import { ParsedRustFile, ParsedRustFunction } from '../types/rustParser';

export class SecurityAnalyzer {
    private config: SecurityAnalysisConfig;
    private readonly ANALYSIS_VERSION = '1.0.0';

    constructor(config: Partial<SecurityAnalysisConfig> = {}) {
        this.config = {
            enableReentrancyDetection: true,
            minimumRiskLevel: 'low',
            includeLowRisk: true,
            customPatterns: [],
            ...config
        };
    }

    /**
     * Perform comprehensive security analysis on a contract
     */
    async analyzeContract(contractPath: string, parsedFile: ParsedRustFile): Promise<SecurityAnalysisResult> {
        const contractName = parsedFile.contractName || path.basename(contractPath);
        
        // Analyze each function for reentrancy vulnerabilities
        const vulnerabilities: ReentrancyVulnerability[] = [];
        const externalCalls: ExternalCall[] = [];
        const stateAccessPatterns: StateAccessPattern[] = [];

        for (const func of parsedFile.functions) {
            if (!func.isContractImpl) continue;

            // Analyze function for reentrancy
            const funcVulnerabilities = await this.analyzeFunctionForReentrancy(func, contractPath);
            vulnerabilities.push(...funcVulnerabilities);

            // Extract external calls
            const funcExternalCalls = this.extractExternalCalls(func);
            externalCalls.push(...funcExternalCalls);

            // Analyze state access patterns
            const statePattern = this.analyzeStateAccessPattern(func, funcExternalCalls);
            stateAccessPatterns.push(statePattern);
        }

        // Calculate overall risk assessment
        const overallRiskLevel = this.calculateOverallRisk(vulnerabilities);
        const securityScore = this.calculateSecurityScore(vulnerabilities, externalCalls);

        return {
            contractPath,
            contractName,
            reentrancyVulnerabilities: vulnerabilities,
            externalCalls,
            stateAccessPatterns,
            overallRiskLevel,
            securityScore,
            analyzedAt: new Date().toISOString(),
            analysisVersion: this.ANALYSIS_VERSION
        };
    }

    /**
     * Analyze a single function for reentrancy vulnerabilities
     */
    private async analyzeFunctionForReentrancy(
        func: ParsedRustFunction, 
        contractPath: string
    ): Promise<ReentrancyVulnerability[]> {
        const vulnerabilities: ReentrancyVulnerability[] = [];
        
        try {
            const sourceCode = fs.readFileSync(contractPath, 'utf8');
            const lines = sourceCode.split('\n');
            const functionLines = lines.slice(func.startLine - 1, func.endLine);
            const functionCode = functionLines.join('\n');

            // Pattern 1: External calls before state updates
            const externalCallPattern = /(\w+)\.invoke|\.try_invoke|\.call|\.try_call/g;
            const stateUpdatePattern = /(\w+)\s*=|\.set\(|\.insert\(|\.push\(|\.remove\(/g;
            
            const externalCallMatches = [...functionCode.matchAll(externalCallPattern)];
            const stateUpdateMatches = [...functionCode.matchAll(stateUpdatePattern)];

            for (let i = 0; i < externalCallMatches.length; i++) {
                const externalCall = externalCallMatches[i];
                const externalCallLine = func.startLine + this.getLineNumberInFunction(externalCall.index!, functionCode);
                
                // Check if there are state updates after this external call
                const subsequentStateUpdates = stateUpdateMatches.filter(
                    update => update.index! > externalCall.index!
                );

                if (subsequentStateUpdates.length > 0) {
                    vulnerabilities.push({
                        id: `reentrancy_${func.name}_${externalCallLine}`,
                        type: 'external_call_before_update',
                        riskLevel: 'high',
                        functionName: func.name,
                        lineNumber: externalCallLine,
                        description: `External call followed by state update creates reentrancy risk`,
                        codeSnippet: this.getCodeSnippet(lines, externalCallLine, 2),
                        mitigation: 'Use checks-effects-interactions pattern: perform all state checks, update state, then make external calls',
                        isConfirmed: true,
                        relatedCalls: [externalCall[0]]
                    });
                }
            }

            // Pattern 2: Multiple external calls in same function
            if (externalCallMatches.length > 1) {
                vulnerabilities.push({
                    id: `reentrancy_${func.name}_multiple_calls`,
                    type: 'multiple_external_calls',
                    riskLevel: 'medium',
                    functionName: func.name,
                    lineNumber: func.startLine,
                    description: `Multiple external calls in function increase reentrancy attack surface`,
                    codeSnippet: this.getCodeSnippet(lines, func.startLine, Math.min(10, func.endLine - func.startLine + 1)),
                    mitigation: 'Consider breaking into separate functions or implementing reentrancy guards',
                    isConfirmed: false,
                    relatedCalls: externalCallMatches.map(match => match[0])
                });
            }

            // Pattern 3: Recursive call possibility
            const recursivePattern = new RegExp(`\\b${func.name}\\s*\\(`, 'g');
            if (recursivePattern.test(functionCode)) {
                vulnerabilities.push({
                    id: `reentrancy_${func.name}_recursive`,
                    type: 'recursive_call_possible',
                    riskLevel: 'medium',
                    functionName: func.name,
                    lineNumber: func.startLine,
                    description: `Function may call itself directly or indirectly, enabling recursive reentrancy`,
                    codeSnippet: this.getCodeSnippet(lines, func.startLine, 5),
                    mitigation: 'Implement reentrancy guards or use non-reentrant design patterns',
                    isConfirmed: false,
                    relatedCalls: [func.name]
                });
            }

        } catch (error) {
            console.error(`Error analyzing function ${func.name} for reentrancy:`, error);
        }

        return vulnerabilities;
    }

    /**
     * Extract external calls from a function
     */
    private extractExternalCalls(func: ParsedRustFunction): ExternalCall[] {
        const externalCalls: ExternalCall[] = [];
        
        // Common patterns for external calls in Soroban contracts
        const patterns = [
            /(\w+)\.invoke\s*\(\s*([^)]+)\s*\)/g,
            /(\w+)\.try_invoke\s*\(\s*([^)]+)\s*\)/g,
            /(\w+)\.call\s*\(\s*([^)]+)\s*\)/g,
            /(\w+)\.try_call\s*\(\s*([^)]+)\s*\)/g
        ];

        // This is a simplified pattern matching - in a real implementation,
        // you'd want more sophisticated AST analysis
        patterns.forEach(pattern => {
            const matches = [...func.docComments.join('\n').matchAll(pattern)];
            matches.forEach(match => {
                externalCalls.push({
                    functionName: func.name,
                    lineNumber: func.startLine, // Simplified - would need actual line tracking
                    target: match[1],
                    method: 'invoke', // Simplified
                    canModifyState: true, // Conservative assumption
                    sendsValue: false, // Would need deeper analysis
                    riskLevel: 'medium'
                });
            });
        });

        return externalCalls;
    }

    /**
     * Analyze state access patterns for a function
     */
    private analyzeStateAccessPattern(
        func: ParsedRustFunction, 
        externalCalls: ExternalCall[]
    ): StateAccessPattern {
        // Simplified state access analysis
        const readOperations: Array<{
            line: number;
            variable: string;
            codeSnippet: string;
        }> = [];
        const writeOperations: Array<{
            line: number;
            variable: string;
            codeSnippet: string;
        }> = [];

        // In a real implementation, you'd parse the actual function body
        // For now, we'll create a basic structure
        return {
            functionName: func.name,
            readOperations,
            writeOperations,
            externalCalls,
            modifiesStateAfterExternalCall: externalCalls.length > 0 && writeOperations.length > 0
        };
    }

    /**
     * Calculate overall risk level from vulnerabilities
     */
    private calculateOverallRisk(vulnerabilities: ReentrancyVulnerability[]): RiskLevel {
        if (vulnerabilities.length === 0) return 'low';
        
        const criticalCount = vulnerabilities.filter(v => v.riskLevel === 'critical').length;
        const highCount = vulnerabilities.filter(v => v.riskLevel === 'high').length;
        const mediumCount = vulnerabilities.filter(v => v.riskLevel === 'medium').length;

        if (criticalCount > 0) return 'critical';
        if (highCount > 0) return 'high';
        if (mediumCount > 2) return 'high';
        if (mediumCount > 0) return 'medium';
        return 'low';
    }

    /**
     * Calculate security score (0-100, higher is better)
     */
    private calculateSecurityScore(
        vulnerabilities: ReentrancyVulnerability[], 
        externalCalls: ExternalCall[]
    ): number {
        let score = 100;
        
        // Deduct points for vulnerabilities
        vulnerabilities.forEach(vuln => {
            switch (vuln.riskLevel) {
                case 'critical': score -= 25; break;
                case 'high': score -= 15; break;
                case 'medium': score -= 8; break;
                case 'low': score -= 3; break;
            }
        });

        // Deduct points for risky external calls
        externalCalls.forEach(call => {
            if (call.canModifyState && call.sendsValue) {
                score -= 5;
            } else if (call.canModifyState) {
                score -= 2;
            }
        });

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Get line number within function from character index
     */
    private getLineNumberInFunction(index: number, functionCode: string): number {
        const beforeIndex = functionCode.substring(0, index);
        return beforeIndex.split('\n').length - 1;
    }

    /**
     * Get code snippet around a specific line
     */
    private getCodeSnippet(lines: string[], centerLine: number, context: number): string {
        const start = Math.max(0, centerLine - 1 - context);
        const end = Math.min(lines.length, centerLine + context);
        return lines.slice(start, end).join('\n');
    }
}
