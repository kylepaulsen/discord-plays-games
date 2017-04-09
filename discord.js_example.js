const Discord = require('discord.js');
// do discord stuff...
const botName = 'gba-emu-bot';
const discordToken = 'Mjk5Nzk0ODM0OTE3Njg3Mjk2.C8jFZA.xGZNdHPtK4M6SJ0wi3IR-Kwc1z8';

function startDiscordBot() {
    bot = new Discord.Client();
    bot.login(discordToken);

    bot.on('ready', () => {
        console.log('Discord: I am ready!');

        bot.channels.forEach(function(chan) {
            if (chan.name === 'gba') {
                gbaChannel = chan;
            }
        });

        gbaChannel.sendFile('./out.png', './out.png', 'test');
    });
}

startDiscordBot();

console.log('running...');
