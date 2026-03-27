# RPC Latency Monitor - Implementation Guide

## Issue #385: Network Custom RPC Endpoint Latency Monitor

### Implementation Summary

This implementation adds a real-time RPC latency monitor to the Stellar Kit Studio VS Code extension, providing visual feedback about network performance directly in the status bar.

## Files Created/Modified

### New Files

1. **`extension/src/services/latencyMonitor.ts`**
   - Core latency monitoring service
   - Performs health checks via HTTP and RPC methods
   - Maintains measurement history and statistics
   - Provides color coding and icon selection logic

2. **`extension/src/commands/showNetworkHealth.ts`**
   - Command to display detailed network health report
   - Shows comprehensive statistics and metrics
   - Provides quick actions for endpoint management

3. **`extension/test-latency-monitor.js`**
   - Standalone test script for latency monitoring
   - Tests multiple Stellar RPC endpoints
   - Validates color coding and statistics

4. **`docs/network-latency-monitor.md`**
   - Complete user documentation
   - API reference and troubleshooting guide

### Modified Files

1. **`extension/src/ui/networkStatusBar.ts`**
   - Added latency status bar item
   - Integrated LatencyMonitor service
   - Automatic monitoring with 30-second intervals
   - Configuration change listeners

2. **`extension/src/extension.ts`**
   - Registered `showNetworkHealth` command
   - Added cleanup on deactivation
   - Imported new dependencies

3. **`extension/package.json`**
   - Added `stellarSuite.showNetworkHealth` command definition

## Features Implemented

### ✅ Status Bar Indicator

- Displays current latency in milliseconds
- Visual icons: ✓ (green), ⚠ (orange), ✗ (red), ? (gray)
- Color-coded background for warnings and errors
- Clickable to open detailed health report

### ✅ Color Coding

- **Green** (< 100ms): Excellent performance
- **Orange** (100-500ms): Fair performance  
- **Red** (> 500ms): Poor performance
- **Gray**: Measuring or error state

### ✅ Automatic Monitoring

- Lightweight health checks every 30 seconds
- Dual-method approach: `/health` endpoint + `getHealth` RPC
- Graceful fallback on endpoint failures
- Minimal rate limit impact (2 requests/minute)

### ✅ Detailed Health Report

Accessible via clicking the status bar indicator:
- Current, average, min, max latency
- Success rate and reliability metrics
- Performance recommendations
- Quick actions: measure now, change endpoint, switch network

### ✅ Configuration Integration

- Automatically uses `stellarSuite.rpcUrl` setting
- Updates on configuration changes
- Respects network selection
- No additional configuration required

## Technical Architecture

### Latency Measurement Flow

```
┌─────────────────────────────────────────────────┐
│  Status Bar Item (UI)                           │
│  - Displays latency                             │
│  - Shows color/icon                             │
│  - Handles clicks                               │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  LatencyMonitor Service                         │
│  - Measures latency                             │
│  - Maintains history                            │
│  - Calculates statistics                        │
│  - Triggers callbacks                           │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  RPC Endpoint                                   │
│  - /health (HTTP GET)                           │
│  - getHealth (JSON-RPC)                         │
└─────────────────────────────────────────────────┘
```

### Monitoring Strategy

1. **Primary**: HTTP GET to `/health` endpoint
   - Fastest method
   - Minimal overhead
   - Standard health check

2. **Fallback**: JSON-RPC `getHealth` method
   - Used if `/health` fails
   - More compatible
   - Slightly higher overhead

3. **Error Handling**: Graceful degradation
   - Shows error state in UI
   - Continues monitoring
   - Provides diagnostic info

### Data Flow

```typescript
// Every 30 seconds:
measureLatency()
  → fetch(rpcUrl/health)
  → calculate latency
  → addMeasurement()
  → trigger callback
  → updateStatusBar()
```

## Testing Results

### Test Script Output

```
═══════════════════════════════════════════════════
    STELLAR RPC LATENCY MONITOR - TEST SUITE
═══════════════════════════════════════════════════

Testing endpoint: https://soroban-testnet.stellar.org:443
─────────────────────────────────────────────────
  Measurement 1/5... ⚠ 339ms (ORANGE)
  Measurement 2/5... ⚠ 343ms (ORANGE)
  Measurement 3/5... ⚠ 337ms (ORANGE)
  Measurement 4/5... ⚠ 338ms (ORANGE)
  Measurement 5/5... ⚠ 335ms (ORANGE)

  Statistics:
    Average:      338ms
    Min:          335ms
    Max:          343ms
    Success Rate: 100.0%
```

### Verified Functionality

