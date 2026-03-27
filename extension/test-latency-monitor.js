#!/usr/bin/env node

/**
 * Test script for RPC Latency Monitor
 * This script simulates the latency monitoring functionality
 */

const https = require('https');
const http = require('http');

class LatencyMonitorTest {
    constructor(rpcUrl) {
        this.rpcUrl = rpcUrl;
        this.measurements = [];
    }

    async measureLatency() {
        const startTime = Date.now();
        
        try {
            // Try health endpoint
            const result = await this.makeRequest('/health', 'GET');
            const latency = Date.now() - startTime;
            
            if (result.success) {
                return { latency, success: true, timestamp: Date.now() };
            }
            
            // Fallback to RPC method
            return await this.measureLatencyViaRpc();
        } catch (error) {
            // Fallback to RPC
            try {
                return await this.measureLatencyViaRpc();
            } catch (rpcError) {
                const latency = Date.now() - startTime;
                return {
                    latency,
                    success: false,
                    timestamp: Date.now(),
                    error: rpcError.message
                };
            }
        }
    }

    async measureLatencyViaRpc() {
        const startTime = Date.now();
        
        try {
            const result = await this.makeRequest('', 'POST', {
                jsonrpc: '2.0',
                id: 1,
                method: 'getHealth'
            });
            
            const latency = Date.now() - startTime;
            
            if (result.success) {
                return { latency, success: true, timestamp: Date.now() };
            }
            
            throw new Error(result.error || 'RPC request failed');
        } catch (error) {
            const latency = Date.now() - startTime;
            return {
                latency,
                success: false,
                timestamp: Date.now(),
                error: error.message
            };
        }
    }

    makeRequest(path, method, body = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(this.rpcUrl + path);
            const isHttps = url.protocol === 'https:';
            const lib = isHttps ? https : http;
            
            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            };

            const req = lib.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ success: true, data });
                    } else {
                        resolve({ 
                            success: false, 
                            error: `HTTP ${res.statusCode}: ${res.statusMessage}` 
                        });
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            if (body) {
                req.write(JSON.stringify(body));
            }

            req.end();
        });
    }

    getLatencyColor(latency) {
        if (latency < 0) return 'GRAY';
        if (latency < 100) return 'GREEN';
        if (latency < 500) return 'ORANGE';
        return 'RED';
    }

    getLatencyIcon(latency) {
        if (latency < 0) return '?';
        if (latency < 100) return '✓';
        if (latency < 500) return '⚠';
        return '✗';
    }

    formatResult(result) {
        if (result.success) {
            const color = this.getLatencyColor(result.latency);
            const icon = this.getLatencyIcon(result.latency);
            return `${icon} ${result.latency}ms (${color})`;
        } else {
            return `✗ Error: ${result.error}`;
        }
    }
}

async function runTests() {
    console.log('═══════════════════════════════════════════════════');
    console.log('    STELLAR RPC LATENCY MONITOR - TEST SUITE');
    console.log('═══════════════════════════════════════════════════\n');

    const endpoints = [
        'https://soroban-testnet.stellar.org:443',
        'https://soroban-testnet.stellar.org',
        'https://rpc-futurenet.stellar.org:443'
    ];

    for (const endpoint of endpoints) {
        console.log(`\nTesting endpoint: ${endpoint}`);
        console.log('─────────────────────────────────────────────────');
        
        const monitor = new LatencyMonitorTest(endpoint);
        
        // Run 5 measurements
        const results = [];
        for (let i = 1; i <= 5; i++) {
            process.stdout.write(`  Measurement ${i}/5... `);
            const result = await monitor.measureLatency();
            results.push(result);
            console.log(monitor.formatResult(result));
            
            // Small delay between measurements
            if (i < 5) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // Calculate statistics
        const successful = results.filter(r => r.success);
        if (successful.length > 0) {
            const latencies = successful.map(r => r.latency);
            const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
            const min = Math.min(...latencies);
            const max = Math.max(...latencies);
            const successRate = (successful.length / results.length) * 100;

            console.log('\n  Statistics:');
            console.log(`    Average:      ${avg}ms`);
            console.log(`    Min:          ${min}ms`);
            console.log(`    Max:          ${max}ms`);
            console.log(`    Success Rate: ${successRate.toFixed(1)}%`);
        } else {
            console.log('\n  All measurements failed');
        }
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════\n');

    console.log('Status Bar Display Examples:');
    console.log('  ✓ 45ms   (GREEN)  - Excellent performance');
    console.log('  ⚠ 250ms  (ORANGE) - Fair performance');
    console.log('  ✗ 750ms  (RED)    - Poor performance');
    console.log('  ? ---ms  (GRAY)   - Measuring or error\n');
}

// Run tests
runTests().catch(console.error);
