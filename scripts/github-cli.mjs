import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { access, chmod, mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { userInfo } from 'node:os';
import { join, win32 } from 'node:path';
import { root } from './lib.mjs';
import { providers } from './providers.mjs';

// Archive digests from https://github.com/cli/cli/releases/tag/v2.104.0
const version = '2.104.0';
const archives = {
  linux_amd64: '98cb101ad87dbbd3f6b2f2bfcbd43197ccd07643140121d8a9cfaa91eadbc24e',
  linux_arm64: 'cb34cefc6f4e77b90731374a2b737516bb8f3033c6ca46aa949e5344f68069e3',
  linux_386: 'c786883d42b71a305618a0b9ac129af2b90f27063106b3ba7ca185fea66da972',
  macOS_amd64: 'a8c2a708dbae89dc7c05ba7b0beafc95bd8d09ab4a3505467b77d32ebf364dc6',
  macOS_arm64: '23b12706219b9892e44236f988444a24adcf29284e16b35e03ba5b863fb6eb8e',
  windows_386: '42655919c4ed39f3c03f58fcfc151665876c842d19a0699cf87fac1509f187ac',
  windows_amd64: '08c06d10482f12c478018cd259f64acbd5f625712cadf331aad19ba973c879e5',
  windows_arm64: 'd56fbf5b9ad32e5985e3e7e1d8f4d28ae2994618986cd2cba9b50ac710dffe01',
};

export function githubCliEnvironment(environment, platform = process.platform) {
  const excluded = new Set([...Object.values(providers).flatMap(p => p.secrets), 'LLM_API_KEY', 'GH_TOKEN', 'GITHUB_TOKEN']);
  const windows = platform === 'win32';
  const env = {};
  for (const [name, value] of Object.entries(environment)) {
    const key = windows ? name.toUpperCase() : name;
    if (!excluded.has(key)) env[key] = value;
  }
  const homeKey = windows ? 'USERPROFILE' : 'HOME';
  if (!env[homeKey]) {
    try { env[homeKey] = userInfo().homedir; }
    catch (error) {
      // Containers can run as a UID without a passwd entry. gh can still use a token or explicit config.
      if (error.info?.code !== 'ENOENT') throw error;
    }
  }
  if (windows && env.USERPROFILE && !env.APPDATA && !env.GH_CONFIG_DIR && !env.XDG_CONFIG_HOME &&
      !existsSync(win32.join(env.USERPROFILE, '.config', 'gh', 'hosts.yml'))) {
    // Native gh on Windows normally looks in roaming AppData. A stripped shell can omit it.
    env.APPDATA = win32.join(env.USERPROFILE, 'AppData', 'Roaming');
  }
  return env;
}

export function authenticateGitHub(executable, env, run = execFileSync) {
  try {
    // Probe the active account for this host. Other accounts can have expired credentials.
    run(executable, ['api', '--hostname', 'github.com', 'user', '--silent'], {
      env, stdio: ['ignore', 'ignore', 'pipe'], timeout: 120_000, windowsHide: true,
    });
    return;
  } catch (error) {
    const httpStatus = /\bHTTP (\d{3})\b/.exec(error.stderr ?? '')?.[1];
    if (error.status !== 4 && httpStatus !== '401') {
      const reason = httpStatus ? 'HTTP ' + httpStatus : error.code ?? 'exit ' + error.status;
      throw new Error(`Could not check the active GitHub account (${reason}). Run gh api --hostname github.com user --silent in the same terminal for details.`);
    }
    if (env.GH_TOKEN) throw new Error('GitHub did not accept GH_TOKEN. Check its value in .env or your shell.');
  }
  console.log('Authenticate the repository administrator with GitHub CLI.');
  run(executable, ['auth', 'login', '--hostname', 'github.com'], { env, stdio: 'inherit' });
}

export async function githubCli(env) {
  const installed = spawnSync('gh', ['--version'], { env, encoding: 'utf8', windowsHide: true });
  if (installed.status === 0) return 'gh';
  const platform = { linux: 'linux', darwin: 'macOS', win32: 'windows' }[process.platform];
  const arch = { x64: 'amd64', arm64: 'arm64', ia32: '386' }[process.arch];
  const target = `${platform}_${arch}`;
  if (!archives[target]) throw new Error(`Install GitHub CLI for ${process.platform}/${process.arch} to run the hosted demo.`);
  const cache = join(root, '.tools', `gh-${version}-${target}`);
  const binary = platform === 'windows' ? 'gh.exe' : 'gh';
  const executable = join(cache, binary);
  try { await access(executable); return executable; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }

  const archive = `gh_${version}_${target}.${platform === 'linux' ? 'tar.gz' : 'zip'}`;
  console.log(`Downloading GitHub CLI ${version} for ${target}.`);
  const response = await fetch(`https://github.com/cli/cli/releases/download/v${version}/${archive}`,
    { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`GitHub CLI download failed (HTTP ${response.status}).`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (createHash('sha256').update(bytes).digest('hex') !== archives[target]) throw new Error('GitHub CLI archive checksum mismatch.');

  await mkdir(cache, { recursive: true });
  const staging = await mkdtemp(join(cache, 'download-'));
  try {
    const file = join(staging, archive);
    await writeFile(file, bytes);
    // Windows and macOS ship bsdtar (including ZIP support). Linux releases use tar.gz.
    const entries = execFileSync('tar', ['-tf', file], { env, encoding: 'utf8' }).split(/\r?\n/);
    const member = entries.find(name => name === binary || name.endsWith(`/bin/${binary}`) || name === `bin/${binary}`);
    if (!member) throw new Error('GitHub CLI executable missing from the verified archive.');
    execFileSync('tar', ['-xf', file, '-C', staging, member], { env });
    const unpacked = join(staging, member);
    await chmod(unpacked, 0o755);
    try { await rename(unpacked, executable); }
    catch (error) {
      // A concurrent setup can have already installed (and started) the same version on Windows.
      if (!['EEXIST', 'EPERM'].includes(error.code)) throw error;
      await access(executable);
    }
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
  return executable;
}
