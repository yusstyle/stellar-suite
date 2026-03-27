import type { RecordingSession, RecordedInteraction } from './interactionRecorder';

export interface CLIScriptOptions {
  format: 'bash' | 'json';
  includeAssertions: boolean;
  includeComments: boolean;
}

export interface GeneratedScript {
  content: string;
  filename: string;
  format: 'bash' | 'json';
}

class CLIScriptGenerator {
  /**
   * Generate a CLI script from a recording session
   */
  generateScript(
    session: RecordingSession,
    options: CLIScriptOptions = {
      format: 'bash',
      includeAssertions: true,
      includeComments: true,
    }
  ): GeneratedScript {
    if (options.format === 'bash') {
      return this.generateBashScript(session, options);
    } else {
      return this.generateJsonScenario(session, options);
    }
  }

  /**
   * Generate a Bash script using stellar-cli
   */
  private generateBashScript(
    session: RecordingSession,
    options: CLIScriptOptions
  ): GeneratedScript {
    const lines: string[] = [];

    // Header
    lines.push('#!/bin/bash');
    lines.push('');
    
    if (options.includeComments) {
      lines.push(`# Recorded Interaction Session: ${session.name}`);
      lines.push(`# Generated: ${new Date().toISOString()}`);
      lines.push(`# Network: ${session.metadata.network}`);
      lines.push(`# Total Interactions: ${session.metadata.totalInteractions}`);
      lines.push('');
    }

    // Error handling
    lines.push('set -e  # Exit on error');
    lines.push('');

    // Variables
    if (options.includeComments) {
      lines.push('# Configuration');
    }
    
    const uniqueContractIds = session.metadata.contractIds;
    uniqueContractIds.forEach((contractId, index) => {
      lines.push(`CONTRACT_${index + 1}="${contractId}"`);
    });

    const firstInteraction = session.interactions[0];
    if (firstInteraction) {
      lines.push(`NETWORK="${firstInteraction.network}"`);
      lines.push(`RPC_URL="${firstInteraction.rpcUrl}"`);
      lines.push(`NETWORK_PASSPHRASE="${firstInteraction.networkPassphrase}"`);
    }

    lines.push('');

    if (options.includeComments) {
      lines.push('# Check if stellar CLI is installed');
    }
    lines.push('if ! command -v stellar &> /dev/null; then');
    lines.push('  echo "Error: stellar CLI is not installed"');
    lines.push('  echo "Install from: https://developers.stellar.org/docs/tools/developer-tools"');
    lines.push('  exit 1');
    lines.push('fi');
    lines.push('');

    // Interactions
    if (options.includeComments) {
      lines.push('# Recorded Interactions');
      lines.push('');
    }

    session.interactions.forEach((interaction, index) => {
      if (options.includeComments) {
        lines.push(`# Interaction ${index + 1}: ${interaction.functionName}`);
        lines.push(`# Timestamp: ${interaction.timestamp}`);
        lines.push(`# Signer: ${interaction.signerPublicKey}`);
      }

      const contractVarIndex = uniqueContractIds.indexOf(interaction.contractId) + 1;
      const contractVar = `$CONTRACT_${contractVarIndex}`;

      // Build the stellar CLI command
      const parts: string[] = ['stellar', 'contract', 'invoke'];

      // Add contract ID
      parts.push(`--id ${contractVar}`);

      // Add network
      if (interaction.network === 'local') {
        parts.push('--network standalone');
      } else {
        parts.push(`--network ${interaction.network}`);
      }

      // Add RPC URL if custom
      if (interaction.rpcUrl && interaction.network === 'local') {
        parts.push(`--rpc-url "${interaction.rpcUrl}"`);
      }

      // Add source account
      parts.push(`--source ${interaction.signerPublicKey}`);

      // Add function name
      parts.push(`-- ${interaction.functionName}`);

      // Add arguments
      if (interaction.argsArray && interaction.argsArray.length > 0) {
        interaction.argsArray.forEach(arg => {
          const escaped = this.escapeArgument(arg);
          parts.push(`--${escaped.name} ${escaped.value}`);
        });
      }

      const command = parts.join(' \\\n  ');
      
      if (interaction.isSimulation) {
        if (options.includeComments) {
          lines.push('# Simulation only (read-only call)');
        }
        lines.push(`RESULT_${index + 1}=$(${command})`);
      } else {
        lines.push(command);
      }

      // Add assertion if enabled
      if (options.includeAssertions && interaction.result) {
        lines.push('');
        if (interaction.result.success) {
          lines.push(`# Assert: Interaction ${index + 1} succeeded`);
          lines.push('if [ $? -ne 0 ]; then');
          lines.push(`  echo "Error: Interaction ${index + 1} (${interaction.functionName}) failed"`);
          lines.push('  exit 1');
          lines.push('fi');
        } else {
          lines.push(`# Assert: Interaction ${index + 1} was expected to fail`);
          lines.push('if [ $? -eq 0 ]; then');
          lines.push(`  echo "Error: Interaction ${index + 1} (${interaction.functionName}) should have failed"`);
          lines.push('  exit 1');
          lines.push('fi');
        }
      }

      lines.push('');
    });

    // Footer
    if (options.includeComments) {
      lines.push('# All interactions completed successfully');
    }
    lines.push('echo "✓ All interactions completed"');

    const filename = `${this.sanitizeFilename(session.name)}.sh`;
    return {
      content: lines.join('\n'),
      filename,
      format: 'bash',
    };
  }

