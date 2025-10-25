#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const variantRoot = path.join(root, 'extensions', 'organize');

const sources = [
  { from: path.join(root, 'services'), to: path.join(variantRoot, 'services') },
  { from: path.join(root, 'icons'), to: path.join(variantRoot, 'icons') },
  { from: path.join(root, 'src', 'background'), to: path.join(variantRoot, 'src', 'background') },
  { from: path.join(root, '_locales'), to: path.join(variantRoot, '_locales') },
];

const optionsFiles = [
  path.join(root, 'src', 'pages', 'options', 'index.html'),
  path.join(root, 'src', 'pages', 'options', 'index.css'),
  path.join(root, 'src', 'pages', 'options', 'index.js'),
];

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function copyRecursive(src, dest) {
  await ensureDir(dest);
  await fs.promises.cp(src, dest, { recursive: true });
}

async function main() {
  console.log('Syncing shared code into variant extension...');
  // Copy directories
  for (const { from, to } of sources) {
    console.log(`Copy ${path.relative(root, from)} -> ${path.relative(root, to)}`);
    await copyRecursive(from, to);
  }
  // Copy options files
  const optionsDestDir = path.join(variantRoot, 'src', 'pages', 'options');
  await ensureDir(optionsDestDir);
  for (const file of optionsFiles) {
    const dest = path.join(optionsDestDir, path.basename(file));
    console.log(`Copy ${path.relative(root, file)} -> ${path.relative(root, dest)}`);
    await fs.promises.copyFile(file, dest);
  }
  // Ensure overlay exists
  const overlayPath = path.join(optionsDestDir, 'overlay.js');
  const overlayContents = `(() => {\n  function removeNavElements() {\n    try {\n      const navTabBtn = document.querySelector('.tabs .tab-btn[data-tab=\"nav\"]');\n      if (navTabBtn) navTabBtn.remove();\n      const navSection = document.getElementById('nav');\n      if (navSection) navSection.remove();\n      const activeBtn = document.querySelector('.tabs .tab-btn.active');\n      if (!activeBtn) {\n        const organizeBtn = document.querySelector('.tabs .tab-btn[data-tab=\"organize\"]');\n        if (organizeBtn) organizeBtn.classList.add('active');\n      }\n      const activeContent = document.querySelector('.tab-content.active');\n      if (!activeContent) {\n        const organizeContent = document.getElementById('organize');\n        if (organizeContent) organizeContent.classList.add('active');\n      }\n    } catch (e) {}\n  }\n  function patchOptionsManager() {\n    try {\n      if (typeof optionsManager !== 'undefined' && optionsManager) {\n        optionsManager.updateWidgetConfig = function() {};\n      }\n    } catch (e) {}\n  }\n  document.addEventListener('DOMContentLoaded', () => {\n    removeNavElements();\n    patchOptionsManager();\n  });\n})();\n`;
  await fs.promises.writeFile(overlayPath, overlayContents, 'utf8');
  console.log('Wrote overlay.js to hide Navigation tab.');

  // Ensure overlay.js script tag is present in options HTML
  const optionsHtmlPath = path.join(optionsDestDir, 'index.html');
  let html = await fs.promises.readFile(optionsHtmlPath, 'utf8');
  if (!html.includes('overlay.js')) {
    html = html.replace('</script>\n</body>', '</script>\n  <script src="overlay.js"></script>\n</body>');
    await fs.promises.writeFile(optionsHtmlPath, html, 'utf8');
    console.log('Injected overlay.js into options HTML.');
  } else {
    console.log('overlay.js already referenced in options HTML.');
  }

  console.log('Done.');
}

main().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});