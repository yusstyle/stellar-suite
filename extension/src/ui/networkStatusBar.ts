import * as vscode from 'vscode';
import { LatencyMonitor, LatencyResult } from '../services/latencyMonitor';

let networkStatusBarItem: vscode.StatusBarItem;
let latencyStatusBarItem: vscode.StatusBarItem;
let latencyMonitor: LatencyMonitor | undefined;

export async function initNetworkStatusBar(context: vscode.ExtensionContext) {
    // Network selector status bar item
    networkStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    networkStatusBarItem.command = 'stellarSuite.switchNetwork';
    context.subscriptions.push(networkStatusBarItem);

    // Latency monitor status bar item
    latencyStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    latencyStatusBarItem.command = 'stellarSuite.showNetworkHealth';
    context.subscriptions.push(latencyStatusBarItem);

    await updateNetworkStatusBar();
    networkStatusBarItem.show();
    latencyStatusBarItem.show();

    // Initialize latency monitoring
    await startLatencyMonitoring();

    // Listen for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('stellarSuite.rpcUrl') || 
                e.affectsConfiguration('stellarSuite.network')) {
                await updateNetworkStatusBar();
                await startLatencyMonitoring();
            }
        })
    );
}

export async function updateNetworkStatusBar() {
    try {
        const config = vscode.workspace.getConfiguration('stellarSuite');
        const currentNetwork = config.get<string>('network') || 'testnet';

        networkStatusBarItem.text = `$(globe) Stellar: ${currentNetwork}`;
        networkStatusBarItem.tooltip = 'Click to switch Stellar Network';
    } catch (e) {
        networkStatusBarItem.text = `$(globe) Stellar: testnet`;
    }
}

async function startLatencyMonitoring() {
    // Stop existing monitor
    if (latencyMonitor) {
        latencyMonitor.stopMonitoring();
    }

    const config = vscode.workspace.getConfiguration('stellarSuite');
    const rpcUrl = config.get<string>('rpcUrl') || 'https://soroban-testnet.stellar.org:443';

    // Create new monitor
    latencyMonitor = new LatencyMonitor(rpcUrl);

    // Update status bar on each measurement
    latencyMonitor.startMonitoring(30, (result: LatencyResult) => {
        updateLatencyStatusBar(result);
    });

    // Initial update
    latencyStatusBarItem.text = '$(sync~spin) ---ms';
    latencyStatusBarItem.tooltip = 'Measuring RPC latency...';
}

function updateLatencyStatusBar(result: LatencyResult) {
    if (result.success) {
        const icon = LatencyMonitor.getLatencyIcon(result.latency);
        const color = LatencyMonitor.getLatencyColor(result.latency);
        
        latencyStatusBarItem.text = `${icon} ${result.latency}ms`;
        latencyStatusBarItem.tooltip = `RPC Latency: ${result.latency}ms (${color})\nClick for detailed network health`;
        
        // Apply color using VS Code's status bar color API
        if (color === 'red') {
            latencyStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        } else if (color === 'orange') {
            latencyStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            latencyStatusBarItem.backgroundColor = undefined;
        }
    } else {
        latencyStatusBarItem.text = '$(error) ---ms';
        latencyStatusBarItem.tooltip = `RPC Error: ${result.error || 'Unknown error'}\nClick for details`;
        latencyStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    }
}

export function getLatencyMonitor(): LatencyMonitor | undefined {
    return latencyMonitor;
}

export function disposeNetworkStatusBar() {
    if (latencyMonitor) {
        latencyMonitor.stopMonitoring();
    }
}
