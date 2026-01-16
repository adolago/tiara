import { promises as fs } from 'node:fs';
import { Command } from '../commander-fix.js';
import chalk from 'chalk';
import { generateId } from '../../utils/helpers.js';
import { getAgentCoreClient } from '../../agent-core/index.js';
export const claudeCommand = new Command().name('claude').description('Manage Claude instances').action(()=>{
    claudeCommand.help();
});
claudeCommand.command('spawn').description('Spawn a new Claude instance with specific configuration').arguments('<task>').option('-t, --tools <tools>', 'Allowed tools (comma-separated)', 'View,Edit,Replace,GlobTool,GrepTool,LS,Bash').option('--no-permissions', 'Use --dangerously-skip-permissions flag').option('-c, --config <config>', 'MCP config file path').option('-m, --mode <mode>', 'Development mode (full, backend-only, frontend-only, api-only)', 'full').option('--parallel', 'Enable parallel execution with BatchTool').option('--research', 'Enable web research with WebFetchTool').option('--coverage <coverage>', 'Test coverage target', '80').option('--commit <frequency>', 'Commit frequency (phase, feature, manual)', 'phase').option('-v, --verbose', 'Enable verbose output').option('--dry-run', 'Show what would be executed without running').action(async (task, options)=>{
    try {
        const instanceId = generateId('claude');
        let tools = options.tools;
        if (options.parallel && !tools.includes('BatchTool')) {
            tools += ',BatchTool,dispatch_agent';
        }
        if (options.research && !tools.includes('WebFetchTool')) {
            tools += ',WebFetchTool';
        }
        if (options.dryRun) {
            console.log(chalk.yellow('DRY RUN - Would execute via daemon:'));
            console.log('\nConfiguration:');
            console.log(`  Instance ID: ${instanceId}`);
            console.log(`  Task: ${task}`);
            console.log(`  Tools: ${tools}`);
            console.log(`  Mode: ${options.mode}`);
            console.log(`  Coverage: ${parseInt(options.coverage)}%`);
            console.log(`  Commit: ${options.commit}`);
            console.log(`  Persona: zee (default)`);
            return;
        }
        console.log(chalk.green(`Spawning Claude instance: ${instanceId}`));
        console.log(chalk.gray(`Task: ${task}`));
        console.log(chalk.gray(`Tools: ${tools}`));
        console.log(chalk.gray(`Routing to persona: zee`));
        const client = getAgentCoreClient();
        await client.ensureConnected();
        const session = await client.createSession({
            title: instanceId
        });
        const callbacks = {
            onText: (text)=>process.stdout.write(text),
            onReasoning: (text)=>{
                if (options.verbose) {
                    console.log(chalk.dim(`[reasoning] ${text}`));
                }
            },
            onToolStart: (tool)=>{
                if (options.verbose) {
                    console.log(chalk.cyan(`[tool] ${tool}...`));
                }
            },
            onToolEnd: (tool, _result)=>{
                if (options.verbose) {
                    console.log(chalk.green(`[tool] ${tool} completed`));
                }
            },
            onError: (err)=>{
                console.error(chalk.red(`Error: ${err.message}`));
            }
        };
        const result = await client.prompt({
            sessionId: session.id,
            prompt: task,
            persona: 'zee'
        }, callbacks);
        try {
            await client.deleteSession(session.id);
        } catch  {}
        if (result.success) {
            console.log();
            console.log(chalk.green(`Claude instance ${instanceId} completed successfully`));
        } else {
            console.log(chalk.red(`Claude instance ${instanceId} failed: ${result.error ?? 'Unknown error'}`));
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('daemon not running')) {
            console.error(chalk.red('agent-core daemon not running. Start it with:'));
            console.log(chalk.yellow('  agent-core daemon'));
        } else {
            console.error(chalk.red('Failed to spawn Claude:'), message);
        }
    }
});
claudeCommand.command('batch').description('Spawn multiple Claude instances from workflow').arguments('<workflow-file>').option('--dry-run', 'Show what would be executed without running').action(async (workflowFile, options)=>{
    try {
        const content = await fs.readFile(workflowFile, 'utf-8');
        const workflow = JSON.parse(content);
        console.log(chalk.green('Loading workflow:'), workflow.name || 'Unnamed');
        console.log(chalk.gray(`Tasks: ${workflow.tasks?.length || 0}`));
        if (!workflow.tasks || workflow.tasks.length === 0) {
            console.log(chalk.yellow('No tasks found in workflow'));
            return;
        }
        const client = getAgentCoreClient();
        await client.ensureConnected();
        for (const task of workflow.tasks){
            const taskPrompt = task.description || task.name;
            const taskId = task.id || generateId('task');
            if (options.dryRun) {
                console.log(chalk.yellow(`\nDRY RUN - Task: ${task.name || task.id}`));
                console.log(chalk.gray(`  Prompt: ${taskPrompt}`));
                console.log(chalk.gray(`  Persona: ${task.persona || 'zee'}`));
            } else {
                console.log(chalk.blue(`\nExecuting task: ${task.name || task.id}`));
                const session = await client.createSession({
                    title: `batch-${taskId}`
                });
                const callbacks = {
                    onText: (text)=>process.stdout.write(text),
                    onError: (err)=>console.error(chalk.red(`Error: ${err.message}`))
                };
                const result = await client.prompt({
                    sessionId: session.id,
                    prompt: taskPrompt,
                    persona: task.persona || 'zee'
                }, callbacks);
                try {
                    await client.deleteSession(session.id);
                } catch  {}
                if (result.success) {
                    console.log(chalk.green(`\nTask ${taskId} completed successfully`));
                } else {
                    console.log(chalk.red(`\nTask ${taskId} failed: ${result.error ?? 'Unknown error'}`));
                }
            }
        }
        if (!options.dryRun) {
            console.log(chalk.green('\nWorkflow completed'));
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('daemon not running')) {
            console.error(chalk.red('agent-core daemon not running. Start it with:'));
            console.log(chalk.yellow('  agent-core daemon'));
        } else {
            console.error(chalk.red('Failed to process workflow:'), message);
        }
    }
});

//# sourceMappingURL=claude.js.map