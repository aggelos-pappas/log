import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const docsDir = join(root, 'docs', 'platforms', 'facebook');
const indexPath = join(docsDir, 'operations.json');
const problems = [];

if (!existsSync(indexPath)) {
  console.error('client docs: docs/platforms/facebook/operations.json is missing. Run `log capture docs`.');
  process.exit(1);
}
const index = JSON.parse(readFileSync(indexPath, 'utf8'));
const listed = new Set(index.operations.map((o) => o.doc));
if ('builtAt' in index) problems.push('operations.json: carries builtAt; when the docs were built is kept in log.db, not in the repo');

for (const operation of index.operations) {
  const path = join(docsDir, operation.doc);
  if (!existsSync(path)) {
    problems.push(`${operation.doc}: listed in operations.json but the doc is missing`);
    continue;
  }
  if (readFileSync(path, 'utf8').includes('<!-- toWrite -->')) problems.push(`${operation.doc}: reasoning not written yet (<!-- toWrite -->)`);
  if (operation.kind !== 'endpoint' && !operation.reaEvidenceId) problems.push(`${operation.doc}: rea has not read this request's slice`);
}
for (const domain of readdirSync(docsDir)) {
  if (domain === 'flows' || !statSync(join(docsDir, domain)).isDirectory()) continue;
  for (const file of readdirSync(join(docsDir, domain))) {
    if (file.endsWith('.md') && file !== 'README.md' && !listed.has(`${domain}/${file}`)) problems.push(`${domain}/${file}: not in operations.json (rebuild the docs)`);
  }
}

const platformsDir = join(root, 'docs', 'platforms');
for (const platform of readdirSync(platformsDir)) {
  const platformIndex = join(platformsDir, platform, 'operations.json');
  if (platform === 'facebook' || !existsSync(platformIndex)) continue;
  const platformDocs = join(platformsDir, platform);
  const platformIndexBody = JSON.parse(readFileSync(platformIndex, 'utf8'));
  if ('builtAt' in platformIndexBody) problems.push(`${platform}/operations.json: carries builtAt; when the docs were built is kept in log.db, not in the repo`);
  const platformOps = platformIndexBody.operations;
  const platformListed = new Set(platformOps.map((o) => o.doc));
  for (const operation of platformOps) {
    const path = join(platformDocs, operation.doc);
    if (!existsSync(path)) problems.push(`${platform}/${operation.doc}: listed in operations.json but the doc is missing`);
    else if (readFileSync(path, 'utf8').includes('<!-- toWrite -->')) problems.push(`${platform}/${operation.doc}: reasoning not written yet (<!-- toWrite -->)`);
    if (!operation.reaEvidenceId) problems.push(`${platform}/${operation.doc}: rea has not read this request's code or its step`);
  }
  for (const domain of readdirSync(platformDocs)) {
    if (!statSync(join(platformDocs, domain)).isDirectory()) continue;
    for (const file of readdirSync(join(platformDocs, domain))) if (file.endsWith('.md') && !platformListed.has(`${domain}/${file}`)) problems.push(`${platform}/${domain}/${file}: not in operations.json (rebuild the docs)`);
  }
}

const flowsDir = join(root, 'src', 'browser', 'flow', 'definitions');
if (existsSync(flowsDir)) {
  for (const file of readdirSync(flowsDir).filter((f) => f.endsWith('.json'))) {
    const name = file.slice(0, -5);
    const declared = JSON.parse(readFileSync(join(flowsDir, file), 'utf8')).platform;
    const platform = typeof declared === 'string' && declared ? declared : 'facebook';
    if (!existsSync(join(root, 'docs', 'platforms', platform, 'flows', `${name}.md`))) problems.push(`flow ${name}: no docs/platforms/${platform}/flows/${name}.md (run \`log flow docs ${name}\`)`);
  }
}

const documented = new Set(index.operations.map((o) => o.name));
const named = new Map();
const scan = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name !== 'node_modules' && name !== 'generated' && name !== '__pycache__') scan(path);
      continue;
    }
    if (!/\.(ts|py)$/.test(name) || /\.test\.ts$/.test(name)) continue;
    for (const match of readFileSync(path, 'utf8').matchAll(/\b((?:use|Comet|Marketplace|Commerce)[A-Za-z0-9]*(?:Query|Mutation))\b/g)) {
      if (!named.has(match[1])) named.set(match[1], relative(root, path));
    }
  }
};
scan(join(root, 'src'));
scan(join(root, 'python'));
for (const [name, file] of named) if (!documented.has(name)) problems.push(`${name} (named in ${file}): no doc in docs/platforms/facebook`);

if (problems.length) {
  console.error(`client docs: ${problems.length} problem(s)\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(`client docs: ${index.operations.length} requests documented, rea read every GraphQL slice.`);
