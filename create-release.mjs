import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// Read version from package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
const version = packageJson.version;

// Create git tag
console.log(`Creating git tag v${version}...`);
execSync(`git tag -a v${version} -m "Release version ${version}"`);
execSync(`git push origin v${version}`);

// Generate release notes
const releaseNotes = `Version ${version}

See the [changelog](https://github.com/doobidoo/browserfavorites/blob/main/README.md#changelog) for details.`;

// Create GitHub release using gh CLI
console.log('Creating GitHub release...');
const files = [
    './manifest.json',
    './main.js',
    './styles.css'
].map(file => `-a ${file}`).join(' ');

const command = `gh release create v${version} ${files} -t "Version ${version}" -n "${releaseNotes}"`;

try {
    execSync(command, { stdio: 'inherit' });
    console.log('Release created successfully!');
} catch (error) {
    console.error('Error creating release:', error);
    process.exit(1);
}
