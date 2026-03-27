# Interaction Recorder & CLI Exporter

A comprehensive system for recording contract interactions in the IDE and exporting them as standalone CLI scripts for automated regression testing.

## Overview

The Interaction Recorder captures every contract call you make in the IDE, including:
- Contract IDs
- Function names
- Arguments
- Network configuration
- Signing identity
- Results (success/failure)

These recordings can then be exported as:
- **Bash scripts** using `stellar-cli` commands
- **JSON scenarios** for custom test runners

## Features

- **Automatic Recording**: Captures all contract interactions during a session
- **Multiple Export Formats**: Bash scripts or JSON scenarios
- **Assertion Generation**: Automatically includes success/failure checks
- **Argument Escaping**: Properly escapes complex arguments for CLI usage
- **Session Management**: Save, browse, and replay multiple recording sessions
- **README Generation**: Auto-generates documentation for exported scripts
- **Persistent Storage**: Sessions stored in IndexedDB

## Usage

### Starting a Recording

1. Open the Interact pane
2. Click the "Record" button
3. Optionally name your session
4. All subsequent contract calls will be captured automatically

### Recording Interactions

Simply use the IDE normally:
- Deploy contracts
- Invoke functions
- Run simulations

Every interaction is automatically recorded with full context.

### Stopping and Exporting

1. Click "Stop" to end the recording
2. Select export format (Bash or JSON)
3. Click "Export" to download the script
4. A README file is also generated automatically

## API Reference

### InteractionRecorder

Core recording functionality.

#### Methods

##### `startRecording(sessionName?: string): Promise<void>`
Start a new recording session.

```typescript
await interactionRecorder.startRecording('My Test Flow');
```

##### `stopRecording(): Promise<RecordingSession | null>`
Stop the current recording session and save it.

```typescript
const session = await interactionRecorder.stopRecording();
```

##### `recordInteraction(interaction: Omit<RecordedInteraction, 'id' | 'timestamp'>): Promise<void>`
Record a single interaction (called automatically by the IDE).

```typescript
await interactionRecorder.recordInteraction({
  contractId: 'CC...',
  functionName: 'transfer',
  args: '["recipient", "1000"]',
  argsArray: ['recipient', '1000'],
  network: 'testnet',
  networkPassphrase: 'Test SDF Network ; September 2015',
  rpcUrl: 'https://soroban-testnet.stellar.org',
  signerPublicKey: 'GA...',
  signerType: 'local-keypair',
  isSimulation: false,
  result: {
    success: true,
    output: 'Transfer successful',
  },
});
```

##### `getRecordingStatus(): boolean`
Check if currently recording.

##### `getCurrentSession(): RecordingSession | null`
Get the current active session.

##### `getAllSessions(): Promise<RecordingSession[]>`
Get all saved sessions.

##### `getSession(sessionId: string): Promise<RecordingSession | null>`
Get a specific session by ID.

##### `deleteSession(sessionId: string): Promise<void>`
Delete a session.

##### `clearAllSessions(): Promise<void>`
Delete all sessions.

##### `resumeRecording(): Promise<boolean>`
Resume a recording session after page refresh.

### CLIScriptGenerator

Script generation functionality.

#### Methods

##### `generateScript(session: RecordingSession, options?: CLIScriptOptions): GeneratedScript`
Generate a CLI script from a recording session.

```typescript
const script = cliScriptGenerator.generateScript(session, {
  format: 'bash',
  includeAssertions: true,
  includeComments: true,
});
```

Options:
- `format`: 'bash' or 'json'
- `includeAssertions`: Add success/failure checks
- `includeComments`: Add explanatory comments

##### `downloadScript(script: GeneratedScript): void`
Download a generated script as a file.

##### `generateReadme(session: RecordingSession): string`
Generate a README for the exported script.

## Components

### InteractionRecorder

Recording controls for the Interact pane.

```tsx
import { InteractionRecorder } from '@/components/ide/InteractionRecorder';

<InteractionRecorder />
```

Features:
- Record/Stop toggle
- Session naming
- Live interaction counter
- Export format selection
- Export button

### RecordingSessionsViewer

Browse and manage recorded sessions.

```tsx
import { RecordingSessionsViewer } from '@/components/ide/RecordingSessionsViewer';

<RecordingSessionsViewer />
```

Features:
- List all sessions
- Preview generated scripts
- View interaction details
- Export sessions
- Delete sessions

