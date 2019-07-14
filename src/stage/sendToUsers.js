
const Scene = require('telegraf/scenes/base')
const Transaction = require('../model/Transaction')
const {
    leave
} = require('telegraf/stage')
const User = require('../model/User')
const helpers = require('../helpers')


const scene = new Scene('sendtousersScene')
scene.enter((ctx) => {
    ctx.reply('پیام خود را ارسال کنید')
})

scene.hears('خروج',leave())

scene.on('message', async (ctx,next) => {
    let users = await User.find()
    helpers.asyncForEach(users,async u => {
        ctx.telegram.sendCopy(u.userId,ctx.message).catch(console.log('cant send msg'))
    })
    next()
}, leave())

module.exports = scene