✅ Latency measurement working correctly  
✅ Color coding accurate (< 100ms green, 100-500ms orange, > 500ms red)  
✅ Statistics calculation correct  
✅ Multiple endpoint support  
✅ Error handling functional  
✅ TypeScript compilation successful  
✅ No diagnostic errors  

## Usage Examples

### For Users

1. **View Current Latency**
   - Look at status bar: `$(check) 45ms`
   - Green = good, Orange = fair, Red = poor

2. **Check Network Health**
   - Click latency indicator
   - View detailed report
   - Take action if needed

3. **Change Endpoint**
   - Settings → Stellar Suite RPC URL
   - Monitor automatically updates

### For Developers

```typescript
// Get monitor instance
const monitor = getLatencyMonitor();

// Measure latency manually
const result = await monitor.measureLatency();
console.log(`Latency: ${result.latency}ms`);

// Get health statistics
const health = monitor.getNetworkHealth();
console.log(`Average: ${health.averageLatency}ms`);
console.log(`Success Rate: ${health.successRate}%`);
```

## Performance Considerations

### Resource Usage

- **CPU**: Negligible (background timer only)
- **Memory**: < 1KB (20 measurements × ~50 bytes)
- **Network**: 2 requests/minute (< 2KB/minute)
- **Rate Limits**: Minimal impact (health checks are lightweight)

### Optimization Strategies

1. **Measurement History**: Limited to 20 entries
2. **Request Timeout**: 10 seconds max
3. **Interval**: 30 seconds (configurable)
4. **Fallback Logic**: Prevents unnecessary retries

## Accessibility & Brand Consistency

### Visual Design

- Uses VS Code's native status bar styling
- Follows theme colors (light/dark mode compatible)
- Standard VS Code icons ($(check), $(warning), $(error))
- Color-blind friendly (icons + colors)

### User Experience

- Non-intrusive monitoring
- Clear visual feedback
- Actionable information
- Consistent with VS Code patterns

## Future Enhancements

### Potential Improvements

1. **Configurable Interval**
   - Add setting: `stellarSuite.latencyCheckInterval`
   - Allow users to adjust frequency

2. **Historical Graphs**
   - Webview panel with charts
   - Trend analysis over time

3. **Multiple Endpoints**
   - Compare different RPC providers
   - Automatic failover

4. **Alerts**
   - Notifications for degraded performance
   - Threshold-based warnings

5. **Export Data**
   - CSV export for analysis
   - Integration with monitoring tools

## Troubleshooting

### Common Issues

**Issue**: Latency shows "---ms"
- **Cause**: Initial measurement or network error
- **Solution**: Wait 30 seconds or click to view error details

**Issue**: High latency (> 500ms)
- **Cause**: Network congestion or distant endpoint
- **Solution**: Try different RPC endpoint or check connection

**Issue**: Frequent failures
- **Cause**: Firewall, proxy, or endpoint issues
- **Solution**: Verify RPC URL and network settings

## Acceptance Criteria Status

✅ Small indicator in bottom Status Bar showing '---ms'  
✅ Visual color coding (Green < 100ms, Orange 100-500ms, Red > 500ms)  
✅ Clicking opens detailed network health report  
✅ Latency test utility implemented  
✅ StatusBar network component created  
✅ Functional test output verified  

## Commit Message

```
feat: real-time RPC latency monitor

Add performance indicator to Status Bar showing real-time ping to
currently selected Soroban RPC endpoint. Helps identify network
issues causing builds/deploys to appear stuck.

Features:
- Status bar indicator with color coding (green/orange/red)
- Automatic monitoring every 30 seconds
- Detailed network health report
- Dual-method latency measurement (health endpoint + RPC)
- Configuration integration and auto-updates

Closes #385
```

## Testing Instructions

### Manual Testing

1. **Install Extension**
   ```bash
   cd extension
   npm install
   npm run compile
   npm run package
   ```

2. **Load in VS Code**
   - Press F5 to launch Extension Development Host
   - Open a Stellar project

3. **Verify Status Bar**
   - Check for latency indicator in status bar
   - Should show `$(icon) XXXms`
   - Color should match latency range

4. **Test Health Report**
   - Click latency indicator
   - Verify detailed report appears
   - Test quick actions

5. **Test Configuration**
   - Change `stellarSuite.rpcUrl` setting
   - Verify monitor updates automatically

### Automated Testing

```bash
cd extension
node test-latency-monitor.js
```

Expected output:
- Multiple endpoint tests
- Latency measurements
- Statistics calculation
- Color coding verification

## Documentation

- User Guide: `docs/network-latency-monitor.md`
- API Reference: Included in user guide
- Implementation: This file
- Test Script: `extension/test-latency-monitor.js`

## Support

For questions or issues:
- GitHub: https://github.com/Stellar-Kit/studio/issues
- Tag: `#385`, `network`, `latency-monitor`
