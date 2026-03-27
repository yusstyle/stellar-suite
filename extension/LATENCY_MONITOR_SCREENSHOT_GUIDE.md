# RPC Latency Monitor - Screenshot Guide

## Visual Demonstration Guide

This document describes what the RPC Latency Monitor looks like in VS Code for documentation and verification purposes.

## Status Bar Display

### Location
The latency indicator appears in the **bottom status bar**, to the right of the network selector:

```
┌─────────────────────────────────────────────────────────────┐
│ VS Code Window                                              │
│                                                             │
│  [Editor Content Area]                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
  Status Bar:
  [$(globe) Stellar: testnet] [$(check) 45ms] [Other Items...]
  └─ Network Selector ─────┘  └─ Latency ──┘
```

### Visual States

#### 1. Excellent Performance (< 100ms)
```
Status Bar: [$(check) 45ms]
Color:      Green checkmark icon
Background: Default (no special background)
Tooltip:    "RPC Latency: 45ms (green)\nClick for detailed network health"
```

#### 2. Fair Performance (100-500ms)
```
Status Bar: [$(warning) 250ms]
Color:      Orange warning icon
Background: Orange/warning background
Tooltip:    "RPC Latency: 250ms (orange)\nClick for detailed network health"
```

#### 3. Poor Performance (> 500ms)
```
Status Bar: [$(error) 750ms]
Color:      Red error icon
Background: Red/error background
Tooltip:    "RPC Latency: 750ms (red)\nClick for detailed network health"
```

#### 4. Measuring/Error State
```
Status Bar: [$(sync~spin) ---ms]  or  [$(error) ---ms]
Color:      Gray or red
Background: Red if error, default if measuring
Tooltip:    "Measuring RPC latency..." or "RPC Error: [error message]"
```

## Network Health Report

### Output Channel Display

When clicking the latency indicator, an output channel opens with:

```
═══════════════════════════════════════════════════
         STELLAR RPC NETWORK HEALTH REPORT
═══════════════════════════════════════════════════

Network:        testnet
RPC Endpoint:   https://soroban-testnet.stellar.org:443

─────────────────────────────────────────────────
  LATENCY METRICS
─────────────────────────────────────────────────
Current:        338ms (Fair)
Average:        342ms
Min:            327ms
Max:            382ms

─────────────────────────────────────────────────
  RELIABILITY
─────────────────────────────────────────────────
Success Rate:   100.0%
Measurements:   20

─────────────────────────────────────────────────
  PERFORMANCE GUIDE
─────────────────────────────────────────────────
< 100ms:        Excellent - Optimal for development
100-500ms:      Fair - May experience delays
> 500ms:        Poor - Consider switching endpoints

═══════════════════════════════════════════════════
```

### Quick Pick Menu

After viewing the report, a quick pick menu appears:

```
┌─────────────────────────────────────────────────┐
│ Current latency: 338ms                          │
├─────────────────────────────────────────────────┤
│ $(refresh) Measure Now                          │
│   Run immediate latency test                    │
│                                                 │
│ $(gear) Change RPC Endpoint                     │
│   Update RPC URL in settings                    │
│                                                 │
│ $(globe) Switch Network                         │
│   Change Stellar network                        │
└─────────────────────────────────────────────────┘
```

## Test Script Output

### Terminal Display

Running `node test-latency-monitor.js` produces:

```bash
$ node test-latency-monitor.js

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

Testing endpoint: https://soroban-testnet.stellar.org
─────────────────────────────────────────────────
  Measurement 1/5... ⚠ 408ms (ORANGE)
  Measurement 2/5... ⚠ 380ms (ORANGE)
  Measurement 3/5... ⚠ 358ms (ORANGE)
  Measurement 4/5... ⚠ 348ms (ORANGE)
  Measurement 5/5... ⚠ 340ms (ORANGE)

  Statistics:
    Average:      367ms
    Min:          340ms
    Max:          408ms
    Success Rate: 100.0%

Testing endpoint: https://rpc-futurenet.stellar.org:443
─────────────────────────────────────────────────
  Measurement 1/5... ⚠ 332ms (ORANGE)
  Measurement 2/5... ⚠ 332ms (ORANGE)
  Measurement 3/5... ⚠ 382ms (ORANGE)
  Measurement 4/5... ⚠ 333ms (ORANGE)
  Measurement 5/5... ⚠ 327ms (ORANGE)

  Statistics:
    Average:      341ms
    Min:          327ms
    Max:          382ms
    Success Rate: 100.0%

═══════════════════════════════════════════════════
  TEST COMPLETE
═══════════════════════════════════════════════════

Status Bar Display Examples:
  ✓ 45ms   (GREEN)  - Excellent performance
  ⚠ 250ms  (ORANGE) - Fair performance
  ✗ 750ms  (RED)    - Poor performance
  ? ---ms  (GRAY)   - Measuring or error
```

