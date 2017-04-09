const path = require('path');
const fs = require('fs');

const co = require('co');
const PNG = require('pngjs').PNG;

const config = require('./config.json');
const fakeWindow = require('./browserStubs.js');
const GameBoyAdv = require('./dist/gba.js');

const width = 240;
const height = 160;

let saveTimeout;
let gba;
let canvas;
let targetRom = 'roms/pokemon.gba';
let saveFile;

function log(msg) {
    const d = new Date();
    const t = '(' + (d.getMonth() + 1) + '/' + d.getDate() + '/' +
        d.getFullYear() + ' ' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + ') ';
    console.log(t + 'EMU: ' + msg);
}

function sleep(amt) {
    return new Promise(function(res) {
        setTimeout(res, amt);
    });
}

function simpleError(e) {
    if (e) {
        log(e);
    }
}

function loadSave() {
    saveFile = path.basename(targetRom) + '.sav';
    let save = '';
    try {
        save = fs.readFileSync(saveFile, 'binary');
    } catch(e) {
        log('Couldn\'t find or load save file!');
    }

    if (save) {
        const len = save.length;
        const saveArr = new Uint8Array(len);
        log('loading save!');
        for (let x = 0; x < len; x++) {
            saveArr[x] = save.charCodeAt(x);
        }
        gba.setSavedata(saveArr.buffer);
    }
}

function loadRom(filename) {
    const buffer = fs.readFileSync(filename);
    const ab = new ArrayBuffer(buffer.length);
    const view = new Uint8Array(ab);
    for (let i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
}

function startEmulator() {
    gba = new GameBoyAdv();

    gba.setLogger(function(level, error) {
        console.error('EMU ERR', level, error);
        gba.pause();
    });

    canvas = fakeWindow.document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.offsetWidth = width;
    canvas.offsetHeight = height;

    gba.setCanvas(canvas);
    gba.logLevel = gba.LOG_ERROR;

    gba.setBios(loadRom('gbajs/resources/bios.bin'));
    gba.setRom(loadRom('roms/pokemon.gba'));
    loadSave();
    gba.runStable();
    log('running emu...');
}

function saveScreenshot() {
    log('in save screenshot');
    /*
    return new Promise(function(res) {
        log('setting png data');
        const png = new PNG({
            width,
            height
        });
        png.data.set(canvas.context.imageData.data);
        log('opening screenshot write stream');
        png.pack().pipe(fs.createWriteStream('out.png'))
        .on('finish', res)
        .on('error', function(e) {
            log('error saving screenshot! ' + e);
            setTimeout(function() {
                saveScreenshot().then(res);
            }, 100);
        });
    });
    */
    log('setting png data');
    const png = new PNG({width, height});
    png.data.set(canvas.context.imageData.data);
    const buffer = PNG.sync.write(png);
    fs.writeFileSync('out.png', buffer);
}

const pressButton = co.wrap(function*(button, repeat, delay) {
    button = button.toUpperCase();
    const keyCode = gba.keypad['KEYCODE_' + button];

    const downUpDelay = delay || 100;
    const betweenBtnDelay = 500;

    let waitTime = 0;

    if (keyCode) {
        while (repeat > 0) {
            gba.keypad.keyboardHandler({keyCode, type: 'keydown'});
            yield sleep(downUpDelay);
            waitTime += downUpDelay;
            gba.keypad.keyboardHandler({keyCode, type: 'keyup'});
            if (repeat > 1) {
                yield sleep(betweenBtnDelay);
                waitTime += betweenBtnDelay;
            }
            repeat--;
        }
    }

    return waitTime;
});

function writeSaveFile() {
    log('saving file!');
    saveTimeout = 0;
    const data = gba.mmu.save;
    if (data) {
        const arr = new Uint8Array(data.buffer);
        const len = arr.length;
        let str = '';
        for (let x = 0; x < len; x++) {
            str += String.fromCharCode(arr[x]);
        }
        saveFile = path.basename(targetRom) + '.sav';
        fs.writeFile(saveFile, str, 'binary', simpleError);
    }
}

//setInterval(saveScreenshot, 5000);

process.on('message', function(msg) {
    log('got outside message: ' + JSON.stringify(msg));
    if (msg.cmd === 'UPDATE') {
        saveScreenshot();
        log('cooldown: waiting ' + config.commandCooldown + 'ms');
        sleep(config.commandCooldown)
        /*.then(function() {
            log('cooldown: waiting ' + config.commandCooldown + 'ms');
            return sleep(config.commandCooldown)
        })*/
        .then(function() {
            process.send('update');
        }).catch(simpleError);
    } else {
        pressButton(msg.cmd, msg.repeat)
        .then(function(delay) {
            const extraDelay = Math.max(config.commandCooldown - delay, 1000);
            log('cooldown: waiting ' + extraDelay + 'ms');
            return sleep(extraDelay);
        })
        //.then(saveScreenshot)
        .then(function() {
            saveScreenshot();
            log('made it past saveScreenshot');
            process.send('update');
            if (saveTimeout) {
                clearTimeout(saveTimeout);
            }
            saveTimeout = setTimeout(writeSaveFile, 60000);
        }).catch(simpleError);
    }
});

startEmulator();
