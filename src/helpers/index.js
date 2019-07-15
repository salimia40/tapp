const groupsThatImAdmin = []
const Bill = require('../model/Bill')
const User = require('../model/User')
const puppeteer = require('puppeteer')
const config = require('../config')

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

const printImage = async (content) => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({
        width: 1280,
        height: 800
    })
    await page.setContent(content)
    let res = await page.screenshot({
        fullPage: true
    })
    await browser.close()
    return res
}


const options = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
};
const formatter = new Intl.DateTimeFormat([], options);

const opfImage = async (ctx, opfs) => {
    let rows = ''
    let i = 0
    for (var z = 0; z < opfs.length; ++z) {
        let bill = opfs[z]
        let style, deal
        if (bill.isSell) {
            style = 'bg-danger'
            deal = 'فروش'

        } else {
            style = 'bg-primary'
            deal = 'خرید'

        }

        rows += config.templates.opfRow.replace("INDEX", ++i)
            .replace("DEAL-STYLE", style)
            .replace("DEAL", deal)
            .replace('AMOUNT', bill.left)
            .replace('PRICE', toman(bill.price))
            .replace('CODE', bill.code)

    }

    let content = config.templates.opfTemp.replace('ROWS', rows)
        .replace('NAME', ctx.user.name)
        .replace('DATE', formatter.format(Date.now()))

    let res = await printImage(content)
    return res

}


const toman = (v) => {
        if (v == undefined) v = 0
        return formatNumber(Math.round(v * 10) * 100)
    },
    formatNumber = (v) => {
        return v.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
    }
const matchTolerance = async (ctx, price) => {
    let tol = await ctx.setting.getTolerance()
    let q = await ctx.setting.getQuotation()
    return (price >= (q - tol) && price <= (q + tol))
}
const maxGold = async (ctx) => {
    let bc = await ctx.setting.getBaseCharge()
    return Math.round(ctx.user.charge / bc)
}
const countProfit = (buyPrice, sellPrice) => {
    let diff = sellPrice - buyPrice
    return diff * 23.08
}
const parseLafz = l => {
    let a, b, isSell
    isSell = l.includes('ف')
    if (isSell) {
        [a, b] = l.split('ف')
    } else {
        [a, b] = l.split('خ')
    }
    a = +a
    b = +b
    return [a, isSell, b]
}
const maxCanBuy = async (ctx) => {
    let bc = await ctx.setting.getBaseCharge()
    let mx = Math.round(ctx.user.charge / bc)
    let bills = await Bill.find({
        closed: true,
        userId: ctx.user.userId,
        isSell: false,
        left: {
            $gt: 0
        }
    })
    let am = 0
    for (var i = 0; i < bills.length; i++) {
        am += bills[i].left
    }
    mx -= am
    if (mx < 0) mx = 0
    return mx
}
const maxCanSell = async (ctx) => {
    let bc = await ctx.setting.getBaseCharge()
    let mx = Math.round(ctx.user.charge / bc)
    let bills = await Bill.find({
        closed: true,
        userId: ctx.user.userId,
        isSell: true,
        left: {
            $gt: 0
        }
    })
    let am = 0
    for (var i = 0; i < bills.length; i++) {
        am += bills[i].left
    }
    mx -= am
    if (mx < 0) mx = 0
    return mx
}
const buyAvg = async (userId) => {
    let mgs = await Bill.find({
        userId,
        closed: true,
        isSell: false,
        left: {
            $gt: 0
        }
    })

    let avg = 0
    if (mgs.length > 0) {
        let sum = 0
        let am = 0
        console.log('sum',sum)
        console.log('am',am)
        console.log('loop started')

        await asyncForEach(mgs, mg => {
            
        console.log('price',mg.price)
        console.log('left',mg.left)
            sum += mg.price * mg.left //don't forget to add the base
            am += mg.left
        console.log('sum',sum)
        console.log('am',am)
        })
        avg = sum / am
        console.log('avg',avg)
    }
    return avg
}
const sellAvg = async (userId) => {
    let mgs = await Bill.find({
        closed: true,
        userId,
        isSell: true,
        left: {
            $gt: 0
        }
    })

    let avg = 0
    if (mgs.length > 0) {
        let sum = 0
        let am = 0
        await asyncForEach(mgs, mg => {
            sum += mg.price * mg.left //don't forget to add the base
            am += mg.left
        })
        avg = sum / am
    }
    return avg
}


