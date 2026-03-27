export interface LatencyResult {
    latency: number; // in milliseconds
    success: boolean;
    timestamp: number;
    error?: string;
}

export interface NetworkHealth {
    currentLatency: number;
    averageLatency: number;
    minLatency: number;
    maxLatency: number;
    successRate: number;
    measurements: number;
    lastError?: string;
}

export class LatencyMonitor {
    private rpcUrl: string;
    private measurements: LatencyResult[] = [];
    private maxMeasurements = 20; // Keep last 20 measurements
    private intervalId?: NodeJS.Timeout;
    private onLatencyUpdate?: (result: LatencyResult) => void;

    constructor(rpcUrl: string) {
        this.rpcUrl = rpcUrl.endsWith('/') ? rpcUrl.slice(0, -1) : rpcUrl;
    }

    /**
     * Measure latency by making a lightweight RPC call
     */
    async measureLatency(): Promise<LatencyResult> {
        const startTime = Date.now();
        
        try {
            // Try getHealth endpoint first (lightweight)
            const response = await fetch(`${this.rpcUrl}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(10000)
            });

            const latency = Date.now() - startTime;

            if (response.ok) {
                const result: LatencyResult = {
                    latency,
                    success: true,
                    timestamp: Date.now()
                };
                this.addMeasurement(result);
                return result;
            }

            // Fallback to getHealth RPC method
            return await this.measureLatencyViaRpc();
        } catch (error) {
            // Fallback to RPC method if health endpoint fails
            try {
                return await this.measureLatencyViaRpc();
            } catch (rpcError) {
                const latency = Date.now() - startTime;
                const result: LatencyResult = {
                    latency,
                    success: false,
                    timestamp: Date.now(),
                    error: rpcError instanceof Error ? rpcError.message : 'Unknown error'
                };
                this.addMeasurement(result);
                return result;
            }
        }
    }

    /**
     * Measure latency using RPC getHealth method
     */
    private async measureLatencyViaRpc(): Promise<LatencyResult> {
        const startTime = Date.now();

        try {
            const response = await fetch(`${this.rpcUrl}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getHealth'
                }),
                signal: AbortSignal.timeout(10000)
            });

            const latency = Date.now() - startTime;

            if (response.ok) {
                const result: LatencyResult = {
                    latency,
                    success: true,
                    timestamp: Date.now()
                };
                this.addMeasurement(result);
                return result;
            }

            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        } catch (error) {
            const latency = Date.now() - startTime;
            const result: LatencyResult = {
                latency,
                success: false,
                timestamp: Date.now(),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            this.addMeasurement(result);
            return result;
        }
    }

    /**
     * Add measurement to history
     */
    private addMeasurement(result: LatencyResult): void {
        this.measurements.push(result);
        
        // Keep only last N measurements
        if (this.measurements.length > this.maxMeasurements) {
            this.measurements.shift();
        }

        // Notify listeners
        if (this.onLatencyUpdate) {
            this.onLatencyUpdate(result);
        }
    }

    /**
     * Get network health statistics
     */
    getNetworkHealth(): NetworkHealth {
        if (this.measurements.length === 0) {
            return {
                currentLatency: -1,
                averageLatency: -1,
                minLatency: -1,
                maxLatency: -1,
                successRate: 0,
                measurements: 0
            };
        }

        const successfulMeasurements = this.measurements.filter(m => m.success);
        const latencies = successfulMeasurements.map(m => m.latency);
        const lastMeasurement = this.measurements[this.measurements.length - 1];

        return {
            currentLatency: lastMeasurement.success ? lastMeasurement.latency : -1,
            averageLatency: latencies.length > 0 
                ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
                : -1,
            minLatency: latencies.length > 0 ? Math.min(...latencies) : -1,
            maxLatency: latencies.length > 0 ? Math.max(...latencies) : -1,
            successRate: (successfulMeasurements.length / this.measurements.length) * 100,
            measurements: this.measurements.length,
            lastError: lastMeasurement.success ? undefined : lastMeasurement.error
        };
    }

    /**
     * Start monitoring with specified interval
     */
    startMonitoring(intervalSeconds: number = 30, callback?: (result: LatencyResult) => void): void {
        this.onLatencyUpdate = callback;
        
        // Initial measurement
        this.measureLatency();

        // Set up periodic measurements
        this.intervalId = setInterval(() => {
            this.measureLatency();
        }, intervalSeconds * 1000);
    }

    /**
     * Stop monitoring
     */
    stopMonitoring(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
        this.onLatencyUpdate = undefined;
    }

    /**
     * Update RPC URL
     */
    updateRpcUrl(newUrl: string): void {
        this.rpcUrl = newUrl.endsWith('/') ? newUrl.slice(0, -1) : newUrl;
        this.measurements = []; // Clear old measurements
    }

    /**
     * Get color based on latency
     */
    static getLatencyColor(latency: number): string {
        if (latency < 0) {
            return 'gray';
        }
        if (latency < 100) {
            return 'green';
        }
        if (latency < 500) {
            return 'orange';
        }
        return 'red';
    }

    /**
     * Get status icon based on latency
     */
    static getLatencyIcon(latency: number): string {
        if (latency < 0) {
            return '$(question)';
        }
        if (latency < 100) {
            return '$(check)';
        }
        if (latency < 500) {
            return '$(warning)';
        }
        return '$(error)';
    }
}
