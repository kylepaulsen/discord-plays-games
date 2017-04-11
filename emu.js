const path = require('path');
const fs = require('fs');

const co = require('co');
const PNG = require('pngjs').PNG;

const config = require('./config.json');
const fakeWindow = require('./browserStubs.js');
const GameBoyAdv = require('./gba.js');

const width = 240;
const height = 160;

let saveTimeout;
let pauseTimeout;
let gba;
let canvas;
let targetRom = config.startingRom;
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
    saveFile = path.join('saves', path.basename(targetRom) + '.sav');
    let save = '';
    try {
        save = fs.readFileSync(saveFile, 'binary');
    } catch (e) {
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
    try {
        const buffer = fs.readFileSync(filename);
        const ab = new ArrayBuffer(buffer.length);
        const view = new Uint8Array(ab);
        for (let i = 0; i < buffer.length; ++i) {
            view[i] = buffer[i];
        }
        return ab;
    } catch (e) {
        log('===== Couldn\'t find or load ' + targetRom);
    }
}

function loadGame(filename) {
    gba.pause();
    gba.reset();
    const rom = loadRom(filename);
    if (rom) {
        targetRom = filename;
        gba.setRom(rom);
        log('loaded rom: ' + filename);
        loadSave();
        gba.runStable();
        log('running emu...');
    }
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
    loadGame(config.startingRom);
}

function saveScreenshot() {
    log('in save screenshot');
    const png = new PNG({width, height});
    log('setting png data');
    png.data.set(canvas.context.imageData.data);
    const buffer = PNG.sync.write(png);
    fs.writeFileSync('out.png', buffer);
    log('made it past saveScreenshot');
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

function copyFile(source, target, cb) {
    var cbCalled = false;

    function done(err) {
        if (!cbCalled) {
            cb(err);
            cbCalled = true;
        }
    }

    var rd = fs.createReadStream(source);
    rd.on('error', function(err) {
        done(err);
    });
    var wr = fs.createWriteStream(target);
    wr.on('error', function(err) {
        done(err);
    });
    wr.on('close', function() {
        done();
    });
    rd.pipe(wr);
}

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
        saveFile = path.join('saves', path.basename(targetRom) + '.sav');
        copyFile(saveFile, saveFile + '.bak', function() {
            fs.writeFileSync(saveFile, str, 'binary');
        });
    }
}

process.on('message', function(msg) {
    if (msg === 'ping') {
        process.send('pong');
    } else {
        log('got outside message: ' + JSON.stringify(msg));

        if (msg.cmd === 'UPDATE') {
            if (gba.paused) {
                gba.runStable();
            }
            sleep(500).then(function() {
                saveScreenshot();
                log('cooldown: waiting ' + config.commandCooldown + 'ms');
                sleep(config.commandCooldown)
                .then(function() {
                    process.send('update');
                }).catch(simpleError);
            });
        } else {
            if (gba.paused) {
                gba.runStable();
            }
            pressButton(msg.cmd, msg.repeat)
            .then(function(delay) {
                const extraDelay = Math.max(config.commandCooldown - delay, 1000);
                log('cooldown: waiting ' + extraDelay + 'ms');
                return sleep(extraDelay);
            })
            .then(function() {
                saveScreenshot();
                process.send('update');
                if (saveTimeout) {
                    clearTimeout(saveTimeout);
                }
                if (pauseTimeout) {
                    clearTimeout(pauseTimeout);
                }
                saveTimeout = setTimeout(writeSaveFile, 60000);
                pauseTimeout = setTimeout(function() {
                    log('pausing!');
                    gba.pause();
                }, 30000);
            }).catch(simpleError);
        }
    }
});

startEmulator();