const isGroupAdmin = async (ctx, botUser) => {
    let isBdmin = false
    if (groupsThatImAdmin.includes(ctx.chat.id)) isBdmin = true
    if (isBdmin) return isBdmin
    var mems = await ctx.telegram.getChatAdministrators(ctx.chat.id)

    await asyncForEach(mems, mem => {
        if (mem.user.id == botUser.id) {
            groupsThatImAdmin.push(ctx.chat.id)
            isBdmin = true
        }
    })
    return isBdmin
}
const countAwkwardness = async (ctx, bill) => {
    // if (bill.left) {
    //     return {
    //         awk: 0,
    //         sellprice: 0
    //     }
    // }
    var q = bill.price
    var awk
    var user = await User.findOne({
        userId: bill.userId
    })
    console.log('user.charge', user.charge)
    console.log(bill.userId)
    console.log(user)
    awk = user.charge * 4.3318 / 100
    console.log('user.charge * 4.3318 / 100', awk)
    var obills = await Bill.find({
        userId: bill.userId,
        closed: true,
        left: {
            $gt: 0
        },
        isSell: bill.isSell
    })
    var os = 0
    await asyncForEach(obills, obill => {
        // if (obill.left != undefined)
        console.log('obill.left', obill.left)
        os += obill.left
    })

    if (bill.isSell) {
        awk *= 1.15
    } else {
        awk *= 0.85
    }
    console.log('awk', awk)
    console.info('bill.left', bill.left)
    console.info('os', os)
    console.info('bill.isSell', bill.isSell)

    awk = awk / os


    console.log('awk = awk / os', awk)
    if (bill.isSell) {
        awk = q + awk
    } else {
        awk = q - awk
    }
    console.log('awk = q -+ awk', awk)
    var sellprice = awk


    if (bill.isSell) {
        sellprice += 3
    } else {
        sellprice -= 3
    }

    // awk = awk / bill.left
    // تقسیم بر تعداد فاکتور باز شود

    return {
        awk,
        sellprice
    }
}
const userToString = async (ctx) => {
    let user = ctx.user
    let chat = await ctx.getChat()
    let res = `شماره کاربری : ${user.userId}
نام : ${user.name}
تلفن: ${user.phone} \n`
    if (!chat.username)
        res += `آیدی تلگرام : ${chat.username} \n`
    res += `مقدار پس انداز : ${toman(user.charge)} تومان
شماره کارت : ${user.bank.number}
        `
    return res;

}




const closeDeals = async (ctx, b, price) => {
    let totalProfit = 0
    let factorsClosed = 0
    let totalCommition = 0

    let bills = await Bill.find({
        userId: b.userId,
        closed: true,
        expired: false,
        isSell: !b.isSell,
        left: {
            $gt: 0
        }
    })
    let am = b.amount
    let billsRemained = 0
    let commition = await ctx.setting.getCommition()

    await asyncForEach(bills, async bill => {
        if (am > 0) {
            if (bill.left > am) {
                if (bill.sells == undefined) bill.sells = []
                bill.sells.push({
                    am,
                    price
                })
                bill.left -= am
                billsRemained++
                await bill.save()
                am = 0
            } else {
                am -= bill.left

                if (bill.sells == undefined) bill.sells = []
                bill.sells.push({
                    amount: bill.left,
                    price
                })
                bill.left = 0
                bill = await bill.save()

                /**
                 * using let is absulutly furbidden
                 */
                var sum = 0
                await asyncForEach(bill.sells, (sell) => {
                    console.log(sell)
                    console.log(bill.price)
                    var x
                    console.log(x)
                    console.log(bill.isSell)
                    if (bill.isSell) {
                        x = bill.price - sell.price
                    } else {
                        x = sell.price - bill.price
                    }
                    console.log(x)
                    x *= sell.amount
                    console.log(x)
                    console.log(sum)
                    sum += x
                    console.log(sum)
                })
                sum *= 100
                console.log(sum)
                sum /= 4.3318
                console.log(sum)
                if (!isNaN(sum))
                    bill.profit = sum
                bill.commition = bill.amount * commition
                totalCommition += bill.commition
                totalProfit += bill.profit
                await bill.save()
                factorsClosed++
            }
        } else {
            billsRemained += bill.left
        }
    })
    return {
        totalCommition,
        totalProfit,
        factorsClosed,
        amountLeft: am,
        billsRemained
    }
}

