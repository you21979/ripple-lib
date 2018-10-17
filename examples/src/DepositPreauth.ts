import {RippleAPI} from '../../dist/npm'
// import getTestAccount from './test-wallet'

const api = new RippleAPI({server: 'wss://s.altnet.rippletest.net:51233'})

async function DepositPreauth() {
  await api.connect()

  // const a = getTestAccount('a')
  // const b = getTestAccount('b')

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

  const tx = await api.getTransaction('92F4BCBAA43B42E11FEB2726AB3C50F93C8DBBD1DD579417C307DA985904135A')
  console.log(JSON.stringify(tx, null, 2))

  await sleep(0)
}

function sleep(ms) {
  return new Promise(resolve => {
      setTimeout(resolve, ms)
  })
}

export default DepositPreauth
