module.exports = async (token) => {
    const Telegraf = require('telegraf'),
        middlewares = require('./middleware'),
        stage = require('./stage'),
        command = require('./command'),
        Bill = require('./model/Bill'),
        User = require('./model/User'),
        actions = require('./action'),
        config = require('./config'),
        helpers = require('./helpers'),
        keys = config.keys,
        LocalSession = require('telegraf-session-local'),
        Markup = require('telegraf/markup'),
        hears = require('./hear'),
        bot = new Telegraf(token),
        {
            enter
        } = require('telegraf/stage'),
        akeys = config.adminKeys


    bot.catch((err) => {
        log.error('Ooops', err)
    });

    const botUser = await bot.telegram.getMe();
    let busr = await User.findOne({userId: botUser.id})
    if (busr == undefined) {
        busr = new User({userId: botUser.id,name: 'ربات', username :'ربات' })
        await busr.save()
    }

    // add middlewares
    bot.use(middlewares.boundUser)
    bot.use(middlewares.boundSetting)
    bot.use(middlewares.fixNumbers)
    bot.use(middlewares.checkIfGroupAdmin(botUser))

    bot.command('setup', Telegraf.branch(helpers.isGroup,
        Telegraf.branch(helpers.isOwner,
            async (ctx) => {
                    ctx.setting.setActiveGroup(ctx.chat.id)
                    ctx.setting.activate()
                },
                async (ctx) => {}
        ),
        async (ctx) => {}
    ))


    bot.use(async (ctx, next) => {
        if (helpers.isGroup(ctx)) {
            let active = await ctx.setting.itsActiveGroup(ctx.chat.id)
            console.log('bot is setuped',active)
            if (active) next()
        } else {
            next()
        }
    })

    bot.command('activate', Telegraf.branch(helpers.isGroup,
        Telegraf.branch(helpers.isOwner,
            async (ctx) => {
                    ctx.setting.activate()
                },
                async (ctx) => {}
        ),
        async (ctx) => {

        }
    ))

    bot.command('deactivate', Telegraf.branch(helpers.isGroup,
        Telegraf.branch(helpers.isOwner,
            async (ctx) => {
                    ctx.setting.deActivate()
                },
                async (ctx) => {}
        ),
        async (ctx) => {

        }
    ))


    bot.use(async (ctx,next) => {
        if(helpers.isGroup(ctx)) {
            let active = await ctx.setting.IsActive()
            console.log('bot is active',active)
            if (active) next()
            else {
                if(! helpers.isAdmin(ctx)) {
                    ctx.deleteMessage()
                }
            }
        } else next()
    })
    bot.use(middlewares.checkUserCompleted)
    // session
    bot.use((new LocalSession({
        database: './session.json'
    })).middleware())

    bot.use(stage.middleware())

    // dont filter messages if its in scenes
    bot.use(middlewares.filterMessages)

    // commands
    bot.start((ctx, next) => {
            if (helpers.isPrivate(ctx)) {

                if (ctx.user.stage == 'justJoined') {
                    ctx.reply('به ربات طلای آبشده خوش آمدید')
                    next()
                } else if (ctx.user.stage != 'completed') {
                    next()
                } else {
                    ctx.reply('دستور مورد نظر خود را انتخاب کنید:', Markup.keyboard([
                        [keys.openfacts, keys.monthlyReport],
                        [keys.postSettleReport, keys.semiSettle],
                        [keys.packInv, keys.changeInv],
                        [keys.userInfo, keys.contact]
                    ]).resize().extra())
                }
            }
        },
        // signup scene
        enter('singnupScene')
    )

    bot.command('init', command.init)

    //actions
    bot.action('confirm', actions.confirm)
    bot.action('cancel', actions.cancel)
    bot.action(/confirmtransaction:\d+/, actions.confirmtransaction)
    bot.action(/rejecttransaction:\d+/, actions.rejecttransaction)
    bot.action(/donetransaction:\d+/, actions.donetransaction)

    bot.action("name-view", actions.askName, enter('singnupScene'))
    bot.action("phone-view", actions.askPhone, enter('singnupScene'))
    bot.action("bank-name-view", actions.askBank, enter('singnupScene'))

    bot.action(keys.eccountant, hears.sendEccountant)

    bot.action(/bot-admin:\d+/, async (ctx) => {
        var [_,userId] = ctx.match[0].split(':')
        userId = +userId
        var user = await User.findOne({userId})
        user.role = config.role_admin
        await user.save()
        ctx.reply(`کاربر ${user.name} به مدیر ارتقا یافت`)

    })
    bot.action(/bot-member:\d+/, async (ctx) => {
        var [_,userId] = ctx.match[0].split(':')
        userId = +userId
        var user = await User.findOne({userId})
        user.role = config.role_member
        await user.save()
        ctx.reply(`کاربر ${user.name} به کاربر معمولی تنزل یافت`)
    })

    // hears
    bot.hears(/مظنه \d+/, hears.updateQuotation)
    bot.hears(/وجه تضمین \d+/, hears.updateBaseCharge)
    bot.hears(/کمیسیون \d+/, hears.updateCommition)
    bot.hears(/تلورانس \d+/, hears.updateTolelrance)
    bot.hears(/charge *\d+ *\d+/, hears.chargeUser)

    bot.hears(keys.userInfo, hears.sendUser)
    bot.hears(keys.changeInv, hears.changeInv)
    bot.hears(keys.packInv, hears.goldInv)
    bot.hears(keys.cardInfo, hears.cardInfo)
    bot.hears(keys.summitResipt, enter('summitFish'))
    bot.hears(keys.contact, hears.contact)
    bot.hears(keys.openfacts, hears.openfacts)
    bot.hears(keys.monthlyReport, hears.monthlyReport)
    bot.hears(keys.reqCash, hears.reqCash)
    bot.hears(keys.back, hears.sendMainMenu)

    bot.hears(keys.manage, async (ctx) => {
        switch (ctx.user.role) {
            case config.role_owner:
                    ctx.reply('مدیریت ربات', Markup.keyboard([
                        [akeys.commition, akeys.tolerence, akeys.quotation],
                        [akeys.basecharge,akeys.nextSettle, akeys.delay],
                        [akeys.increase, akeys.increaseBotCharge],
                        [akeys.charge, akeys.changeRole, akeys.doSettle],
                        [akeys.sendToGroup, akeys.sendToUsers, akeys.getSettings],
                        [keys.back]
                    ]).resize().extra())
            break
            
            case config.role_admin:
                    ctx.reply('مدیریت ربات', Markup.keyboard([
                        [ akeys.tolerence, akeys.quotation],
                        [akeys.sendToGroup, akeys.sendToUsers, akeys.getSettings],
                        [keys.back]
                    ]).resize().extra())
            break

        }
    })

    bot.hears(akeys.commition, enter('commitionScene'))
    bot.hears(akeys.quotation, enter('quotationScene'))
    bot.hears(akeys.tolerence, enter('teloranceScene'))
    bot.hears(akeys.sendToGroup, enter('sendtogroupScene'))
    bot.hears(akeys.sendToUsers, enter('sendtousersScene'))
    bot.hears(akeys.delay, enter('delayScene'))
    bot.hears(akeys.increase, enter('increaseScene'))
    bot.hears(akeys.changeRole, enter('promoteScene'))

    bot.hears(['ن', 'ل'], async (ctx) => {
        if (ctx.user.role == config.role_owner) {
            ctx.deleteMessage()
        }
        if (helpers.isGroup && helpers.isReply) {
            let bill = await Bill.findOne({
                messageId: ctx.message.reply_to_message.message_id
            })
            if (bill == undefined) return
            if (bill.userId != ctx.user.userId) return

            if (!bill.closed && !bill.expired) {
                bill.expired = true
                ctx.telegram.deleteMessage(ctx.chat.id, bill.messageId)
                bill.save()
            }
        }
    })


    bot.hears(/\d+\s*(ف|خ)\s*\d+/, async (ctx, next) => {
        var [amount, isSell, price] = helpers.parseLafz(ctx.match[0])
        let mx = await helpers.maxCanSell(ctx)
        let mcb = await helpers.maxCanBuy(ctx)
        let mt = await helpers.matchTolerance(ctx, price)
        let bc = await ctx.setting.getBaseCharge()
        if (ctx.user.role == config.role_owner) {
            ctx.deleteMessage()
        }
        if (ctx.user.charge < bc) {
            return ctx.telegram.sendMessage(ctx.message.from.id, 'موجودی حساب شما کمتر از وجه تضمین است')
        }
        if (!isSell && amount > mcb) {
            return ctx.telegram.sendMessage(ctx.message.from.id, 'شما به حد اکثر میزان توانایی خرید خود رسیده اید\n اکانت خود را شارژ کرده یا موجودی آبشده خودتان را بفروشید')
        }
        if (isSell && amount > mx) {
            return ctx.telegram.sendMessage(ctx.message.from.id, 'شما به حد اکثر میزان توانایی فروش خود رسیده اید\n اکانت خود را شارژ کرده یا موجودی آبشده بخرید')
        }
        if (!helpers.isComplete(ctx)) {
            return ctx.telegram.sendMessage(ctx.message.from.id, 'لطفا ابتدا حساب خود را تکمیل نمایید')
        }
        if (!helpers.isGroup(ctx)) {
            return ctx.telegram.sendMessage(ctx.message.from.id, 'این دستور تنها در گروه قابل اجرا می باشد')
        }
        if (!mt) {
            let msg = 'قیمت وارد شما شما خارج از محدوده مجاز قیمت دهی می باشد'
            let tol = await ctx.setting.getTolerance()
            let q = await ctx.setting.getQuotation()
            let min = (q - tol)
            let max = (q + tol)
            msg += '\n\n'
            msg += `محدوده مجاز قیمت دهی \n\n ${min} الی ${max} `
            return ctx.telegram.sendMessage(ctx.message.from.id, msg)
        }
        ctx.values = {
            amount,
            isSell,
            price
        }
        next()
    }, async (ctx, next) => {
        let {
            amount,
            isSell,
            price
        } = ctx.values
        let bill

        if (helpers.isReply(ctx)) {
            bill = await Bill.findOne({
                messageId: ctx.message.reply_to_message.message_id
            })
            if (bill != undefined && !bill.closed) {
                if (bill.isSell != isSell && bill.amount >= amount && bill.price == price) {
                    let sellerId, buyerId
                    if (isSell) {
                        sellerId = ctx.state.user.userId
                        buyerId = bill.userId
                    } else {
                        buyerId = ctx.state.user.userId
                        sellerId = bill.userId
                    }
                    ctx.values = {
                        isSell,
                        sellerId,
                        buyerId,
                        amount,
                        price,
                        bill
                    }
                    //make a deal
                    next()
                } else {
                    console.log('they dont match')
                }
            } else {
                console.log('offer is over')
            }
        } else {

            let c = await ctx.setting.getCode()
            bill = new Bill({
                code: c,
                userId: ctx.user.userId,
                amount: amount,
                left: amount,
                price: price,
                isSell: isSell
            })
            bill = await bill.save()
            helpers.announceBill(ctx,bill)
        }
    }, helpers.makeDeal)


    bot.hears(/\d+/,
        Telegraf.branch(
            helpers.isGroup,
            Telegraf.branch(
                helpers.isReply,
                async ctx => {
                    let bill = await Bill.findOne({
                        messageId: ctx.message.reply_to_message.message_id
                    })
                    if (bill == undefined || bill.closed || bill.expired) return
                    let amount = +ctx.message.text
                    if (bill.amount < amount) return
                    let mx = await helpers.maxGold(ctx)
                    let mcb = await helpers.maxCanBuy(ctx)
                    let bc = await ctx.setting.getBaseCharge()
                    let isSell = !bill.isSell
                    if (ctx.user.role == config.role_owner) {
                        ctx.deleteMessage()
                    }

                    if (ctx.user.charge < bc) {
                        return ctx.telegram.sendMessage(ctx.message.from.id, 'موجودی حساب شما کمتر از وجه تضمین است')
                    }
                    if (!isSell && amount > mcb) {
                        return ctx.telegram.sendMessage(ctx.message.from.id, 'شما به حد اکثر میزان توانایی خرید خود رسیده اید\n اکانت خود را شارژ کرده یا موجودی آبشده خودتان را بفروشید')
                    }
                    if (isSell && amount > mx) {
                        return ctx.telegram.sendMessage(ctx.message.from.id, 'شما به حد اکثر میزان توانایی فروش خود رسیده اید\n اکانت خود را شارژ کرده یا موجودی آبشده بخرید')
                    }
                    if (!helpers.isComplete(ctx)) {
                        return ctx.telegram.sendMessage(ctx.message.from.id, 'لطفا ابتدا حساب خود را تکمیل نمایید')
                    }

                    let price = bill.price
                    let sellerId, buyerId
                    if (isSell) {
                        sellerId = ctx.user.userId
                        buyerId = bill.userId
                    } else {
                        buyerId = ctx.user.userId
                        sellerId = bill.userId
                    }
                    ctx.values = {
                        isSell,
                        sellerId,
                        buyerId,
                        amount,
                        price,
                        bill
                    }

                    helpers.makeDeal(ctx)
                }, command.start
            ), command.start
        )
    )

    // bot.on('text',(ctx) => {
    //     console.log(ctx.message.text)
    // })

    return bot
}