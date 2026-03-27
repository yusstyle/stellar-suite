import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SecurityAnalyzer } from '../services/securityAnalyzer';
import { SecurityPanel } from '../ui/securityPanel';
import { WasmDetector } from '../utils/wasmDetector';
import { RustParser } from '../services/rustParser';

export async function analyzeSecurity(context: vscode.ExtensionContext, args?: any) {
    try {
        // Get the contract directory
        let contractDir: string | null = null;
        
        if (args?.contractPath) {
            contractDir = args.contractPath;
        } else {
            // Use active contract directory or ask user to select
            contractDir = WasmDetector.getActiveContractDirectory();
            
            if (!contractDir) {
                const contractDirs = await WasmDetector.findContractDirectories();
                if (contractDirs.length === 0) {
                    vscode.window.showErrorMessage('No contract directories found in workspace');
                    return;
                } else if (contractDirs.length === 1) {
                    contractDir = contractDirs[0];
                } else {
                    const selected = await vscode.window.showQuickPick(
                        contractDirs.map(dir => ({
                            label: path.basename(dir),
                            description: dir,
                            value: dir
                        })),
                        {
                            placeHolder: 'Select contract to analyze for security issues'
                        }
                    );
                    if (!selected) return;
                    contractDir = selected.value;
                }
            }
        }

        if (!contractDir) {
            vscode.window.showErrorMessage('No contract directory selected');
            return;
        }

        // Show progress
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Analyzing Contract Security',
                cancellable: false
            },
            async (progress) => {
                progress.report({ increment: 10, message: 'Parsing contract source code...' });

                // Parse the contract source code
                const libRsPath = path.join(contractDir, 'src', 'lib.rs');
                if (!fs.existsSync(libRsPath)) {
                    vscode.window.showErrorMessage(`Contract source file not found: ${libRsPath}`);
                    return;
                }

                const parser = new RustParser();
                const parsedFile = await parser.parseFile(libRsPath);

                progress.report({ increment: 30, message: 'Analyzing for reentrancy vulnerabilities...' });

                // Perform security analysis
                const analyzer = new SecurityAnalyzer();
                const analysisResult = await analyzer.analyzeContract(contractDir, parsedFile);

                progress.report({ increment: 80, message: 'Generating security report...' });

                // Show the security panel with results
                SecurityPanel.createOrShow(context.extensionUri, analysisResult);

                progress.report({ increment: 100, message: 'Analysis complete' });

                // Show summary notification
                const vulnerabilityCount = analysisResult.reentrancyVulnerabilities.length;
                if (vulnerabilityCount === 0) {
                    vscode.window.showInformationMessage(
                        `✅ Security analysis complete: No reentrancy vulnerabilities found in ${analysisResult.contractName}`
                    );
                } else {
                    const riskLevel = analysisResult.overallRiskLevel;
                    const emoji = riskLevel === 'critical' ? '🚨' : 
                                 riskLevel === 'high' ? '⚠️' : 
                                 riskLevel === 'medium' ? '⚡' : 'ℹ️';
                    
                    vscode.window.showWarningMessage(
                        `${emoji} Security analysis complete: Found ${vulnerabilityCount} reentrancy issue(s) in ${analysisResult.contractName} (Risk: ${riskLevel.toUpperCase()})`
                    );
                }
            }
        );

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        vscode.window.showErrorMessage(`Security analysis failed: ${errorMessage}`);
        console.error('Security analysis error:', error);
    }
}