## Hooks

### useInteractionRecorder

React hook for recording management.

```tsx
import { useInteractionRecorder } from '@/hooks/useInteractionRecorder';

function MyComponent() {
  const {
    isRecording,
    currentSession,
    sessions,
    startRecording,
    stopRecording,
    recordInteraction,
    exportSession,
    generateScript,
  } = useInteractionRecorder();

  // Use the hook methods...
}
```

## Export Formats

### Bash Script

Generated bash scripts use the `stellar` CLI:

```bash
#!/bin/bash

set -e  # Exit on error

# Configuration
CONTRACT_1="CCABC123XYZ"
NETWORK="testnet"
RPC_URL="https://soroban-testnet.stellar.org"

# Check if stellar CLI is installed
if ! command -v stellar &> /dev/null; then
  echo "Error: stellar CLI is not installed"
  exit 1
fi

# Interaction 1: initialize
stellar contract invoke \
  --id $CONTRACT_1 \
  --network testnet \
  --source GABC123XYZ \
  -- initialize

# Assert: Interaction 1 succeeded
if [ $? -ne 0 ]; then
  echo "Error: Interaction 1 (initialize) failed"
  exit 1
fi

# Interaction 2: transfer
stellar contract invoke \
  --id $CONTRACT_1 \
  --network testnet \
  --source GABC123XYZ \
  -- transfer \
  --arg "recipient" \
  --arg "1000"

echo "✓ All interactions completed"
```

### JSON Scenario

JSON format for custom test runners:

```json
{
  "name": "Test Session",
  "description": "Recorded interaction session from 2026-03-27T12:00:00.000Z",
  "network": "testnet",
  "contracts": [
    {
      "id": "contract_1",
      "address": "CCABC123XYZ"
    }
  ],
  "interactions": [
    {
      "step": 1,
      "description": "initialize on CCABC123...",
      "contract": "contract_1",
      "function": "initialize",
      "args": [],
      "signer": "GABC123XYZ",
      "simulation": false,
      "expectedResult": {
        "success": true
      }
    },
    {
      "step": 2,
      "description": "transfer on CCABC123...",
      "contract": "contract_1",
      "function": "transfer",
      "args": ["recipient", "1000"],
      "signer": "GABC123XYZ",
      "simulation": false,
      "expectedResult": {
        "success": true
      }
    }
  ]
}
```

## Integration with IDE

### Add Recording Controls to Interact Pane

```tsx
// In ContractPanel.tsx or similar
import { InteractionRecorder } from '@/components/ide/InteractionRecorder';

<div className="interact-pane">
  {/* Existing interact form */}
  
  {/* Add at the bottom */}
  <InteractionRecorder />
</div>
```

### Capture Interactions Automatically

```tsx
// In your invoke handler
import { interactionRecorder } from '@/lib/testing/interactionRecorder';

const handleInvoke = async (fnName: string, args: string) => {
  try {
    const result = await executeTransaction({
      contractId,
      fnName,
      args,
      // ... other params
    });

    // Record the interaction
    await interactionRecorder.recordInteraction({
      contractId,
      functionName: fnName,
      args,
      argsArray: JSON.parse(args),
      network,
      networkPassphrase,
      rpcUrl,
      signerPublicKey,
      signerType: 'local-keypair',
      isSimulation: false,
      result: {
        success: true,
        output: JSON.stringify(result),
        hash: result.hash,
      },
    });
  } catch (error) {
    // Record failed interaction
    await interactionRecorder.recordInteraction({
      contractId,
      functionName: fnName,
      args,
      argsArray: JSON.parse(args),
      network,
      networkPassphrase,
      rpcUrl,
      signerPublicKey,
      signerType: 'local-keypair',
      isSimulation: false,
      result: {
        success: false,
        output: '',
        error: error.message,
      },
    });
  }
};
```

## Use Cases

### 1. Regression Testing

Record a complete user flow once, then replay it automatically after every code change:

```bash
# Record in IDE
1. Deploy contract
2. Initialize with parameters
3. Execute 10 different operations
4. Export as bash script

# Run in CI/CD
./recorded-flow.sh
```

### 2. Bug Reproduction

Capture the exact sequence that triggers a bug:

```bash
# Record the bug scenario
1. Start recording
2. Reproduce the bug
3. Stop and export

# Share with team
./bug-reproduction.sh
```