const sellerBillToString = async (bill, result) => {
    let {
        totalCommition,
        totalProfit,
        factorsClosed,
        amountLeft,
        billsRemained
    } = result


    let user = await User.findOne({
        userId: bill.userId
    })


    let sopfs = await Bill.find({
        userId: bill.userId,
        closed: true,
        left: {
            $gt: 0
        },
        isSell: true
    })

    let bopfs = await Bill.find({
        userId: bill.userId,
        closed: true,
        left: {
            $gt: 0
        },
        isSell: false
    })

    let avg = await sellAvg(bill.userId)

    let final = totalProfit - totalCommition
    let ft = ''
    if (final < 0) {
        ft = 'ضرر'
        final = Math.abs(final)
    } else
        ft = 'سود'

    let msg = `
👤 معامله گر گرامی ${user.name}
            
مقدار 🔴 فروش  : ${bill.amount} واحد به قیمت : ${toman(bill.price)}
            
📈 سود یا ضرر شما: ${toman(final)+ ' ' + ft}`

    let avgNeeded = false
    let ops = 0
    if (billsRemained > 0) {
        bopfs.forEach(v => {
            ops += v.left
        })
        msg += `

⭕️ شما تعداد ${ops} واحد فاکتور باز خرید دارید.`
    } else if (sopfs.length > 0) {
        sopfs.forEach(v => {
            ops += v.left
        })
        msg += `

⭕️ شما تعداد ${ops} واحد فاکتور باز فروش دارید.`
        avgNeeded = true
    } else {
        msg += `

⭕️ معاملات شما بسته شد و در حال حاضر فاکتور بازی ندارید`
        // } else {
        // avgNeeded = true
    }
    if (avgNeeded && bill.left > 0) {
        msg += `
            
⭕️ میانگین فاکتور فروش: ${toman(avg)}
                
⭕️ چناچه قیمت مظنه به : ${toman(bill.awkwardness.awk)} برسد 
                
📣 فاکتور فروش شما به قیمت: ${toman(bill.awkwardness.sellprice)} حراج می شود. `
    }

    msg += `
        
💶 موجودی شما برابر است با : ${toman(user.charge)}`
    return msg



}

const announceBill = async (ctx, bill) => {
    let z
    let emo
    if (bill.isSell) {
        emo = '🔴'
        z = 'ف'

    } else {
        emo = '🔵'
        z = 'خ'
    }
    let usr = await User.findOne({
        userId: bill.userId
    })
    var delay = await ctx.setting.getDelay()
    let msg = emo + ' ' + usr.username + ' ' + bill.amount + ' ' + z + ' ' + bill.price
    let res = await ctx.telegram.sendMessage(ctx.chat.id, msg)
    bill.messageId = res.message_id
    await bill.save()
    setTimeout(async () => {
        bill = await Bill.findById(bill._id)
        if (bill == undefined) {
            console.log('hmmmm')
        } else if (!bill.closed && !bill.expired) {
            ctx.telegram.editMessageText(ctx.chat.id, bill.messageId, null, msg + '  منقضی شد').catch(console.warn('msg already deleted'))
            setTimeout(() => {
                ctx.telegram.deleteMessage(ctx.chat.id, bill.messageId).catch(console.warn('msg already deleted'))
            }, delay * 250)
            Bill.findByIdAndDelete(bill._id).exec()
        }
        if (bill != undefined && bill.expired) {
            Bill.findByIdAndDelete(bill._id).exec()
        }
    }, delay * 1000)
}


