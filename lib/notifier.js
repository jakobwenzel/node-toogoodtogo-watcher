const notifier = require('node-notifier');
const { config } = require('./config');
const telegramBot = require('./telegram-bot');
const _ = require('lodash');
const cache = {businessesById:{}};

module.exports = {
    notifyIfChanged
};

function hasInterestingChange(current, previous) {
    const options = config.get('messageFilter');

    const currentStock = current.items_available;
    const previousStock = previous ? previous.items_available : 0;
    
    if (currentStock == previousStock) {
        return options.showUnchanged;
    } else if (currentStock < previousStock) {
        return options.showDecrease;
    } else if (previousStock == 0) {
        return options.showIncreaseFromZero;
    } else {
        return options.showIncrease;
    }
}

function filterBusinesses(businessesById) {
    return Object.keys(businessesById)
        .filter(key => {
                const current = businessesById[key];
                const previous = cache.businessesById[key];
                return hasInterestingChange(current, previous);
        })
        .map(key => businessesById[key]);
}

function notifyIfChanged(businesses) {

    const businessesById = _.keyBy(businesses, 'item.item_id');
    const filteredBusinesses = filterBusinesses(businessesById);

    const message = createMessage(filteredBusinesses);
    const options = config.get('notifications');
    
    if(options.console.enabled){
        notifyConsole(message, options.console);
    }
    if(filteredBusinesses.length > 0){
        if(options.desktop.enabled){
            notifyDesktop(message)
        }
        if(options.telegram.enabled){
            telegramBot.notify(filteredBusinesses);
        }
    }

    cache.businessesById = businessesById;
}

function notifyConsole(message, options){
    if(options.clear){
        console.clear();
    }
    console.log(message + '\n');
}

function notifyDesktop(message){
    notifier.notify({ title: 'TooGoodToGo', message });
}

function createMessage(businesses){
    return businesses
        .map(business => `${ business.display_name } - ${business.items_available}`)
        .join('\n');
}
