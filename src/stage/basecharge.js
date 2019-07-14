
const Scene = require('telegraf/scenes/base')
const Transaction = require('../model/Transaction')
const {
    leave
} = require('telegraf/stage')
const User = require('../model/User')
const helpers = require('../helpers')


const scene = new Scene('basechargeScene')
scene.enter((ctx) => {
    ctx.reply('لطفا مبلغ مد نظر خود را هزار تومان به صورت عددی وارد نمایید.')
})

scene.hears(/\d+/, async(ctx, next) => {
    let c = ctx.match[0]
    c= +c
    ctx.setting.setBaseCharge(c)
    let group = await ctx.setting.getActiveGroup()
    ctx.telegram.sendMessage( `💫 وجه تضمین: ${c} 💫`)
    next()
},leave())

scene.hears('خروج',
    leave()
)

module.exports = scene