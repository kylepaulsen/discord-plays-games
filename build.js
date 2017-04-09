const path = require('path');
const fs = require('fs');
//const useref = require('useref-file');

console.log('Welcome to the build script.', '\nUse -c flag to clean.');

const stubsFile = './browserStubs.js';
const indexFile = 'gbajs/index.html';
const targetHTMLFile = 'dist/out.html';
const targetJSFile = 'dist/gba.js';

try {
    fs.unlinkSync(targetHTMLFile);
    fs.unlinkSync(targetJSFile);
} catch(e) {}

const fThisCrap = `Object.prototype.inherit = function() {
	for (var v in this) {
		this[v] = this[v];
	}
};`;

const fThisToo = /this.inherit\(.*/g;

const endingScript = `
function queueFrame(f) {
    window.queueFrame(f);
}
module.exports = GameBoyAdvance;
`;

function readAndConcatScriptsFromHTML(indexPath) {
    const index = fs.readFileSync(indexPath, 'utf8');
    const pathParts = ('./' + indexPath).split('/');
    pathParts.pop();
    const basePath = pathParts.join('/');
    const regex = /\<script.*src=['"](.*)['"]/gi;
    let fullScript = '';
    let match = regex.exec(index);
    while (match) {
        fullScript += fs.readFileSync(path.join(basePath, match[1])) + '\n\n';
        match = regex.exec(index);
    }
    return fullScript.replace(fThisCrap, '').replace(fThisToo, '');
}

if (process.argv[2] !== '-c') {
    console.log('\nBuilding...\n');

    const nodeStubs = fs.readFileSync(stubsFile, 'utf8').replace(/module.exports.*/gi, '');
    const concatedScript = readAndConcatScriptsFromHTML(indexFile);
    fs.writeFileSync(targetJSFile, nodeStubs + concatedScript + endingScript);

    console.log('DONE!');
} else {
    console.log('\nCleaning...\n');
    console.log('DONE!');
}