  /**
   * Generate a JSON scenario file
   */
  private generateJsonScenario(
    session: RecordingSession,
    options: CLIScriptOptions
  ): GeneratedScript {
    const scenario = {
      name: session.name,
      description: `Recorded interaction session from ${session.startedAt}`,
      network: session.metadata.network,
      contracts: session.metadata.contractIds.map((id, index) => ({
        id: `contract_${index + 1}`,
        address: id,
      })),
      interactions: session.interactions.map((interaction, index) => ({
        step: index + 1,
        description: `${interaction.functionName} on ${interaction.contractId.substring(0, 8)}...`,
        contract: `contract_${session.metadata.contractIds.indexOf(interaction.contractId) + 1}`,
        function: interaction.functionName,
        args: interaction.argsArray,
        signer: interaction.signerPublicKey,
        simulation: interaction.isSimulation,
        ...(options.includeAssertions && interaction.result
          ? {
              expectedResult: {
                success: interaction.result.success,
                ...(interaction.result.error && { error: interaction.result.error }),
              },
            }
          : {}),
      })),
    };

    const filename = `${this.sanitizeFilename(session.name)}.json`;
    return {
      content: JSON.stringify(scenario, null, 2),
      filename,
      format: 'json',
    };
  }

  /**
   * Escape and format CLI arguments
   */
  private escapeArgument(arg: unknown): { name: string; value: string } {
    if (typeof arg === 'string') {
      // Simple string argument
      return {
        name: 'arg',
        value: `"${arg.replace(/"/g, '\\"')}"`,
      };
    }

    if (typeof arg === 'number') {
      return {
        name: 'arg',
        value: arg.toString(),
      };
    }

    if (typeof arg === 'boolean') {
      return {
        name: 'arg',
        value: arg.toString(),
      };
    }

    if (arg === null || arg === undefined) {
      return {
        name: 'arg',
        value: 'null',
      };
    }

    // Complex object - serialize as JSON
    const json = JSON.stringify(arg);
    return {
      name: 'arg',
      value: `'${json.replace(/'/g, "\\'")}'`,
    };
  }

  /**
   * Sanitize filename for safe file system usage
   */
  private sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }

  /**
   * Export session as downloadable file
   */
  downloadScript(script: GeneratedScript): void {
    const blob = new Blob([script.content], {
      type: script.format === 'bash' ? 'text/x-shellscript' : 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = script.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate a README for the exported script
   */
  generateReadme(session: RecordingSession): string {
    const lines: string[] = [];

    lines.push(`# ${session.name}`);
    lines.push('');
    lines.push('## Overview');
    lines.push('');
    lines.push(`This script was recorded from the Stellar IDE on ${new Date(session.startedAt).toLocaleString()}.`);
    lines.push(`It contains ${session.metadata.totalInteractions} contract interaction(s) for regression testing.`);
    lines.push('');
    lines.push('## Prerequisites');
    lines.push('');
    lines.push('- Stellar CLI installed: https://developers.stellar.org/docs/tools/developer-tools');
    lines.push(`- Network: ${session.metadata.network}`);
    lines.push('- Configured identity with sufficient balance');
    lines.push('');
    lines.push('## Contracts');
    lines.push('');
    session.metadata.contractIds.forEach((id, index) => {
      lines.push(`${index + 1}. \`${id}\``);
    });
    lines.push('');
    lines.push('## Usage');
    lines.push('');
    lines.push('### Bash Script');
    lines.push('');
    lines.push('```bash');
    lines.push('chmod +x script.sh');
    lines.push('./script.sh');
    lines.push('```');
    lines.push('');
    lines.push('### JSON Scenario');
    lines.push('');
    lines.push('Use with your custom test runner or CI/CD pipeline.');
    lines.push('');
    lines.push('## Interactions');
    lines.push('');
    session.interactions.forEach((interaction, index) => {
      lines.push(`### ${index + 1}. ${interaction.functionName}`);
      lines.push('');
      lines.push(`- **Contract**: \`${interaction.contractId}\``);
      lines.push(`- **Type**: ${interaction.isSimulation ? 'Simulation' : 'Write Transaction'}`);
      lines.push(`- **Signer**: \`${interaction.signerPublicKey}\``);
      if (interaction.argsArray.length > 0) {
        lines.push(`- **Arguments**: \`${JSON.stringify(interaction.argsArray)}\``);
      }
      if (interaction.result) {
        lines.push(`- **Result**: ${interaction.result.success ? '✓ Success' : '✗ Failed'}`);
      }
      lines.push('');
    });

    lines.push('## Notes');
    lines.push('');
    lines.push('- Ensure all contracts are deployed before running the script');
    lines.push('- Update contract IDs in the script if deploying to a different network');
    lines.push('- Verify the signer account has sufficient balance for transaction fees');
    lines.push('');

    return lines.join('\n');
  }
}

// Singleton instance
export const cliScriptGenerator = new CLIScriptGenerator();
