import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runScript(scriptName) {
    try {
        console.log(`\n🚀 Running ${scriptName}...`);
        const { stdout, stderr } = await execAsync(`node ${scriptName}`);
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
    } catch (error) {
        console.error(`Error running ${scriptName}:`, error);
    }
}

async function main() {
    console.log('🛒 E-COMMERCE DATA PIPELINE STARTING...\n');
    
    // Run in sequence
    await runScript('generate-data.js');
    await runScript('create-database.js'); 
    await runScript('run-queries.js');
    
    console.log('\n✅ PIPELINE COMPLETED SUCCESSFULLY!');
}

main();