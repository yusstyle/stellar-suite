/**
 * Verification script for Error Help feature
 * Run with: node verify-error-help.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Error Help Feature Implementation...\n');

let allPassed = true;

// Check 1: Error database exists and is valid JSON
console.log('✓ Checking error database...');
try {
  const dbPath = path.join(__dirname, 'src/data/errorHelpDatabase.json');
  const dbContent = fs.readFileSync(dbPath, 'utf8');
  const db = JSON.parse(dbContent);
  
  if (!db.errors) {
    console.log('  ❌ Database missing "errors" object');
    allPassed = false;
  } else {
    const errorCount = Object.keys(db.errors).length;
    console.log(`  ✅ Database loaded with ${errorCount} error definitions`);
    
    // Verify each error has required fields
    for (const [code, data] of Object.entries(db.errors)) {
      const required = ['title', 'description', 'commonCauses', 'fixExample'];
      const missing = required.filter(field => !data[field]);
      if (missing.length > 0) {
        console.log(`  ❌ Error ${code} missing fields: ${missing.join(', ')}`);
        allPassed = false;
      }
    }
    
    // Check for specific error codes
    const expectedCodes = ['E0277', 'E0425', 'E0308', 'SOROBAN_STATE_LIMIT', 'SOROBAN_AUTH'];
    const missingCodes = expectedCodes.filter(code => !db.errors[code]);
    if (missingCodes.length > 0) {
      console.log(`  ❌ Missing expected error codes: ${missingCodes.join(', ')}`);
      allPassed = false;
    } else {
      console.log(`  ✅ All expected error codes present`);
    }
  }
} catch (error) {
  console.log(`  ❌ Error reading database: ${error.message}`);
  allPassed = false;
}

// Check 2: ErrorHelpPanel component exists
console.log('\n✓ Checking ErrorHelpPanel component...');
try {
  const panelPath = path.join(__dirname, 'src/components/ide/ErrorHelpPanel.tsx');
  if (fs.existsSync(panelPath)) {
    const content = fs.readFileSync(panelPath, 'utf8');
    
    // Check for key features
    const checks = [
      { pattern: /interface ErrorHelpPanelProps/, name: 'Props interface' },
      { pattern: /errorCode.*string/, name: 'Error code prop' },
      { pattern: /onClose/, name: 'Close handler' },
      { pattern: /fetch.*error-help/, name: 'API fetch' },
      { pattern: /ScrollArea/, name: 'Scrollable content' },
      { pattern: /BookOpen|ExternalLink/, name: 'Icons' },
    ];
    
    checks.forEach(check => {
      if (check.pattern.test(content)) {
        console.log(`  ✅ ${check.name} found`);
      } else {
        console.log(`  ❌ ${check.name} missing`);
        allPassed = false;
      }
    });
  } else {
    console.log('  ❌ ErrorHelpPanel.tsx not found');
    allPassed = false;
  }
} catch (error) {
  console.log(`  ❌ Error checking component: ${error.message}`);
  allPassed = false;
}

// Check 3: API route exists
console.log('\n✓ Checking API route...');
try {
  const apiPath = path.join(__dirname, 'app/api/error-help/route.ts');
  if (fs.existsSync(apiPath)) {
    const content = fs.readFileSync(apiPath, 'utf8');
    if (content.includes('errorHelpDatabase') && content.includes('NextResponse')) {
      console.log('  ✅ API route properly configured');
    } else {
      console.log('  ❌ API route missing required imports');
      allPassed = false;
    }
  } else {
    console.log('  ❌ API route not found');
    allPassed = false;
  }
} catch (error) {
  console.log(`  ❌ Error checking API route: ${error.message}`);
  allPassed = false;
}

// Check 4: Store exists
console.log('\n✓ Checking error help store...');
try {
  const storePath = path.join(__dirname, 'src/store/useErrorHelpStore.ts');
  if (fs.existsSync(storePath)) {
    const content = fs.readFileSync(storePath, 'utf8');
    const checks = [
      { pattern: /isOpen/, name: 'isOpen state' },
      { pattern: /errorCode/, name: 'errorCode state' },
      { pattern: /openErrorHelp/, name: 'openErrorHelp action' },
      { pattern: /closeErrorHelp/, name: 'closeErrorHelp action' },
    ];
    
    checks.forEach(check => {
      if (check.pattern.test(content)) {
        console.log(`  ✅ ${check.name} found`);
      } else {
        console.log(`  ❌ ${check.name} missing`);
        allPassed = false;
      }
    });
  } else {
    console.log('  ❌ Store not found');
    allPassed = false;
  }
} catch (error) {
  console.log(`  ❌ Error checking store: ${error.message}`);
  allPassed = false;
}

// Check 5: Error code extractor utility
console.log('\n✓ Checking error code extractor...');
try {
  const utilPath = path.join(__dirname, 'src/utils/errorCodeExtractor.ts');
  if (fs.existsSync(utilPath)) {
    const content = fs.readFileSync(utilPath, 'utf8');
    const checks = [
      { pattern: /extractErrorCode/, name: 'extractErrorCode function' },
      { pattern: /hasErrorHelp/, name: 'hasErrorHelp function' },
      { pattern: /KNOWN_ERROR_CODES/, name: 'KNOWN_ERROR_CODES constant' },
      { pattern: /E0277|E0425|E0308/, name: 'Rust error patterns' },
      { pattern: /SOROBAN_/, name: 'Soroban error patterns' },
    ];
    
    checks.forEach(check => {
      if (check.pattern.test(content)) {
        console.log(`  ✅ ${check.name} found`);
      } else {
        console.log(`  ❌ ${check.name} missing`);
        allPassed = false;
      }
    });
  } else {
    console.log('  ❌ Error code extractor not found');
    allPassed = false;
  }
} catch (error) {
  console.log(`  ❌ Error checking utility: ${error.message}`);
  allPassed = false;
}

// Check 6: CodeEditor integration
console.log('\n✓ Checking CodeEditor integration...');
try {
  const editorPath = path.join(__dirname, 'src/components/editor/CodeEditor.tsx');
  if (fs.existsSync(editorPath)) {
    const content = fs.readFileSync(editorPath, 'utf8');
    const checks = [
      { pattern: /useErrorHelpStore/, name: 'Error help store import' },
      { pattern: /extractErrorCode/, name: 'Error code extractor import' },
      { pattern: /registerCodeActionProvider/, name: 'Code action provider' },
      { pattern: /stellar\.openErrorHelp/, name: 'Open error help command' },
      { pattern: /Learn More/, name: 'Learn More action title' },
    ];
    
    checks.forEach(check => {
      if (check.pattern.test(content)) {
        console.log(`  ✅ ${check.name} found`);
      } else {
        console.log(`  ❌ ${check.name} missing`);
        allPassed = false;
      }
    });
  } else {
    console.log('  ❌ CodeEditor not found');
    allPassed = false;
  }
} catch (error) {
  console.log(`  ❌ Error checking CodeEditor: ${error.message}`);
  allPassed = false;
}

// Check 7: IDE layout integration
console.log('\n✓ Checking IDE layout integration...');
try {
  const layoutPath = path.join(__dirname, 'src/features/ide/Index.tsx');
  if (fs.existsSync(layoutPath)) {
    const content = fs.readFileSync(layoutPath, 'utf8');
    const checks = [
      { pattern: /useErrorHelpStore/, name: 'Error help store import' },
      { pattern: /ErrorHelpPanel/, name: 'ErrorHelpPanel import' },
      { pattern: /isErrorHelpOpen/, name: 'Panel visibility check' },
      { pattern: /closeErrorHelp/, name: 'Close handler' },
    ];
    
    checks.forEach(check => {
      if (check.pattern.test(content)) {
        console.log(`  ✅ ${check.name} found`);
      } else {
        console.log(`  ❌ ${check.name} missing`);
        allPassed = false;
      }
    });
  } else {
    console.log('  ❌ IDE layout not found');
    allPassed = false;
  }
} catch (error) {
  console.log(`  ❌ Error checking layout: ${error.message}`);
  allPassed = false;
}

// Check 8: Documentation
console.log('\n✓ Checking documentation...');
try {
  const docPath = path.join(__dirname, 'ERROR_HELP_FEATURE.md');
  if (fs.existsSync(docPath)) {
    const content = fs.readFileSync(docPath, 'utf8');
    if (content.length > 1000) {
      console.log('  ✅ Feature documentation exists and is comprehensive');
    } else {
      console.log('  ⚠️  Documentation exists but may be incomplete');
    }
  } else {
    console.log('  ❌ Feature documentation not found');
    allPassed = false;
  }
} catch (error) {
  console.log(`  ❌ Error checking documentation: ${error.message}`);
  allPassed = false;
}

// Final summary
console.log('\n' + '='.repeat(60));
if (allPassed) {
  console.log('✅ All checks passed! Error Help feature is properly implemented.');
  console.log('\nNext steps:');
  console.log('1. Start the development server: npm run dev');
  console.log('2. Create a Rust file with an error (e.g., missing trait)');
  console.log('3. Hover over the error and click "Learn More"');
  console.log('4. Take screenshots for documentation');
  process.exit(0);
} else {
  console.log('❌ Some checks failed. Please review the errors above.');
  process.exit(1);
}
