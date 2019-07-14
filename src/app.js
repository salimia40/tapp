const Bot = require('./bot')
const config = require('./config')

Bot(config.token).then(bot => {
    bot.launch()
    console.info('bot started successfully')
})