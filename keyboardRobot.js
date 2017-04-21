const fs = require('fs');

const co = require('co');
const robot = require('robotjs');

const config = require('./config.json');

/*
Go to a site like this:
https://jsemu3.github.io/gba/launcher.html#pokemonsapphire
It is using https://github.com/taisel/IodineGBA

You need to inject a script like this:
(function() {
    function setup() {
        try {
            Iodine.changeVolume(0);
        } catch(e) {
            setTimeout(setup, 1000);
            return;
        }

        const canvas = document.querySelector('canvas');

        const keys = {
            P: 80,
            I: 73,
            O: 79
        }

        document.body.addEventListener('keydown', function(e) {
            if (e.keyCode === keys.P) {
                var link = document.createElement('a');
                link.href = canvas.toDataURL();
                link.download = 'screen.png';
                link.click();
            } else if (e.keyCode === keys.I) {
                Iodine.pause();
            } else if (e.keyCode === keys.O) {
                Iodine.play();
            }
        });
    }

    setup();
})();


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

const pressButton = co.wrap(function*(button, repeat, delay) {
    button = button.toLowerCase();

    const keyboardKey = config.chatToKeyboardKey[button];
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
    robot.keyToggle(config.screenshotKey, 'down');
    yield sleep(100);
    robot.keyToggle(config.screenshotKey, 'up');
    yield sleep(100);

    log('waiting for screenshot to save');
    if (!fs.existsSync(config.screenshotPath)) {
        yield sleep(200);
    }
    log('detected screenshot save');
});

const pause = co.wrap(function*() {
    robot.keyToggle(config.gamePauseKey, 'down');
    yield sleep(100);
    robot.keyToggle(config.gamePauseKey, 'up');
    yield sleep(100);
});

const unpause = co.wrap(function*() {
    robot.keyToggle(game.gameResumeKey, 'down');
    yield sleep(100);
    robot.keyToggle(game.gameResumeKey, 'up');
    yield sleep(100);
});

const processMessage = co.wrap(function*(msg) {
    log('got outside message: ' + JSON.stringify(msg));
    if (!canPressButton) {
        return;
    }
    canPressButton = false;

    if (msg.cmd === 'UPDATE') {
        yield unpause();
        yield sleep(config.commandCooldown);
        yield pause();
        yield saveScreenshot();
        process.send('update');
    } else {
        yield unpause();
        const delay = yield pressButton(msg.cmd, msg.repeat);
        const extraDelay = Math.max(config.commandCooldown - delay, 1000);

        log('cooldown: waiting ' + extraDelay + 'ms');
        yield sleep(extraDelay);
        yield pause();

        yield saveScreenshot();
        process.send('update');
    }
    canPressButton = true;
});

process.on('message', processMessage);

log('Ready to press keys!');
