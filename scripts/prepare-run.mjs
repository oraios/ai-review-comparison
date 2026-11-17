import { resolve } from 'node:path';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { readJson, writeJson, root } from './lib.mjs';
import { validatePricing } from '../demo/pricing.mjs';
import { validateImage } from './evidence.mjs';
import { assemblePrompt } from './review-prompt.mjs';

export async function prepareRun({ reviewer, inputPath, directory, imagePath = resolve(root, 'image/provenance.json'),
  image = process.env.REVIEW_IMAGE, local = false, serenaCommand, localExecution }) {
  const input = await readJson(inputPath);
  validatePricing(input.before); validatePricing(input.after);
  const settings = await readJson(resolve(root, 'reviewers', reviewer, 'config.json'));
  if (settings.status !== 'implemented' && reviewer !== 'local') throw new Error(`BLOCKED: ${settings.reason}`);
  const baked = local ? { marker: 'LOCAL_ONLY', revision: 'local', versions: {} } : await readJson(imagePath);
  const prompt = await assemblePrompt(reviewer, input, { local });
  const environment = { ...baked, image: image || 'local-no-image', platform: process.platform,
    arch: process.arch, node: process.version, reviewer, model: settings.model, effort: settings.effort,
    auth: settings.auth, promptSha256: prompt.sha256,
    imageRole: 'agent-and-mcp-tools',
    run: local ? 'local' : process.env.GITHUB_RUN_ID, attempt: local ? '1' : process.env.GITHUB_RUN_ATTEMPT,
    ...(localExecution ? { localExecution } : {}) };
  if (!local) validateImage(environment);
  await mkdir(resolve(directory, 'project/.serena'), { recursive: true });
  await mkdir(resolve(directory, 'agent-home'), { recursive: true });
  await writeJson(resolve(directory, 'input.json'), input);
  await writeJson(resolve(directory, 'environment.json'), environment);
  await writeJson(resolve(directory, 'project/pricing.json'), input.after);
  await copyFile(resolve(root, 'demo/pricing.mjs'), resolve(directory, 'project/pricing.mjs'));
  await copyFile(resolve(root, 'mcp/serena-project.yml'), resolve(directory, 'project/.serena/project.yml'));
  const runtime = {
    command: serenaCommand || '/opt/serena-venv/bin/serena',
    args: ['start-mcp-server', '--project', resolve(directory, 'project'), '--context', resolve(root, 'mcp/serena-context.yml'),
      '--agent-interface', 'tools', '--mode', 'one-shot', '--enable-web-dashboard', 'false',
      '--open-web-dashboard', 'false', '--enable-gui-log-window', 'false', '--log-level', 'ERROR'],
    source: 'https://github.com/oraios/serena/tree/6e5c3776d4e67befaab7c290bc29b0279c98d1ed',
  };
  await writeJson(resolve(directory, 'serena-runtime.json'), runtime);
  const template = await readJson(resolve(root, `reviewers/${reviewer}/mcp.template.json`));
  const substitutions = { '$NODE': process.execPath, '$LAUNCHER': resolve(root, 'mcp/launch.mjs'), '$RUN_DIRECTORY': directory };
  const configs = Object.fromEntries(Object.entries(template.mcpServers).map(([name, config]) => [name, {
    command: substitutions[config.command] ?? config.command,
    args: config.args.map(arg => substitutions[arg] ?? arg),
  }]));
  await writeJson(resolve(directory, 'mcp.json'), { mcpServers: configs });
  await writeJson(resolve(directory, 'copilot-mcp.json'), { mcpServers: Object.fromEntries(Object.entries(configs).map(([name, value]) => [name,
    { ...value, type: 'local', tools: name === 'project' ? ['review_context', 'run_checks', 'submit_review'] : ['list_dir'] }])) });
  await writeFile(resolve(directory, 'prompt.txt'), prompt.text);
  return environment;
}

if (process.argv[1] === import.meta.filename) {
  const [reviewer, inputPath, directory] = process.argv.slice(2);
  if (!reviewer || !inputPath || !directory) throw new Error('Usage: prepare-run.mjs REVIEWER INPUT RUN_DIRECTORY');
  await prepareRun({ reviewer, inputPath: resolve(inputPath), directory: resolve(directory) });
  console.log('Trusted fixture, isolated MCP homes and reviewer configuration prepared.');
}
