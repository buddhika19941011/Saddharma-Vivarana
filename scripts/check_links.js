const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function walk(dir, filelist = []) {
    const files = fs.readdirSync(dir);
    files.forEach(f => {
        const fp = path.join(dir, f);
        const stat = fs.statSync(fp);
        if (stat.isDirectory()) {
            walk(fp, filelist);
        } else if (f.endsWith('.html')) {
            filelist.push(fp);
        }
    });
    return filelist;
}

function extractLinks(html) {
    const hrefRe = /href\s*=\s*"([^"]+)"/g;
    const srcRe = /src\s*=\s*"([^"]+)"/g;
    const links = [];
    let m;
    while ((m = hrefRe.exec(html))) links.push(m[1]);
    while ((m = srcRe.exec(html))) links.push(m[1]);
    return links;
}

function isExternal(link) {
    if (!link) return true;
    return /^(https?:|mailto:|tel:|#)/i.test(link);
}

const htmlFiles = walk(root);
const missing = [];
const duplicates = {};
const contentMap = {};

htmlFiles.forEach(fp => {
    const html = fs.readFileSync(fp, 'utf8');

    // links
    const links = extractLinks(html);
    links.forEach(l => {
        if (isExternal(l)) return;
        // normalize
        const resolved = path.resolve(path.dirname(fp), l.split('?')[0].split('#')[0]);
        if (!fs.existsSync(resolved)) {
            missing.push({ file: path.relative(root, fp), link: l, resolved: path.relative(root, resolved) });
        }
    });

    // duplicates by content hash (simple)
    const hash = require('crypto').createHash('md5').update(html.replace(/\s+/g, ' ')).digest('hex');
    if (!contentMap[hash]) contentMap[hash] = [];
    contentMap[hash].push(path.relative(root, fp));
});

Object.keys(contentMap).forEach(h => {
    if (contentMap[h].length > 1) duplicates[h] = contentMap[h];
});

console.log('BROKEN LINKS:');
if (missing.length === 0) console.log('None found');
missing.forEach(m => console.log(`- ${m.file} --> ${m.link} (resolved: ${m.resolved})`));

console.log('\nDUPLICATE/IDENTICAL HTML FILE GROUPS:');
if (Object.keys(duplicates).length === 0) console.log('None found');
Object.values(duplicates).forEach(group => {
    console.log('- Group:');
    group.forEach(f => console.log('   ' + f));
});

process.exit(0);
