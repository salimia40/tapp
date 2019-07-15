const config = require('../config')
const {
    keys
} = config
const helpers = require('../helpers')
const Scene = require('telegraf/scenes/base')
const Markup = require('telegraf/markup')
const {
    leave
} = require('telegraf/stage')

const singnupScene = new Scene('singnupScene')

const inputHandler = async (ctx, next) => {
    let user = ctx.user
    let asked = false
    /**update user information based on user stage */
    switch (ctx.session.stage) {
        case "justJoined":
            break
        case "nameAsked":
            user.name = ctx.message.text
            user = await user.save()
            break
        case "usernameAsked":
            user.username = ctx.message.text
            user = await user.save()
            break
        case "phoneAsked":
            user.phone = ctx.message.text
            user = await user.save()
            break
        case "bankNameAsked":
            if (user.bank == undefined) {
                user.bank = {
                    name: ctx.message.text
                }
            } else {
                user.bank.name = ctx.message.text
            }
            await ctx.reply("لطفا شماره حساب خود را وارد کنید")
            asked = true
            ctx.session.stage = 'bankNumberAsked'
            user = await user.save()
            break
        case "bankNumberAsked":
            user.bank.number = ctx.message.text
            user = await user.save()
            break

    }
    /**ask for eccount information */
    if (!asked) {

        if (user.name == undefined) {
            ctx.reply("نام و نام خانوادگی (نام و نام خانوادگی حقیقی خود را واردکنید)")
            ctx.session.stage = 'nameAsked'
        } else if (user.username == undefined) {
            ctx.reply("نام کاربری (نمایش در گروه)")
            ctx.session.stage = 'usernameAsked'
        } else if (user.phone == undefined) {
            ctx.reply("لطفا شماره تماس خود را وارد کنید")
            ctx.session.stage = 'phoneAsked'
        } else if (user.bank.name == undefined || user.bank.number == undefined) {
            if (ctx.session.stage != 'bankNumberAsked') {
                ctx.reply("لطفا نام بانک خود را وارد کنید")
                ctx.session.stage = 'bankNameAsked'
            }
        } else if (!user.acceptedTerms) {
            helpers.asyncForEach(config.contract, async c => {
                await ctx.reply(c)
            })
            // await ctx.reply(config.contract[2])
            await ctx.reply("آیا با شرایط و قوانین ما موافقط دارید؟", {
                reply_markup: {
                    inline_keyboard: [
                        [{
                            text: 'قبول میکنم',
                            callback_data: "terms-accept"
                        }],
                        [{
                            text: 'خیر',
                            callback_data: "terms-decline"
                        }]
                    ]
                }
            })
        } else {
            /**user eccount is complete */
            await ctx.reply(await helpers.userToString(ctx))
            ctx.session.stage = 'completed'
            user.stage = 'completed'
            await user.save()
            next()
        }
    }
}

singnupScene.action("terms-accept", async (ctx, next) => {
    ctx.user.stage = 'completed'
    ctx.user.acceptedTerms = true
    ctx.user.save()
    ctx.deleteMessage()
    ctx.reply("شما با شرایط گروه موافقط کردید", Markup.keyboard([
        [keys.openfacts, keys.monthlyReport],
        [keys.postSettleReport, keys.semiSettle],
        [keys.packInv, keys.changeInv],
        [keys.userInfo, keys.contact]
    ]).resize().extra())

    next()
}, leave())

singnupScene.action("terms-declined", (ctx) => {
    ctx.reply("برای فعالیت دار گروه نیاز است شما با شرایط گروه موافقط کنید!!")
})

singnupScene.enter(async (ctx) => {
    if (ctx.user.name == undefined) {
        ctx.reply("نام و نام خانوادگی (نام و نام خانوادگی حقیقی خود را واردکنید)")
        ctx.session.stage = 'nameAsked'
    }
})
singnupScene.on('text', inputHandler, leave())


module.exports = singnupScene