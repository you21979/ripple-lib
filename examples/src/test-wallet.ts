/**
 * Load wallet file ~/.ripple_wallet.json
 *
 * Must be a JSON object with accounts `a` and `b`,
 * each containing an `address` and `secret`.
 */

const fs = require('fs')
const path = require('path')

function getUserHomePath() {
  return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE
}

function loadWallet() {
  const walletPath = path.join(getUserHomePath(), '.ripple_wallet.json')
  try {
    const walletRaw = fs.readFileSync(walletPath, {encoding: 'utf8'}).trim()
    return JSON.parse(walletRaw)
  } catch (e) {
    return null
  }
}

const WALLET = loadWallet()

function getTestAccount(name) {
  if (WALLET === null) {
    throw new Error('Could not load .ripple_wallet.json file in home directory')
  }
  return WALLET[name]
}

export default getTestAccount
