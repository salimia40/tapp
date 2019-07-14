const Stage = require('telegraf/stage')

const stage = new Stage(
    [
        require('./signup'),
        require('./summitFish'),
        require('./cashReq'),
        require('./commition'),
        require('./tolerance'),
        require('./quotation'),
        require('./delay'),
        require('./sendToGroup'),
        require('./sendToUsers'),
        require('./icrease'),
        require('./promote'),
    ], {
        ttl: 31104000
    }
)


module.exports = stage