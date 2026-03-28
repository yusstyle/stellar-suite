import fs from 'fs';
import path from 'path';

function auditRustFiles(dir) {
    console.log("\n--- [Audit] Automated 'Require Auth' Checker (ESM version) ---");
    let results = [];

    function scan(currentPath) {
        const files = fs.readdirSync(currentPath);
        for (const file of files) {
            const fullPath = path.join(currentPath, file);
            if (fs.statSync(fullPath).isDirectory()) {
                // Ignore node_modules to keep it fast
                if (file !== 'node_modules' && file !== '.git') {
                    scan(fullPath);
                }
            } else if (file.endsWith('.rs')) {
                const content = fs.readFileSync(fullPath, 'utf8');
                // Heuristic: State change (storage) without auth check
                if (content.includes('env.storage()') && !content.includes('env.require_auth()')) {
                    console.log(`[SECURITY WARNING] ${file}: Potential missing auth check.`);
                    results.push(file);
                }
            }
        }
    }

    scan(dir);
    if (results.length === 0) {
        console.log("Heuristic Analysis: No probable unguarded functions found.");
    } else {
        console.log(`\nAudit Complete: Found ${results.length} potential vulnerabilities.`);
    }
}

auditRustFiles('.');