## Color Coding Reference

### Icon Mapping

| Latency Range | Icon | Color | Status | VS Code Icon |
|--------------|------|-------|--------|--------------|
| < 100ms | ✓ | Green | Excellent | `$(check)` |
| 100-500ms | ⚠ | Orange | Fair | `$(warning)` |
| > 500ms | ✗ | Red | Poor | `$(error)` |
| Error/Unknown | ? | Gray | N/A | `$(question)` |
| Measuring | ⟳ | Gray | Loading | `$(sync~spin)` |

### Background Colors

- **Green**: No special background (default)
- **Orange**: `statusBarItem.warningBackground` theme color
- **Red**: `statusBarItem.errorBackground` theme color
- **Gray**: No special background (default)

## User Interaction Flow

### Scenario 1: Normal Operation

1. User opens VS Code with Stellar extension
2. Status bar shows: `$(globe) Stellar: testnet` `$(sync~spin) ---ms`
3. After ~2 seconds: `$(check) 45ms` (green)
4. Every 30 seconds, indicator updates automatically
5. User continues working with visual feedback

### Scenario 2: Checking Network Health

1. User notices orange indicator: `$(warning) 250ms`
2. User clicks the indicator
3. Output channel opens with detailed report
4. Quick pick menu appears with actions
5. User selects "Measure Now" to retest
6. New measurement appears: `$(warning) 245ms`

### Scenario 3: Network Issues

1. Status bar shows: `$(error) ---ms` (red background)
2. Tooltip shows: "RPC Error: Network timeout"
3. User clicks indicator
4. Report shows: "Last Error: Network timeout"
5. User selects "Change RPC Endpoint"
6. Settings open to `stellarSuite.rpcUrl`
7. User updates URL, monitor restarts automatically

## Accessibility Features

### Screen Reader Support

- Status bar item has descriptive tooltip
- Output channel provides text-based report
- Quick pick menu is keyboard navigable
- All actions have clear labels

### Keyboard Navigation

- Status bar: Click or use keyboard to focus
- Quick pick: Arrow keys + Enter
- Output channel: Standard text navigation
- Settings: Standard VS Code keyboard shortcuts

### Visual Accessibility

- Icons + colors (not color-only)
- High contrast theme support
- Clear text labels
- Consistent with VS Code patterns

## Integration with Existing UI

### Status Bar Layout

```
Left Side:
  [$(globe) Stellar: testnet] [$(check) 45ms] [$(account) dev]
   └─ Network ──────────────┘  └─ Latency ─┘  └─ Identity ─┘

Right Side:
  [Notifications] [Errors] [Warnings] [Language] [Encoding] [EOL]
```

### Command Palette

```
> Kit Studio: Show Network Health
  Shows detailed RPC latency and health metrics

> Kit Studio: Switch Stellar Network
  Change active network (testnet, mainnet, etc.)
```

### Settings UI

```
Stellar Suite
├─ RPC URL
│  https://soroban-testnet.stellar.org:443
│  ↑ Latency monitor uses this endpoint
│
├─ Network
│  testnet
│  ↑ Displayed in status bar
│
└─ [Other settings...]
```

## Verification Checklist

For reviewers to verify the implementation:

- [ ] Status bar shows latency indicator
- [ ] Icon changes based on latency (✓/⚠/✗)
- [ ] Background color changes for warnings/errors
- [ ] Tooltip shows current latency and status
- [ ] Clicking opens network health report
- [ ] Report shows all required metrics
- [ ] Quick pick menu appears with actions
- [ ] "Measure Now" performs immediate test
- [ ] "Change RPC Endpoint" opens settings
- [ ] "Switch Network" opens network selector
- [ ] Automatic updates every 30 seconds
- [ ] Configuration changes trigger restart
- [ ] Test script runs successfully
- [ ] No console errors or warnings
- [ ] Accessible via keyboard
- [ ] Works in light and dark themes

## Screenshot Locations

For actual screenshots, capture:

1. **Status bar with green indicator** (< 100ms)
   - Full VS Code window
   - Highlight status bar area
   - Show tooltip on hover

2. **Status bar with orange indicator** (100-500ms)
   - Same view as above
   - Different latency value

3. **Status bar with red indicator** (> 500ms)
   - Same view as above
   - Show error state

4. **Network health report**
   - Output channel with full report
   - Quick pick menu visible

5. **Test script output**
   - Terminal window
   - Full test run results

6. **Settings integration**
   - VS Code settings UI
   - Stellar Suite section
   - RPC URL highlighted

## Notes for Documentation

- All screenshots should be taken in VS Code's default dark theme
- Ensure text is readable at standard documentation sizes
- Highlight interactive elements (clickable areas)
- Include cursor/hover states where relevant
- Show realistic latency values (not just perfect scenarios)
- Demonstrate both success and error states
