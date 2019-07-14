
const Scene = require('telegraf/scenes/base')
const Transaction = require('../model/Transaction')
const {
    leave
} = require('telegraf/stage')
const User = require('../model/User')
const helpers = require('../helpers')


const scene = new Scene('sendtogroupScene')
scene.enter((ctx) => {
    ctx.reply('پیام خود را ارسال کنید')
})

scene.hears('خروج',
leave()
)

scene.on('message', async (ctx,next) => {
    let group = await ctx.setting.getActiveGroup()
    ctx.telegram.sendCopy(group,ctx.message)
    next()
}, leave())

module.exports = scene