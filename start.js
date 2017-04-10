const fs = require('fs');
const fork = require('child_process').fork;

let bot;
let emu;

try {
    require('./config');
} catch (e) {
    console.error('Need ./config.json file! Making example config file...');
    const exampleConfig = `{
    "commandCooldown": 5000,
    "startingRom": "roms/someRom.gba",
    "botChannel": "gba",
    "discordToken": "token-here"
}`;
    fs.writeFileSync('config.json', exampleConfig);
    process.exit();
}

function startEmuFork() {
    emu = fork('./emu.js');

    emu.on('message', function(msg) {
        bot.send(msg);
    });

    emu.on('exit', function() {
        console.log('=== EMU FORK EXITED! Restarting...');
        setTimeout(startEmuFork, 1000);
    });
}

function startBotFork() {
    bot = fork('./bot.js');

    bot.on('message', function(msg) {
        emu.send(msg);
    });

    bot.on('exit', function() {
        console.log('=== BOT FORK EXITED! Restarting...');
        setTimeout(startBotFork, 1000);
    });
}

startEmuFork();
startBotFork();
