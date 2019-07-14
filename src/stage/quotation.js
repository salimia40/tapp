
const Scene = require('telegraf/scenes/base')
const {
    leave
} = require('telegraf/stage')
const User = require('../model/User')
const helpers = require('../helpers')


const scene = new Scene('quotationScene')
scene.enter((ctx) => {
    ctx.reply('لطفا مبلغ مد نظر خود را به هزار تومان به صورت عددی وارد نمایید.')
})

scene.hears(/\d+/, async(ctx, next) => {
    let c = ctx.match[0]
    c= +c
    ctx.setting.setQuotation(c)
    let group = await ctx.setting.getActiveGroup()
    // ctx.reply(JSON.parse(groups))
    console.log(group)
    ctx.telegram.sendMessage(group, `💫 مظنه: ${c} 💫`)
    next()
},leave())

scene.hears('خروج',
    leave()
)

module.exports = scene