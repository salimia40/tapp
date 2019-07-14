
const Scene = require('telegraf/scenes/base')
const Transaction = require('../model/Transaction')
const {
    leave
} = require('telegraf/stage')
const User = require('../model/User')
const Bill = require('../model/Bill')
const helpers = require('../helpers')
const queue = require('../queue')
const config = require('../config')
const Markup = require('telegraf/markup')


const scene = new Scene('promoteScene')
scene.enter((ctx) => {
    ctx.reply('لطفا کد کاربری مربوط به کاربر مورد نظر را وارد کنید')
})

scene.hears(/\d+/, async(ctx, next) => {
    var c = ctx.match[0]
    c= +c
    var user = await User.findOne({userId:c})
    
    console.log(user)
    console.log(user.username)
        console.log(user.name)
        console.log(user.userId)
    if(user == undefined) {
        ctx.reply('کاربر یافت نشد')
    } else {
        console.log(user)
        console.log(user.username)
        console.log(user.name)
        console.log(user.userId)
        ctx.reply(`نقش کاربر ((${user.username})) را انتخاب کنید`,{
            reply_markup: {
                inline_keyboard: [[
                    {text:'کاربر معمولی', callback_data: `${config.role_member}:${user.userId}`},
                    {text:'کاربر مدیر', callback_data: `${config.role_admin}:${user.userId}`}
                ]]
            }
        })
    }
    next()
},leave())

scene.hears('خروج',
    leave()
)

module.exports = scene