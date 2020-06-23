const _ = require('lodash');
const Telegraf = require('telegraf');
const { config } = require('./config');
const moment = require('moment');
const cache = {};
let bot;

module.exports = {
    notify
};


function cal(m) {
    return m.calendar(null, {
        lastDay : '[Gestern] HH:mm',
        sameDay : '[Heute] HH:mm',
        nextDay : '[Morgen] HH:mm',
        lastWeek : '[Letzter] dddd HH:mm',
        nextWeek : 'dddd HH:mm',
        sameElse : 'L'
    })
}

function formatInterval(business) {
    if (business.pickup_interval) {
        const startDate = moment(new Date(Date.parse(business.pickup_interval.start)))
        const endDate = moment(new Date(Date.parse(business.pickup_interval.end)))

        return cal(startDate) + " - " + cal(endDate);
    }
    return "?";
}

function formatMessage(businesses) {

    return businesses
        //.map(business => `<a href="https://share.toogoodtogo.com/store/${business.store.store_id}"><b>${ business.display_name }</b></a>\n\n${business.items_available}*`);
        .map(business => `<a href="${business.item.logo_picture.current_url}">&#8205;</a><a href="https://share.toogoodtogo.com/item/${business.item.item_id}"><b>${ business.display_name }</b></a>
        
Verfügbar: <b>${business.items_available}</b>
${formatInterval(business)}`);

}

function notify(businesses){
    const message = formatMessage(businesses);
    cache.message = message;
    if(!bot){
        createBot();
    }
    const chats = config.get('notifications.telegram.chats');
    _.forEach(chats, chat => {
        message.forEach(m => sendMessage(chat.id, m))
    });
}

function sendMessage(chatId, message){
    return bot.telegram
        .sendMessage(chatId, message, {parse_mode: 'html'})
        .catch(error => {
            if(error.code === 403){
                removeChat(chatId);
            } else {
                console.error(`${error.code} - ${error.description}`);
            }
        });
}

function createBot(){
    const options = config.get('notifications.telegram');
    if(!options.enabled || !options.botToken){
        return null;
    }
    bot = new Telegraf(options.botToken);
    bot.command('start', startCommand);
    bot.command('stop', stopCommand);
    bot.launch();
    return bot;
}

function startCommand(context){
    addChat(context);
    context.reply(`*bleep* I am the TooGoodToGo bot.
I will tell you whenever the stock of your favorites changes. *bloop*.
If you get tired of my spamming you can (temporarily) disable me with:
/stop`);
    if(cache.message){
        cache.message.forEach(m => context.reply(m, {parse_mode: 'html'}));
        
    }
}

function stopCommand(context){
    context.reply(`*bleep* Ok.. I get it. Too much is too much. I'll stop bothering you now. *bloop*.
You can enable me again with:
/start`);
    removeChat(context.chat.id);
}

function addChat(context){
    const chats = config.get('notifications.telegram.chats');
    const chat = {
        id: context.chat.id,
        firstName: context.from.first_name,
        lastName: context.from.last_name
    };
    config.set('notifications.telegram.chats', _.unionBy(chats, [chat], chat => chat.id));
    console.log(`Added chat ${chat.firstName} ${chat.lastName} (${chat.id})`);
}

function removeChat(chatId){
    const chats = config.get('notifications.telegram.chats');
    const chat = _.find(chats, { id: chatId });
    if(chat){
        config.set('notifications.telegram.chats', _.pull(chats, chat));
        console.log(`Removed chat ${chat.firstName} ${chat.lastName} (${chat.id})`);
    }
}
