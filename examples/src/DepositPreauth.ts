import {RippleAPI} from '../../dist/npm'
import getTestAccount from './test-wallet'
const a = getTestAccount('a')
const b = getTestAccount('b')

const api = new RippleAPI({server: 'wss://s.altnet.rippletest.net:51233'})

async function DepositPreauth() {
  await api.connect()

  // const trustline = await api.prepareTrustline(a.address, {
  //   currency: 'USD',
  //   counterparty: b.address,
  //   limit: '100'
  // })
  // let signed = api.sign(trustline.txJSON, a.secret)
  // let result = await api.submit(signed.signedTransaction)
  // console.log(result)

  // await sleep(5000)

  // const pmt = await api.preparePayment(b.address, {
  //   source: {
  //     address: b.address,
  //     maxAmount: {
  //       value: '10',
  //       currency: 'USD',
  //       counterparty: b.address
  //     }
  //   },
  //   destination: {
  //     address: a.address,
  //     amount: {
  //       value: '10',
  //       currency: 'USD',
  //       counterparty: b.address
  //     }
  //   }
  // })
  // signed = api.sign(pmt.txJSON, b.secret)
  // result = await api.submit(signed.signedTransaction)
  // console.log(result)

  // await sleep(5000)
  // const tx = await api.getTransaction('D6915C368D11B30C5138E95AA2F3317FEE9CD4F7E7CE0763D2102A68357D6F56')
  // console.log(JSON.stringify(tx, null, 2))

  // const balances = await api.getBalances(a.address)
  // console.log(balances)

  // const settings = await api.prepareSettings(a.address, {
  //   depositAuth: true // enable Deposit Authorization
  //   // TODO: Update docs to say "unless the sender is pre-authorized (or is the account itself)"
  // })
  // const signed = api.sign(settings.txJSON, a.secret)
  // const result = await api.submit(signed.signedTransaction)
  // console.log(result)
  // console.log('ID:', signed.id)

  // const tx = await api.getTransaction('92F4BCBAA43B42E11FEB2726AB3C50F93C8DBBD1DD579417C307DA985904135A')
  // console.log(JSON.stringify(tx, null, 2))

  // await sleep(0)

  // const pmt = await api.preparePayment(b.address, {
  //   source: {
  //     address: b.address,
  //     maxAmount: {
  //       value: '1',
  //       currency: 'XRP'
  //     }
  //   },
  //   destination: {
  //     address: a.address,
  //     amount: {
  //       value: '1',
  //       currency: 'XRP'
  //     }
  //   }
  // })
  // const signed = api.sign(pmt.txJSON, b.secret)
  // const result = await api.submit(signed.signedTransaction)
  // console.log(result)
  // await sleep(5000)
  // const tx = await api.getTransaction(signed.id)
  // console.log(JSON.stringify(tx, null, 2))
  //   { resultCode: 'tecNO_PERMISSION',
  //   resultMessage: 'No permission to perform requested operation.' }
  // {
  //   "type": "payment",
  //   "address": "rPEJ5n5NnfiqNjWouxmyoX1vJNuRivwUSj",
  //   "sequence": 2,
  //   "id": "299AA8046101E92694CCD9E81EA150C767E3F4074AF592383467577C944F4959",
  //   "specification": {
  //     "source": {
  //       "address": "rPEJ5n5NnfiqNjWouxmyoX1vJNuRivwUSj",
  //       "maxAmount": {
  //         "currency": "XRP",
  //         "value": "1"
  //       }
  //     },
  //     "destination": {
  //       "address": "rKsdkGhyZH6b2Zzd5hNnEqSv2wpznn4n6N"
  //     }
  //   },
  //   "outcome": {
  //     "result": "tecNO_PERMISSION",
  //     "timestamp": "2018-10-17T23:11:50.000Z",
  //     "fee": "0.000012",
  //     "balanceChanges": {
  //       "rPEJ5n5NnfiqNjWouxmyoX1vJNuRivwUSj": [
  //         {
  //           "currency": "XRP",
  //           "value": "-0.000012"
  //         }
  //       ]
  //     },
  //     "orderbookChanges": {},
  //     "ledgerVersion": 13556479,
  //     "indexInLedger": 2
  //   }
  // }

  // const pmt = await api.preparePayment(b.address, {
  //   source: {
  //     address: b.address,
  //     maxAmount: {
  //       value: '11',
  //       currency: 'USD',
  //       counterparty: b.address
  //     }
  //   },
  //   destination: {
  //     address: a.address,
  //     amount: {
  //       value: '11',
  //       currency: 'USD',
  //       counterparty: b.address
  //     }
  //   }
  // })
  // const signed = api.sign(pmt.txJSON, b.secret)
  // const result = await api.submit(signed.signedTransaction)
  // console.log(result)
  // await sleep(5000)
  // const tx = await api.getTransaction(signed.id)
  // console.log(JSON.stringify(tx, null, 2))

  //   { resultCode: 'tecNO_PERMISSION',
  //   resultMessage: 'No permission to perform requested operation.' }
  // {
  //   "type": "payment",
  //   "address": "rPEJ5n5NnfiqNjWouxmyoX1vJNuRivwUSj",
  //   "sequence": 3,
  //   "id": "E556C8E6469F390F9C993729C169D01632592BE858708F3FA12762FB361EFBDF",
  //   "specification": {
  //     "source": {
  //       "address": "rPEJ5n5NnfiqNjWouxmyoX1vJNuRivwUSj",
  //       "maxAmount": {
  //         "currency": "USD",
  //         "value": "11"
  //       }
  //     },
  //     "destination": {
  //       "address": "rKsdkGhyZH6b2Zzd5hNnEqSv2wpznn4n6N"
  //     }
  //   },
  //   "outcome": {
  //     "result": "tecNO_PERMISSION",
  //     "timestamp": "2018-10-17T23:13:41.000Z",
  //     "fee": "0.000012",
  //     "balanceChanges": {
  //       "rPEJ5n5NnfiqNjWouxmyoX1vJNuRivwUSj": [
  //         {
  //           "currency": "XRP",
  //           "value": "-0.000012"
  //         }
  //       ]
  //     },
  //     "orderbookChanges": {},
  //     "ledgerVersion": 13556516,
  //     "indexInLedger": 2
  //   }
  // }

  const tx = await api.prepareTransaction({
    TransactionType: 'DepositPreauth',
    Account: a.address,
    Authorize: b.address
  })
  console.log('tx', tx)
  const signed = api.sign(tx.txJSON, a.secret)
  console.log('signed', signed)

  const response = await api.submit(signed.signedTransaction)
  console.log(response)

  await sleep(5000)

  const finalResult = await api.getTransaction(signed.id)
  console.log('finalResult', JSON.stringify(finalResult, null, 2))

  // const finalResult = await api.getTransaction('AFF4AF3E87CB30B5BC0E978475A86A5F768566AD779936E9350A8B717CEEF962')
  // console.log('finalResult', JSON.stringify(finalResult, null, 2))
}

function sleep(ms) {
  return new Promise(resolve => {
      setTimeout(resolve, ms)
  })
}

export default DepositPreauth
