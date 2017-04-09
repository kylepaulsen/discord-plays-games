const Discord = require('discord.io');

const config = require('./config.json');

let bot;
let gbaChannel;
let lastButtonPress = 0;

function log(msg) {
    const d = new Date();
    const t = '(' + (d.getMonth() + 1) + '/' + d.getDate() + '/' +
        d.getFullYear() + ' ' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + ') ';
    console.log(t + 'BOT: ' + msg);
}

function getManyMessages(cb) {
    log('getting messages!');
    bot.getMessages({
        channelID: gbaChannel,
        limit: 100
    }, function(err, messages) {
        if (err) {
            console.error(err);
        }
        cb(messages || []);
    });
}

function deleteMessages(messages, cb) {
    let method;
    let opts = {channelID: gbaChannel};
    messages = messages || [];
    if (messages.length === 1) {
        method = 'deleteMessage';
        opts.messageID = messages[0].id;
    } else {
        method = 'deleteMessages';
        opts.messageIDs = messages.map(function(msg) {
            return msg.id;
        });
    }
    if (messages.length) {
        log('deleting messages!');
        bot[method](opts, function(err) {
            if (err) {
                console.error(err);
            }
            if (cb) {
                cb(err);
            }
        });
    }
}

function updateScreen() {
    log('uploading image!');
    bot.uploadFile({
        to: gbaChannel,
        file: 'out.png',
        message: 'Type: a, b, l, r, up, down, left, right, start, select, update, or clean. ' +
            'You can also multiply some commands like this: up*3 . ' +
            'There is a command cooldown of 5 seconds.'
    }, function(err) {
        if (err) {
            console.error(err);
        }
    });
}

function cleanABunch() {
    getManyMessages(function(messages) {
        deleteMessages(messages, updateScreen);
    });
}

function startDiscordBot() {
    bot = new Discord.Client({
        token: config.discordToken,
        autorun: true
    });

    bot.on('ready', function() {
        log('Discord: I am ready!');

        const channels = Object.keys(bot.channels);
        for (let x = 0; x < channels.length; x++) {
            const chan = bot.channels[channels[x]];
            if (chan.type === 'text' && chan.name === 'gba') {
                gbaChannel = channels[x];
                break;
            }
        }
    });

    const specialCommands = {
        UPDATE: updateScreen,
        CLEAN: cleanABunch
    };
    const validKeys = {
        A: 1,
        B: 1,
        L: 1,
        R: 1,
        START: 1,
        SELECT: 1,
        LEFT: 1,
        RIGHT: 1,
        DOWN: 1,
        UP: 1
    };
    bot.on('message', function(user, userID, channelID, message, event) {
        const upMessage = (message || '').toUpperCase();
        const messageParts = upMessage.split('*').map(function(part) {
            return part.trim();
        });
        const cmd = messageParts[0];
        let repeat = 1;
        if (messageParts[1]) {
            repeat = parseInt(messageParts[1]);
            if (isNaN(repeat)) {
                repeat = 1;
            }
            repeat = Math.max(Math.min(repeat, 9), 1);
        }

        const keycode = validKeys[cmd];
        const specialCommand = specialCommands[cmd];
        if (channelID === gbaChannel && (keycode || specialCommand)) {
            const now = Date.now();
            if (now - lastButtonPress > config.commandCooldown) {
                log('got command: ' + cmd);
                lastButtonPress = now;

                if (cmd === 'CLEAN') {
                    cleanABunch();
                } else {
                    process.send({cmd, repeat});
                }
            }
        }
    });

    bot.on('disconnect', function(errMsg, code) {
        log('===== Disconnected! ErrCode: ' + code);
        log('===== Error: ' + errMsg);
        throw new Error('disconnect error!');
    });
}

process.on('message', function(msg) {
    log('got outside message: ' + msg);
    if (msg === 'update') {
        updateScreen();
    }
});

startDiscordBot();

log('running...');
