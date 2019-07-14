const mongoose = require("./_db");
const Schema = mongoose.Schema;
const queue = require('../queue')

const config = require("../config");

const settingSchema = new Schema({
    quotation: {
        type: Number,
        default: 1800
    },
    tolerence: {
        type: Number,
        default: 5
    },
    commition: {
        type: Number,
        default: 10
    },
    group: Number,
    active: {
        type: Boolean,
        default: false
    },
    baseCharge: {
        type: Number,
        default: 1150
    },
    delay: {
        type: Number,
        default: 60
    },
    code: {
        type: Number,
        default: 100000
    }
})

const Setting = mongoose.model("Setting", settingSchema)

module.exports = (async () => {
    let s = await Setting.findOne()
    if (s == undefined) {
        s = new Setting()
        await s.save()
    }
    return {
        getCode: async () => {
            let setting = await Setting.findOne()
            let c = setting.code++
            setting = await setting.save()
            return c
        },
        getQuotation: async () => {
            let setting = await Setting.findOne()
            return setting.quotation
        },
        setQuotation: (v) => {
            queue.push(async () => {
                let setting = await Setting.findOne()
                setting.quotation = v
                setting = await setting.save()
            })
        },
        getDelay: async () => {
            let setting = await Setting.findOne()
            return setting.delay
        },
        setDelay: (v) => {
            queue.push(async () => {
                let setting = await Setting.findOne()
                setting.delay = v
                setting = await setting.save()
            })
        },
        getTolerance: async () => {
            let setting = await Setting.findOne()
            return setting.tolerence
        },
        setTolerence: (v) => {
            queue.push(async () => {

                let setting = await Setting.findOne()
                setting.tolerence = v
                setting = await setting.save()
            })
        },
        getCommition: async () => {
            let setting = await Setting.findOne()
            return setting.commition
        },
        setCommition: (v) => {
            queue.push(async () => {
                
                let setting = await Setting.findOne()
                setting.commition = v
                setting = await setting.save()
            })
        },
        getBaseCharge: async () => {
            let setting = await Setting.findOne()
            return setting.baseCharge
        },
        setBaseCharge:  (v) => {
            queue.push(async () => {
                
                let setting = await Setting.findOne()
                setting.baseCharge = v
                setting = await setting.save()
            })
        },
        getActiveGroup: async () => {
            let setting = await Setting.findOne()
            return setting.group
        },
        setActiveGroup: (v) => {
            queue.push(async () => {
                let setting = await Setting.findOne()
                setting.group = v
                console.log(setting.group)
                await setting.save()
            })
        },
        itsActiveGroup: async (v) => {
            let setting = await Setting.findOne()
            console.log(setting.group)
            console.log(v)
            let bool = false
            if(setting.group != undefined && setting.group == v) bool = true
            return bool
        },
        IsActive: async () => {
            let setting = await Setting.findOne()
            return setting.active
        },
        activate: () => {
            queue.push(async () => {
                let setting = await Setting.findOne()
                setting.active = true
                await setting.save()
            })
        },
        deActivate: () => {
            queue.push(async () => {
                
                let setting = await Setting.findOne()
                setting.active = false
                await setting.save()
            })
        },

    }
})