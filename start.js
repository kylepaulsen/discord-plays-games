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
    "botChannel": "gba",
    "screenshotPath": "screen.png",
    "discordToken": "token-here"
}`;
    fs.writeFileSync('config.json', exampleConfig);
    process.exit();
}

function startBotFork() {
    bot = fork('./bot.js');

    bot.on('message', function(msg) {
        keyboardRobot.send(msg);
    });

    bot.on('exit', function() {
        console.log('=== BOT FORK EXITED! Restarting...');
        setTimeout(startBotFork, 1000);
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
startBotFork();
