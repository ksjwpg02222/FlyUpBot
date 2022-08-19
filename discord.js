const { Intents } = require('discord.js');
const { token } = require('./token.json');
const Discord = require('discord.js');
const axios = require('axios').default
const { GoogleSpreadsheet } = require('google-spreadsheet')
const fs = require('fs')
const path = require('path')
const googleSheetKey = './googleSheetKey.json'


const clinet = new Discord.Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ]
})

clinet.on('ready', () => {
    console.log('ready')
    console.log(Intents.FLAGS.GUILDS)
    console.log(Intents.FLAGS.GUILD_MESSAGES)

})

clinet.on('messageCreate', async (msg) => {
    const words = msg.content.split('/')
    console.log(words)


    if (words[2] == 'albiononline.com') {
        const eventId = words[words.length - 1]
        if (handleEventIdExist(eventId)) {
            msg.channel.send('這個補裝紀錄已經存在')
            return
        }

        let jsonData
        try {
            const jsonEntity = fs.readFileSync('./data.json')
            jsonData = JSON.parse(jsonEntity)
        } catch {
            jsonData = {}
        }
        jsonData = { ...jsonData, [eventId]: eventId }
        handleWriteFile(jsonData)



        const { data } = await axios.get('https://gameinfo.albiononline.com/api/gameinfo/events/' + eventId)
        await addData('1GR_8-DQdRmtAvGZ6oqW9K-cNr60B9klRfn_JDXvOBF4', '0', data.Victim, eventId)

        msg.channel.send('補裝申請完成')

    }

    if (msg.content === 'test') {
        await getData('1GR_8-DQdRmtAvGZ6oqW9K-cNr60B9klRfn_JDXvOBF4', '1742503688')
        msg.channel.send('hello')
    }
})

clinet.login(token)

function handleWriteFile(data) {
    fs.writeFile('./data.json', JSON.stringify(data), function () {
        console.log('資料儲存成功')
    })
}

function handleEventIdExist(eventId) {

    let data
    try {
        const jsonData = fs.readFileSync('./data.json')
        data = JSON.parse(jsonData)
    } catch {
        data = {}
    }

    return Object.keys(data).some(key => key === eventId)
}

async function getData(docID, sheetID) {
    const result = [];
    const doc = new GoogleSpreadsheet(docID);
    const creds = require(googleSheetKey);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    const sheet = doc.sheetsById[sheetID];
    const rows = await sheet.getRows();
    for (row of rows) {
        result.push(row._rawData);
      }
    console.log(result)
};

async function addData(docID, sheetID, eventData, eventId) {
    const doc = new GoogleSpreadsheet(docID);
    const creds = require(googleSheetKey);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    const items = eventData.Equipment
    const sheet = doc.sheetsById[sheetID];
    await sheet.addRow({
        名稱: "=HYPERLINK(\"https://albiononline.com/en/killboard/kill/" + eventId + "\",\"" + eventData.Name + "\")",
        武器: items.MainHand.Type,
        副手: items.OffHand?.Type,
        頭: items.Head.Type,
        身: items.Armor.Type,
        腳: items.Shoes.Type,
        披風: items.Cape.Type,
        坐騎: items.Mount.Type,
        事件ID: eventId
    })
}


async function recordData() {

}