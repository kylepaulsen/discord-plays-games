const fs = require('fs');

const co = require('co');
const robot = require('robotjs');

const config = require('./config.json');

const screenshotKey = 'p';

/*
Go to a site like this:
https://jsemu3.github.io/gba/launcher.html#pokemonsapphire
It is using https://github.com/taisel/IodineGBA

You need to inject a script like this:
setTimeout(function() {
    Iodine.changeVolume(0);

    const canvas = document.querySelector('canvas');

    document.body.addEventListener('keydown', function(e) {
        if (e.keyCode === 80) {
            var link = document.createElement('a');
            link.href = canvas.toDataURL();
            link.download = 'screen.png';
            link.click();
        }
    });
}, 2000);

Keep the browser focused while the bot runs.
*/

function log(msg) {
    const d = new Date();
    const t = '(' + (d.getMonth() + 1) + '/' + d.getDate() + '/' +
        d.getFullYear() + ' ' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + ') ';
    console.log(t + 'KEYBOARD BOT: ' + msg);
}

const sleep = function(amt) {
    return new Promise(function(res) {
        setTimeout(res, amt);
    });
};

const buttonsToKeyboard = {
    a: 'x',
    b: 'z',
    up: 'up',
    left: 'left',
    right: 'right',
    down: 'down',
    start: 'enter',
    select: 'shift',
    l: 1,
    r: 2
};

const pressButton = co.wrap(function*(button, repeat, delay) {
    button = button.toLowerCase();

    const keyboardKey = buttonsToKeyboard[button];
    const downUpDelay = delay || 100;
    const betweenBtnDelay = 500;

    let waitTime = 0;

    if (keyboardKey) {
        while (repeat > 0) {
            robot.keyToggle(keyboardKey, 'down');
            yield sleep(downUpDelay);
            waitTime += downUpDelay;
            robot.keyToggle(keyboardKey, 'up');
            if (repeat > 1) {
                yield sleep(betweenBtnDelay);
                waitTime += betweenBtnDelay;
            }
            repeat--;
        }
    }

    return waitTime;
});

let canPressButton = true;
const saveScreenshot = co.wrap(function*() {
    try {
        fs.unlinkSync(config.screenshotPath);
    } catch (e) {}

    log('taking screenshot');
    robot.keyToggle(screenshotKey, 'down');
    yield sleep(100);
    robot.keyToggle(screenshotKey, 'up');
    yield sleep(100);

    log('waiting for screenshot to save');
    if (!fs.existsSync(config.screenshotPath)) {
        yield sleep(200);
    }
    log('detected screenshot save');
});

const processMessage = co.wrap(function*(msg) {
    log('got outside message: ' + JSON.stringify(msg));
    if (!canPressButton) {
        return;
    }
    canPressButton = false;

    if (msg.cmd === 'UPDATE') {
        yield sleep(config.commandCooldown);
        yield saveScreenshot();
        process.send('update');
    } else {
        const delay = yield pressButton(msg.cmd, msg.repeat);
        const extraDelay = Math.max(config.commandCooldown - delay, 1000);

        log('cooldown: waiting ' + extraDelay + 'ms');
        yield sleep(extraDelay);

        yield saveScreenshot();
        process.send('update');
    }
    canPressButton = true;
});

process.on('message', processMessage);

log('Ready to press keys!');
