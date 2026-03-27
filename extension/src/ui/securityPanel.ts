import * as vscode from 'vscode';
import { SecurityAnalysisResult, ReentrancyVulnerability, RiskLevel, SecurityVisualizationData } from '../types/securityAnalysis';

export class SecurityPanel {
    private static instance: SecurityPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, analysisResult: SecurityAnalysisResult) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (SecurityPanel.instance) {
            SecurityPanel.instance._panel.reveal(column);
            SecurityPanel.instance._update(analysisResult);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            SecurityPanel.viewType,
            'Security Analysis',
            column || vscode.ViewColumn.One,
            {
                // Enable javascript in the webview
                enableScripts: true,
                // Restrict the webview to only load resources from the extension directory
                localResourceRoots: [extensionUri]
            }
        );

        SecurityPanel.instance = new SecurityPanel(panel, extensionUri, analysisResult);
    }

    private static readonly viewType = 'securityAnalysis';

    private constructor(
        panel: vscode.WebviewPanel,
        private readonly _extensionUri: vscode.Uri,
        private _analysisResult: SecurityAnalysisResult
    ) {
        this._panel = panel;

        // Set the webview's initial html content
        this._update(this._analysisResult);

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'openFile':
                        this.openFileAtLine(message.filePath, message.lineNumber);
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    public dispose() {
        SecurityPanel.instance = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update(analysisResult: SecurityAnalysisResult) {
        this._analysisResult = analysisResult;
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, analysisResult);
    }

    private _getHtmlForWebview(webview: vscode.Webview, analysisResult: SecurityAnalysisResult): string {
        // Get vulnerability counts and risk distribution
        const vulnerabilityCounts = this.getVulnerabilityCounts(analysisResult.reentrancyVulnerabilities);
        const riskDistribution = this.getRiskDistribution(analysisResult.reentrancyVulnerabilities);
        const visualizationData: SecurityVisualizationData = {
            analysis: analysisResult,
            vulnerabilityCounts,
            riskDistribution,
            vulnerabilityTimeline: []
        };

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Analysis - ${analysisResult.contractName}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            border-bottom: 2px solid var(--vscode-panel-border);
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .contract-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .contract-name {
            font-size: 24px;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
        }
        .security-score {
            font-size: 18px;
            font-weight: bold;
            padding: 10px 20px;
            border-radius: 8px;
        }
        .score-critical { background-color: #f44336; color: white; }
        .score-high { background-color: #ff9800; color: white; }
        .score-medium { background-color: #ff9800; color: white; }
        .score-low { background-color: #4caf50; color: white; }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
        }
        .summary-card h3 {
            margin-top: 0;
            color: var(--vscode-textLink-foreground);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
        }
        
        .vulnerability-list {
            margin-top: 30px;
        }
        .vulnerability-item {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            margin-bottom: 20px;
            padding: 20px;
            border-left: 5px solid;
        }
        .risk-critical { border-left-color: #f44336; }
        .risk-high { border-left-color: #ff9800; }
        .risk-medium { border-left-color: #ff9800; }
        .risk-low { border-left-color: #4caf50; }
        
        .vulnerability-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .vulnerability-title {
            font-size: 18px;
            font-weight: bold;
        }
        .risk-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .badge-critical { background-color: #f44336; color: white; }
        .badge-high { background-color: #ff9800; color: white; }
        .badge-medium { background-color: #ff9800; color: white; }
        .badge-low { background-color: #4caf50; color: white; }
        
        .code-snippet {
            background-color: var(--vscode-textBlockQuote-background);
            border: 1px solid var(--vscode-textBlockQuote-border);
            border-radius: 4px;
            padding: 15px;
            margin: 15px 0;
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            white-space: pre-wrap;
            overflow-x: auto;
        }
        .mitigation {
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textLink-activeForeground);
            padding: 15px;
            margin: 15px 0;
        }
        .mitigation strong {
            color: var(--vscode-textLink-activeForeground);
        }
        
        .chart-container {
            height: 300px;
            margin: 20px 0;
        }
        
        .file-link {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
            cursor: pointer;
        }
        .file-link:hover {
            text-decoration: underline;
        }
        
        .no-vulnerabilities {
            text-align: center;
            padding: 40px;
            background-color: var(--vscode-textBlockQuote-background);
            border-radius: 8px;
            border: 1px solid var(--vscode-textBlockQuote-border);
        }
        .no-vulnerabilities h3 {
            color: #4caf50;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="contract-info">
                <div class="contract-name">${analysisResult.contractName}</div>
                <div class="security-score score-${analysisResult.overallRiskLevel}">
                    Security Score: ${analysisResult.securityScore}/100
                </div>
            </div>
            <div>
                <strong>Overall Risk Level:</strong> 
                <span class="risk-badge badge-${analysisResult.overallRiskLevel}">${analysisResult.overallRiskLevel.toUpperCase()}</span>
            </div>
        </div>

        <div class="summary-grid">
            <div class="summary-card">
                <h3>🔒 Vulnerabilities Found</h3>
                <div style="font-size: 24px; font-weight: bold; color: var(--vscode-errorForeground);">
                    ${analysisResult.reentrancyVulnerabilities.length}
                </div>
            </div>
            <div class="summary-card">
                <h3>📞 External Calls</h3>
                <div style="font-size: 24px; font-weight: bold; color: var(--vscode-warningForeground);">
                    ${analysisResult.externalCalls.length}
                </div>
            </div>
            <div class="summary-card">
                <h3>📊 Risk Distribution</h3>
                <div>
                    ${Object.entries(riskDistribution).map(([risk, count]) => 
                        `<div style="margin: 5px 0;">
                            <span class="risk-badge badge-${risk}">${risk}: ${count}</span>
                        </div>`
                    ).join('')}
                </div>
            </div>
            <div class="summary-card">
                <h3>📅 Analyzed</h3>
                <div style="font-size: 14px;">
                    ${new Date(analysisResult.analyzedAt).toLocaleString()}
                </div>
            </div>
        </div>

        <div class="vulnerability-list">
            <h2>🚨 Reentrancy Vulnerabilities</h2>
            ${analysisResult.reentrancyVulnerabilities.length === 0 ? 
                `<div class="no-vulnerabilities">
                    <h3>✅ No Reentrancy Vulnerabilities Detected</h3>
                    <p>Great job! Your contract appears to be safe from common reentrancy attack patterns.</p>
                </div>` :
                analysisResult.reentrancyVulnerabilities.map(vuln => this.renderVulnerability(vuln)).join('')
            }
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function openFile(filePath, lineNumber) {
            vscode.postMessage({
                command: 'openFile',
                filePath: filePath,
                lineNumber: lineNumber
            });
        }
    </script>
</body>
</html>`;
    }

    private renderVulnerability(vulnerability: ReentrancyVulnerability): string {
        return `
            <div class="vulnerability-item risk-${vulnerability.riskLevel}">
                <div class="vulnerability-header">
                    <div class="vulnerability-title">${vulnerability.functionName}</div>
                    <div class="risk-badge badge-${vulnerability.riskLevel}">${vulnerability.riskLevel}</div>
                </div>
                
                <p><strong>Type:</strong> ${this.formatReentrancyType(vulnerability.type)}</p>
                <p><strong>Location:</strong> Line ${vulnerability.lineNumber}</p>
                <p><strong>Description:</strong> ${vulnerability.description}</p>
                
                ${vulnerability.codeSnippet ? `
                    <div class="code-snippet">${vulnerability.codeSnippet}</div>
                ` : ''}
                
                <div class="mitigation">
                    <strong>💡 Mitigation:</strong> ${vulnerability.mitigation}
                </div>
                
                ${vulnerability.relatedCalls.length > 0 ? `
                    <p><strong>Related Calls:</strong> ${vulnerability.relatedCalls.join(', ')}</p>
                ` : ''}
            </div>
        `;
    }

    private formatReentrancyType(type: string): string {
        return type.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    private getVulnerabilityCounts(vulnerabilities: ReentrancyVulnerability[]): Record<string, number> {
        const counts: Record<string, number> = {};
        vulnerabilities.forEach(vuln => {
            counts[vuln.type] = (counts[vuln.type] || 0) + 1;
        });
        return counts;
    }

    private getRiskDistribution(vulnerabilities: ReentrancyVulnerability[]): Record<RiskLevel, number> {
        const distribution: Record<RiskLevel, number> = {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0
        };
        vulnerabilities.forEach(vuln => {
            distribution[vuln.riskLevel]++;
        });
        return distribution;
    }

    private openFileAtLine(filePath: string, lineNumber: number) {
        const uri = vscode.Uri.file(filePath);
        vscode.window.showTextDocument(uri).then(editor => {
            const line = editor.selection.active.line;
            const newLine = lineNumber - 1; // Convert to 0-based
            const range = new vscode.Range(newLine, 0, newLine, 0);
            editor.selection = new vscode.Selection(range.start, range.end);
            editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
        });
    }
}