const buyerBillToString = async (bill, result) => {
    let {
        totalCommition,
        totalProfit,
        factorsClosed,
        amountLeft,
        billsRemained
    } = result


    let user = await User.findOne({
        userId: bill.userId
    })


    let sopfs = await Bill.find({
        userId: bill.userId,
        closed: true,
        left: {
            $gt: 0
        },
        isSell: true
    })

    let bopfs = await Bill.find({
        userId: bill.userId,
        closed: true,
        left: {
            $gt: 0
        },
        isSell: false
    })

    let avg = await buyAvg(bill.userId)

    let final = totalProfit - totalCommition
    let ft = ''
    if (final < 0) {
        ft = 'ضرر'
        final = Math.abs(final)
    } else
        ft = 'سود'


    let msg = `
👤 معامله گر گرامی ${user.name}
            
مقدار 🔵 خرید  : ${bill.amount} واحد به قیمت : ${toman(bill.price)}
            
📈 سود یا ضرر شما: ${toman(final)+ ' ' + ft}`

    let avgNeeded = false
    let ops = 0
    if (billsRemained > 0) {
        sopfs.forEach(v => {
            ops += v.left
        })
        msg += `

⭕️ شما تعداد ${ops} واحد فاکتور باز فروش دارید.`
    } else if (bopfs.length > 0) {
        bopfs.forEach(v => {
            ops += v.left
        })
        msg += `

⭕️ شما تعداد ${ops} واحد فاکتور باز خرید دارید.`
        avgNeeded = true
    } else {
        msg += `

⭕️ معاملات شما بسته شد و در حال حاضر فاکتور بازی ندارید`
        // } else {
        //     avgNeeded = true
    }
    if (avgNeeded && bill.left > 0) {
        msg += `
        
⭕️ میانگین فاکتور خرید: ${toman(avg)}
            
⭕️ چناچه قیمت مظنه به : ${toman(bill.awkwardness.awk)} برسد 
            
📣 فاکتور خرید شما به قیمت: ${toman(bill.awkwardness.sellprice)} حراج می شود. `
    }

    msg += `
        
        💶 موجودی شما برابر است با : ${toman(user.charge)}`
    return msg

}



const billToSring = async (bill, result) => {
    let res
    if (bill.isSell)
        res = await sellerBillToString(bill, result)
    else res = buyerBillToString(bill, result)
    return res

}


