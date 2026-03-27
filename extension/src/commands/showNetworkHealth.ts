import * as vscode from 'vscode';
import { getLatencyMonitor } from '../ui/networkStatusBar';
import { LatencyMonitor } from '../services/latencyMonitor';

export async function showNetworkHealth() {
    const monitor = getLatencyMonitor();
    
    if (!monitor) {
        vscode.window.showWarningMessage('Network monitoring is not active');
        return;
    }

    const health = monitor.getNetworkHealth();
    const config = vscode.workspace.getConfiguration('stellarSuite');
    const rpcUrl = config.get<string>('rpcUrl') || 'https://soroban-testnet.stellar.org:443';
    const network = config.get<string>('network') || 'testnet';

    // Format the report
    const lines: string[] = [];
    lines.push('═══════════════════════════════════════════════════');
    lines.push('         STELLAR RPC NETWORK HEALTH REPORT');
    lines.push('═══════════════════════════════════════════════════');
    lines.push('');
    lines.push(`Network:        ${network}`);
    lines.push(`RPC Endpoint:   ${rpcUrl}`);
    lines.push('');
    lines.push('─────────────────────────────────────────────────');
    lines.push('  LATENCY METRICS');
    lines.push('─────────────────────────────────────────────────');
    
    if (health.currentLatency >= 0) {
        const color = LatencyMonitor.getLatencyColor(health.currentLatency);
        const status = color === 'green' ? 'Excellent' : color === 'orange' ? 'Fair' : 'Poor';
        
        lines.push(`Current:        ${health.currentLatency}ms (${status})`);
        lines.push(`Average:        ${health.averageLatency}ms`);
        lines.push(`Min:            ${health.minLatency}ms`);
        lines.push(`Max:            ${health.maxLatency}ms`);
    } else {
        lines.push('Current:        Not available');
        lines.push(`Last Error:     ${health.lastError || 'Unknown error'}`);
    }
    
    lines.push('');
    lines.push('─────────────────────────────────────────────────');
    lines.push('  RELIABILITY');
    lines.push('─────────────────────────────────────────────────');
    lines.push(`Success Rate:   ${health.successRate.toFixed(1)}%`);
    lines.push(`Measurements:   ${health.measurements}`);
    lines.push('');
    lines.push('─────────────────────────────────────────────────');
    lines.push('  PERFORMANCE GUIDE');
    lines.push('─────────────────────────────────────────────────');
    lines.push('< 100ms:        Excellent - Optimal for development');
    lines.push('100-500ms:      Fair - May experience delays');
    lines.push('> 500ms:        Poor - Consider switching endpoints');
    lines.push('');
    lines.push('═══════════════════════════════════════════════════');

    const report = lines.join('\n');

    // Show in output channel
    const outputChannel = vscode.window.createOutputChannel('Stellar Network Health');
    outputChannel.clear();
    outputChannel.appendLine(report);
    outputChannel.show();

    // Also show a quick pick with actions
    const actions = [
        { label: '$(refresh) Measure Now', description: 'Run immediate latency test' },
        { label: '$(gear) Change RPC Endpoint', description: 'Update RPC URL in settings' },
        { label: '$(globe) Switch Network', description: 'Change Stellar network' }
    ];

    const selection = await vscode.window.showQuickPick(actions, {
        placeHolder: `Current latency: ${health.currentLatency >= 0 ? health.currentLatency + 'ms' : 'N/A'}`
    });

    if (selection) {
        if (selection.label.includes('Measure Now')) {
            vscode.window.showInformationMessage('Measuring RPC latency...');
            const result = await monitor.measureLatency();
            if (result.success) {
                vscode.window.showInformationMessage(`Latency: ${result.latency}ms`);
            } else {
                vscode.window.showErrorMessage(`Failed to measure latency: ${result.error}`);
            }
        } else if (selection.label.includes('Change RPC')) {
            vscode.commands.executeCommand('workbench.action.openSettings', 'stellarSuite.rpcUrl');
        } else if (selection.label.includes('Switch Network')) {
            vscode.commands.executeCommand('stellarSuite.switchNetwork');
        }
    }
}