### 3. Integration Testing

Create comprehensive test suites:

```bash
# Record different scenarios
- Happy path flow
- Error handling flow
- Edge cases flow

# Run all scenarios
./happy-path.sh
./error-handling.sh
./edge-cases.sh
```

### 4. Documentation

Generate executable examples for documentation:

```bash
# Record tutorial steps
1. Deploy token contract
2. Mint tokens
3. Transfer tokens
4. Check balance

# Export as example
./token-tutorial.sh
```

## Best Practices

### 1. Name Your Sessions Descriptively

```typescript
// Good
await startRecording('Token Transfer Flow');
await startRecording('Multi-Contract Interaction');

// Bad
await startRecording('Test 1');
await startRecording('Recording');
```

### 2. Keep Sessions Focused

Record one logical flow per session rather than mixing unrelated operations.

### 3. Review Before Exporting

Check the preview to ensure all interactions were captured correctly.

### 4. Update Contract IDs

When running exported scripts on different networks, update the contract ID variables:

```bash
# Update these before running
CONTRACT_1="CC_YOUR_NEW_CONTRACT_ID"
```

### 5. Verify Prerequisites

Ensure the target environment has:
- Stellar CLI installed
- Configured identity
- Network access
- Sufficient balance for fees

## Troubleshooting

### Recording Not Starting

**Problem**: Click "Record" but nothing happens

**Solution**: Check browser console for errors. Ensure IndexedDB is available.

### Interactions Not Being Captured

**Problem**: Recording is active but interactions aren't saved

**Solution**: Ensure `recordInteraction()` is called in your invoke handler.

### Exported Script Fails

**Problem**: Generated bash script returns errors

**Solution**: 
- Verify stellar CLI is installed: `stellar --version`
- Check contract IDs are correct
- Ensure signer account exists and has balance
- Verify network configuration

### Arguments Not Escaped Properly

**Problem**: Complex arguments cause script errors

**Solution**: The generator handles escaping automatically. If issues persist, check the JSON export format instead.

## Advanced Features

### Custom Script Templates

Extend the generator for custom formats:

```typescript
class CustomScriptGenerator extends CLIScriptGenerator {
  generatePythonScript(session: RecordingSession): GeneratedScript {
    // Custom implementation
  }
}
```

### Filtering Interactions

Export only specific interactions:

```typescript
const filteredSession = {
  ...session,
  interactions: session.interactions.filter(i => 
    i.functionName === 'transfer'
  ),
};

const script = generateScript(filteredSession);
```

### Adding Custom Assertions

Modify the generated script to add custom checks:

```bash
# After export, add custom assertions
stellar contract invoke ... -- transfer
RESULT=$?
if [ $RESULT -ne 0 ]; then
  echo "Transfer failed"
  exit 1
fi

# Check balance
BALANCE=$(stellar contract invoke ... -- balance)
if [ "$BALANCE" -lt 1000 ]; then
  echo "Balance too low"
  exit 1
fi
```

## Storage

Recording sessions are stored in IndexedDB with the following structure:

```typescript
{
  id: string;                    // Unique session ID
  name: string;                  // User-provided name
  startedAt: string;             // ISO timestamp
  endedAt?: string;              // ISO timestamp
  interactions: RecordedInteraction[];
  metadata: {
    network: string;             // Network name
    contractIds: string[];       // All contracts used
    totalInteractions: number;   // Count
  };
}
```

Each interaction includes:

```typescript
{
  id: string;                    // Unique interaction ID
  timestamp: string;             // ISO timestamp
  contractId: string;            // Contract address
  functionName: string;          // Function name
  args: string;                  // Raw JSON args
  argsArray: unknown[];          // Parsed args
  network: string;               // Network name
  networkPassphrase: string;     // Network passphrase
  rpcUrl: string;                // RPC endpoint
  signerPublicKey: string;       // Signer address
  signerType: 'local-keypair' | 'web-wallet';
  isSimulation: boolean;         // Read-only call
  result?: {
    success: boolean;
    output: string;
    hash?: string;
    error?: string;
  };
}
```

## Future Enhancements

- [ ] Replay recorded sessions in the IDE
- [ ] Edit interactions before export
- [ ] Import sessions from JSON
- [ ] Share sessions between team members
- [ ] CI/CD integration templates
- [ ] Performance metrics in recordings
- [ ] Parallel execution support
- [ ] Custom assertion templates
