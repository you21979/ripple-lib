const RippleAPI = require('../../dist/npm').RippleAPI
const api = new RippleAPI('wss://s.altnet.rippletest.net:51233')

function greeter(person: string) {
  return 'Hello, ' + person
}

console.log(greeter('Alice'))