const makeDeal = async (ctx) => {
    let {
        isSell,
        sellerId,
        buyerId,
        amount,
        price,
        bill
    } = ctx.values
    if (sellerId == buyerId) return
    let sellerBill, buyerBill, cb, cs
    cb = await ctx.setting.getCode()
    cs = await ctx.setting.getCode()

    ctx.telegram.deleteMessage(ctx.chat.id, bill.messageId)

    if (isSell) {
        if (bill.amount == amount) {
            buyerBill = Object.assign(bill, {
                closed: true,
                isSell: false,

                left: amount,
                sellerId,
                buyerId,
            })
        } else {

            buyerBill = new Bill({
                code: cb,
                isSell: false,
                closed: true,
                userId: buyerId,

                left: amount,
                sellerId,
                buyerId,
                amount: amount,
                price: price
            })

            /**update bill */
            bill.amount -= amount
            bill = await bill.save()
            await announceBill(ctx, bill)

        }
        sellerBill = new Bill({
            code: cs,
            isSell: true,
            closed: true,
            userId: sellerId,
            left: amount,
            sellerId,
            buyerId,
            amount: amount,
            price: price
        })
    } else {
        if (bill.amount == amount) {
            sellerBill = Object.assign(bill, {
                closed: true,
                isSell: true,

                left: amount,
                sellerId,
                buyerId,
            })
        } else {
            sellerBill = new Bill({
                code: cs,
                isSell: true,
                closed: true,
                userId: sellerId,

                left: amount,
                sellerId,
                buyerId,
                amount: amount,
                price: price
            })
            /**update bill */
            bill.amount -= amount

            bill = await bill.save()
            await announceBill(ctx, Bill)
        }
        buyerBill = new Bill({
            code: cb,
            isSell: false,
            closed: true,
            userId: buyerId,
            left: amount,
            sellerId,
            buyerId,
            amount: amount,
            price: price
        })
    }

    /***
     * 
     */

    let selRes = await closeDeals(ctx, sellerBill, price)
    let buyRes = await closeDeals(ctx, buyerBill, price)


    /**
     * if user can buy more than 1 unit count avrages
     */

    // todo count users profit

    sellerBill.left = selRes.amountLeft
    console.log(selRes.amountLeft)
    console.log(buyRes.amountLeft)
    sellerBill.commition = selRes.totalCommition
    sellerBill.profit = selRes.totalProfit
    buyerBill.left = buyRes.amountLeft
    buyerBill.profit = buyRes.totalProfit
    buyerBill.commition = buyRes.totalCommition
    sellerBill = await sellerBill.save()
    buyerBill = await buyerBill.save()
    sellerBill.awkwardness = await countAwkwardness(ctx, sellerBill)
    buyerBill.awkwardness = await countAwkwardness(ctx, buyerBill)
    sellerBill = await sellerBill.save()
    buyerBill = await buyerBill.save()

    let suser = await User.findOne({
        userId: sellerBill.userId
    })
    let buser = await User.findOne({
        userId: buyerBill.userId
    })
    buser.charge += buyRes.totalProfit
    buser.charge -= buyRes.totalCommition
    suser.charge += selRes.totalProfit
    suser.charge -= selRes.totalCommition

    await buser.save()
    await suser.save()

    let owner = await User.findOne({
        role: config.role_owner
    })
    owner.charge += buyRes.totalCommition + selRes.totalCommition
    await owner.save()

    let prev = await billPrev(sellerBill)
    let sb = await billToSring(sellerBill, selRes)
    let bb = await billToSring(buyerBill, buyRes)
    ctx.reply(prev)
    ctx.telegram.sendMessage(sellerId, sb)
    ctx.telegram.sendMessage(buyerId, bb)
}


const billPrev = async (bill) => {
    let seller, suser
    let res

    let buser = await User.findOne({
        userId: bill.buyerId
    })

    if (bill.closed) {
        suser = await User.findOne({
            userId: bill.sellerId
        })
        seller = suser.name
    }

    res = ''

    if (bill.closed) {
        res += `\n 🔵 خریدار: ${buser.name}`
        res += `\n 🔴 فروشنده: ${seller}`
    }
    res += `\n مقدار: ${bill.amount}`
    res += ` قیمت: ${toman(bill.price)} تومان`
    res += `\n شماره رسید: ${bill.code}`
    return res
}


module.exports = {
    asyncForEach,
    printImage,
    formatNumber,
    opfImage,
    toman,
    matchTolerance,
    maxGold,
    countProfit,
    parseLafz,
    maxCanBuy,
    maxCanSell,
    buyAvg,
    sellAvg,
    isGroupAdmin,
    userToString,
    countAwkwardness,
    closeDeals,
    sellerBillToString,
    buyerBillToString,
    billToSring,
    billPrev,
    announceBill,
    makeDeal,

    isOwner: (ctx) => {
        return ctx.user.role == config.role_owner
    },
    isAdmin: (ctx) => {
        return ctx.user.role == config.role_owner || ctx.user.role == config.role_admin
    },
    isComplete: (ctx) => {
        return ctx.user.stage == 'completed'
    },
    isReply: (ctx) => {
        return ctx.message.reply_to_message != undefined
    },
    isPrivate: (ctx) => {
        return ctx.chat.type == 'private'
    },
    isGroup: (ctx) => {
        return ctx.chat.type == 'group' || ctx.chat.type == "supergroup"
    }
}