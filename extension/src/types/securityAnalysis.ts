// ============================================================
// src/types/securityAnalysis.ts
// Type definitions for security analysis and reentrancy detection.
// ============================================================

/** Risk level for security vulnerabilities */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/** Type of reentrancy vulnerability */
export type ReentrancyType = 
    | 'external_call_before_update'
    | 'state_change_after_external_call'
    | 'recursive_call_possible'
    | 'unchecked_external_call'
    | 'multiple_external_calls';

/** Reentrancy vulnerability detection result */
export interface ReentrancyVulnerability {
    /** Unique identifier for this vulnerability */
    id: string;
    /** Type of reentrancy vulnerability */
    type: ReentrancyType;
    /** Risk level assessment */
    riskLevel: RiskLevel;
    /** Function name where vulnerability was found */
    functionName: string;
    /** Line number in source code */
    lineNumber: number;
    /** Detailed description of the vulnerability */
    description: string;
    /** Code snippet showing the vulnerability */
    codeSnippet: string;
    /** Recommended mitigation strategy */
    mitigation: string;
    /** Whether this is a confirmed or potential vulnerability */
    isConfirmed: boolean;
    /** Related external calls that could trigger reentrancy */
    relatedCalls: string[];
}

/** External call analysis result */
export interface ExternalCall {
    /** Function name containing the external call */
    functionName: string;
    /** Line number of the external call */
    lineNumber: number;
    /** Target contract/address being called */
    target: string;
    /** Method being called */
    method: string;
    /** Whether this call can modify state */
    canModifyState: boolean;
    /** Whether this call sends value */
    sendsValue: boolean;
    /** Risk level of this specific call */
    riskLevel: RiskLevel;
}

/** State access pattern analysis */
export interface StateAccessPattern {
    /** Function name */
    functionName: string;
    /** Lines where state is read */
    readOperations: Array<{
        line: number;
        variable: string;
        codeSnippet: string;
    }>;
    /** Lines where state is written */
    writeOperations: Array<{
        line: number;
        variable: string;
        codeSnippet: string;
    }>;
    /** External calls in this function */
    externalCalls: ExternalCall[];
    /** Whether state is modified after external calls */
    modifiesStateAfterExternalCall: boolean;
}

/** Complete security analysis result for a contract */
export interface SecurityAnalysisResult {
    /** Contract being analyzed */
    contractPath: string;
    /** Contract name */
    contractName: string;
    /** All detected reentrancy vulnerabilities */
    reentrancyVulnerabilities: ReentrancyVulnerability[];
    /** All external calls found */
    externalCalls: ExternalCall[];
    /** State access patterns for each function */
    stateAccessPatterns: StateAccessPattern[];
    /** Overall risk assessment */
    overallRiskLevel: RiskLevel;
    /** Security score (0-100, higher is better) */
    securityScore: number;
    /** Analysis timestamp */
    analyzedAt: string;
    /** Analysis version */
    analysisVersion: string;
}

/** Security analysis configuration */
export interface SecurityAnalysisConfig {
    /** Enable/disable reentrancy detection */
    enableReentrancyDetection: boolean;
    /** Minimum risk level to report */
    minimumRiskLevel: RiskLevel;
    /** Whether to include low-risk findings */
    includeLowRisk: boolean;
    /** Custom patterns to detect */
    customPatterns: Array<{
        name: string;
        pattern: RegExp;
        riskLevel: RiskLevel;
        description: string;
    }>;
}

/** Security visualization data */
export interface SecurityVisualizationData {
    /** Contract analysis results */
    analysis: SecurityAnalysisResult;
    /** Vulnerability counts by type */
    vulnerabilityCounts: Record<ReentrancyType, number>;
    /** Risk distribution */
    riskDistribution: Record<RiskLevel, number>;
    /** Timeline of when vulnerabilities were introduced (if available) */
    vulnerabilityTimeline: Array<{
        functionName: string;
        vulnerabilityType: ReentrancyType;
        introducedAt: string;
    }>;
}
