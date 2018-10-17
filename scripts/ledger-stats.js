var readline = require('readline')
const {RippleAPI} = require('../dist/npm')
const api = new RippleAPI({server: 'wss://s1.ripple.com'})
const darkBlue = '\x1b[34m%s\x1b[0m'
const yellow = '\x1b[33m%s\x1b[0m'
const green = '\x1b[32m%s\x1b[0m'
const red = '\x1b[31m%s\x1b[0m'
start()
async function start() {
    console.log(darkBlue, 'Connecting...');
    await api.connect()
    console.log(green, 'Connected. Available commands: ledger_data, more, summarize.')
    const _interface = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '> '
    })
    _interface.prompt()
    _interface.on('line', str => {
        processInput(str)
        _interface.prompt()
    })
    _interface.on('close', () => {
        process.exit(0)
    })
}

async function processInput(str) {
    str = typeof(str) === 'string' && str.trim().length > 0 ? str.trim() : false;
    if (!str) {
        return
    } else if (str === 'ledger_data') {
        ledger_data()
    } else if (str === 'more') {
        more()
    } else if (str === 'summarize') {
        summarize()
    }
}

let _command, _params, _response
async function ledger_data() {
    const command = 'ledger_data'
    const params = {
      ledger_index: 'validated'
    }
    return api.request(command, params).then(response => {
        _command = command
        _params = params
        _response = response
        console.log(JSON.stringify(response, null, 2))
    }).catch(console.error);
}

async function more() {
    return api.requestNextPage(_command, _params, _response).then(next_response => {
        console.log(JSON.stringify(next_response, null, 2))
        _response = next_response
    })
}

async function summarize() {
    const summary = {}
    _response.state.forEach(element => {
        summary[element.LedgerEntryType] = summary[element.LedgerEntryType] ? summary[element.LedgerEntryType] + 1 : 1
    })
    console.log(JSON.stringify(summary, null, 2))
}
