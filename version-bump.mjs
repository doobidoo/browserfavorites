import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Lese die aktuelle Version aus package.json
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const version = packageJson.version;

// Update manifest.json
const manifestJson = JSON.parse(readFileSync('manifest.json', 'utf8'));
manifestJson.version = version;
writeFileSync('manifest.json', JSON.stringify(manifestJson, null, '\t'));

// Update main.ts Version
const mainTsPath = resolve('src/main.ts');
let mainTs = readFileSync(mainTsPath, 'utf8');
mainTs = mainTs.replace(
    /const PLUGIN_VERSION = ['"].*['"]/,
    `const PLUGIN_VERSION = '${version}'`
);
writeFileSync(mainTsPath, mainTs);

console.log(`Updated version to ${version} in all files`);