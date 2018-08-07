import {removeUndefined, rippleTimeToISO8601} from '../../common'
import parseTransaction from './transaction'
import {Ledger} from '../../common/types/objects'

export type FormattedLedger = {
  // TODO: properties in type don't match response object. Fix!
  // accepted: boolean,
  // closed: boolean,
  stateHash: string,
  closeTime: string,
  closeTimeResolution: number,
  closeFlags: number,
  ledgerHash: string,
  ledgerVersion: number,
  parentLedgerHash: string,
  parentCloseTime: string,
  totalDrops: string,
  transactionHash: string,
  transactions?: Array<Object>,
  rawTransactions?: string,
  transactionHashes?: Array<string>,
  rawState?: string,
  stateHashes?: Array<string>
}

function parseTransactionWrapper(ledgerVersion, tx) {
  tx = JSON.parse(JSON.stringify(tx))
  tx.meta = tx.metaData
  delete tx.metaData
  tx.ledger_index = ledgerVersion
  const result = parseTransaction(tx)
  if (!result.outcome.ledgerVersion) {
    result.outcome.ledgerVersion = ledgerVersion
  }
  return result
}

function parseTransactions(transactions, ledgerVersion) {
  if (!transactions || transactions.length === 0) {
    return {}
  }
  if (typeof transactions[0] === 'string') {
    return {transactionHashes: transactions}
  }
  const parseTransactionWithPredefinedLedgerVersion = tx =>
    parseTransactionWrapper(ledgerVersion, tx)
  const parsedTransactions = transactions.map(tx =>
    parseTransactionWithPredefinedLedgerVersion(tx)
  )
  return {
    transactions: parsedTransactions,
    rawTransactions: JSON.stringify(transactions)
  }
}

function parseState(state) {
  if (!state || state.length === 0) {
    return {}
  }
  if (typeof state[0] === 'string') {
    return {stateHashes: state}
  }
  return {rawState: JSON.stringify(state)}
}

export function parseLedger(ledger: Ledger): FormattedLedger {
  const ledgerVersion = parseInt(ledger.ledger_index || ledger.seqNum, 10)
  return removeUndefined(Object.assign({
    stateHash: ledger.account_hash,
    closeTime: rippleTimeToISO8601(ledger.close_time),
    closeTimeResolution: ledger.close_time_resolution,
    closeFlags: ledger.close_flags,
    ledgerHash: ledger.hash || ledger.ledger_hash,
    ledgerVersion: ledgerVersion,
    parentLedgerHash: ledger.parent_hash,
    parentCloseTime: rippleTimeToISO8601(ledger.parent_close_time),
    totalDrops: ledger.total_coins || ledger.totalCoins,
    transactionHash: ledger.transaction_hash
  },
  parseTransactions(ledger.transactions, ledgerVersion),
  parseState(ledger.accountState)
  ))
}
