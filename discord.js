const { Intents } = require('discord.js');
// const { token } = require('./token.json');
const token = process.env.token
const Discord = require('discord.js');
const axios = require('axios').default
const { GoogleSpreadsheet } = require('google-spreadsheet')
const fs = require('fs');
const googleSheetKey = './googleSheetKey.json'
const AsyncLock = require('async-lock');
var lock = new AsyncLock({ domainReentrant: true });

const colNumMapper = {
    'T4': 'C',
    'T4.1': 'D',
    'T4.2': 'E',
    'T4.3': 'F',
    'T5': 'G',
    'T5.1': 'H',
    'T5.2': 'I',
    'T5.3': 'J',
    'T6': 'K',
    'T6.1': 'L',
    'T6.2': 'M',
    'T6.3': 'N',
    'T7': 'O',
    'T7.1': 'P',
    'T7.2': 'Q',
    'T7.3': 'R',
    'T8': 'S',
    'T8.1': 'T',
    'T8.2': 'U',
    'T8.3': 'V',
}

const spreadSheetsId = '1Ca6zm5LCpdRiALlxwHES9xhdfSHgjUzjKUwJNkup25U'
const mapperSheetId = 1670189158
const workSheetId = 1382021423
const express = require('express');
const app = express();

app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.listen(3000, function () {
    console.log('Example app listening!');
});

const clinet = new Discord.Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ]
})

clinet.on('ready', () => {
    console.log('ready')
})

clinet.on('messageCreate', async (msg) => {
    const words = msg.content.split('/')

    if (words[2] == 'albiononline.com') {
        lock.acquire('key', async function (done) {

            async function work() {
                const eventId = words[words.length - 1]
                if (handleEventIdExist(eventId)) {
                    msg.reply('這個補裝紀錄已經存在')
                    return
                }

                try {
                    const { data } = await axios.get(`https://gameinfo.albiononline.com/api/gameinfo/events/${eventId}`)
                    if (data.Victim.GuildName !== 'fly up') {
                        msg.reply('此人員並不是公會成員。')
                        return
                    }

                    await addData(spreadSheetsId, workSheetId, data.Victim, eventId)

                    let jsonData = await handleReadJson()
                    jsonData[eventId] = eventId
                    handleWriteFile(jsonData)
                    msg.reply('補裝申請完成。')
                } catch {
                    msg.reply('發生錯誤，請洽相關管理人員。')
                }

            }
            await work();

            done('no err', 'ok');
        }, function (err, ret) {
        });

    }
})

clinet.login(token)

function handleWriteFile(data) {
    fs.writeFileSync('./data.json', JSON.stringify(data), function () {
        console.log('資料儲存成功')
    })
}

function handleEventIdExist(eventId) {

    const data = handleReadJson()

    return Object.keys(data).some(key => key === eventId)
}

function handleReadJson() {
    let data
    try {
        const jsonData = fs.readFileSync('./data.json')
        data = JSON.parse(jsonData)
    } catch {
        data = {}
    }
    return data
}

async function getData(docID, sheetID) {
    const doc = new GoogleSpreadsheet(docID);
    const creds = require(googleSheetKey);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    const sheet = doc.sheetsById[sheetID];
    const rows = await sheet.getRows();
    return rows.reduce((prev, current) => {
        const row = current._rawData
        return {
            ...prev,
            [row[0]]: {
                name: row[1],
                rowNum: current._rowNumber
            }
        }
    }, {})
};

async function addData(docID, sheetID, eventData, eventId) {
    const doc = new GoogleSpreadsheet(docID);
    const creds = require(googleSheetKey);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    const items = eventData.Equipment
    const sheet = doc.sheetsById[sheetID];

    const itemsInfo = await handleItemName(items)

    await sheet.addRows([{
        名稱: `=HYPERLINK("https://albiononline.com/en/killboard/kill/${eventId}","${eventData.Name}")`,
        ...itemsInfo.data,
        事件ID: eventId,
    }, {
        名稱: "價格",
        ...itemsInfo.price,
        事件ID: "",
    }])

}

async function handleItemName(items) {

    const itemsMapper = await getData(spreadSheetsId, mapperSheetId)

    function handleDisplayName(type) {
        if (!type) {
            return type
        }

        const item = handleSplitString(type)

        return itemsMapper[item.itemInfo.join('_')]?.name ? item.itemLevelAndEnchantmentLevel + itemsMapper[item.itemInfo.join('_')].name : type
    }

    function handlePrice(type) {
        if (!type) {
            return 0
        }
        const item = handleSplitString(type)

        return itemsMapper[item.itemInfo.join('_')]?.name ?
            `=IMPORTRANGE("https://docs.google.com/spreadsheets/d/${spreadSheetsId}/edit#gid=${workSheetId}","裝備列表!${colNumMapper[item.itemLevelAndEnchantmentLevel]}${itemsMapper[item.itemInfo.join('_')].rowNum}")` :
            0
    }

    function handleSplitString(type) {
        const arr = type?.split('@')
        const enchantmentLevel = arr[1] || '';
        const itemInfo = arr[0].split('_');
        const itemLevel = itemInfo.shift()
        const itemLevelAndEnchantmentLevel = itemLevel + (enchantmentLevel ? '.' + enchantmentLevel : '');

        return {
            itemInfo: itemInfo,
            itemLevelAndEnchantmentLevel: itemLevelAndEnchantmentLevel
        }
    }

    const data =
    {
        武器: handleDisplayName(items.MainHand?.Type),
        副手: handleDisplayName(items.OffHand?.Type),
        頭: handleDisplayName(items.Head?.Type),
        身: handleDisplayName(items.Armor?.Type),
        腳: handleDisplayName(items.Shoes?.Type),
        披風: handleDisplayName(items.Cape?.Type),
        坐騎: handleDisplayName(items.Mount?.Type),
    }

    const price =
    {
        武器: handlePrice(items.MainHand?.Type),
        副手: handlePrice(items.OffHand?.Type),
        頭: handlePrice(items.Head?.Type),
        身: handlePrice(items.Armor?.Type),
        腳: handlePrice(items.Shoes?.Type),
        披風: handlePrice(items.Cape?.Type),
        坐騎: handlePrice(items.Mount?.Type),
    }

    return { data: data, price: price }
}


