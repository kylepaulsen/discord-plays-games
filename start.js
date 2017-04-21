const fs = require('fs');
const fork = require('child_process').fork;

let keyboardRobot;
let bot;

try {
    require('./config');
} catch (e) {
    console.error('Need ./config.json file! Making example config file...');
    const exampleConfig = `{
    "commandCooldown": 5000,
    "botChannel": "lets-play-games",
    "screenshotPath": "screen.png",
    "discordToken": "token-here",
    "chatToKeyboardKey": {
        "a": "x",
        "b": "z",
        "up": "up",
        "left": "left",
        "right": "right",
        "down": "down",
        "start": "enter",
        "select": "shift"
    },
    "maxButtonPressesPerTurn": 9,
    "gamePauseKey": "p",
    "gameResumeKey": "o",
    "screenshotKey": "i",
    "discordBotMessage": "Type: a, b, up, down, left, right, start, select, update, or clean. You can also multiply some commands like this: up*3 . There is a command cooldown of 5 seconds."
}`;
    fs.writeFileSync('config.json', exampleConfig);
    process.exit();
}

function startDiscordBotFork() {
    bot = fork('./discordBot.js');

    bot.on('message', function(msg) {
        keyboardRobot.send(msg);
    });

    bot.on('exit', function() {
        console.log('=== BOT FORK EXITED! Restarting...');
        setTimeout(startDiscordBotFork, 1000);
    });
}

function startKeyboardRobotFork() {
    keyboardRobot = fork('./keyboardRobot.js');

    keyboardRobot.on('message', function(msg) {
        bot.send(msg);
    });

    keyboardRobot.on('exit', function() {
        console.log('=== KEYBOARDROBOT FORK EXITED! Restarting...');
        setTimeout(startKeyboardRobotFork, 1000);
    });
}

startKeyboardRobotFork();
startDiscordBotFork();
