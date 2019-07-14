
const Scene = require('telegraf/scenes/base')
const Transaction = require('../model/Transaction')
const {
    leave
} = require('telegraf/stage')
const User = require('../model/User')
const Bill = require('../model/Bill')
const helpers = require('../helpers')
const queue = require('../queue')


const scene = new Scene('settleScene')
scene.enter((ctx) => {
    ctx.reply('لطفا نرخ تسویه را به هزار تومان به صورت عددی وارد نمایید.')
})

scene.hears(/\d+/, async(ctx, next) => {
    let c = ctx.match[0]
    c= +c
    let users = await User.find()
    await helpers.asyncForEach(users, async user => {
        queue.push(async () => {
            var bills = await Bill.find({userId: user.userId,closed: true,left: {$gt:0}})
            let isSell = false
            amount = 0
            helpers.asyncForEach(bills, async bill => {
                isSell = bill.isSell
                amount += bill.left
            })
        })
    })
    
    next()
},leave())

scene.hears('خروج',
    leave()
)

module.exports = scene