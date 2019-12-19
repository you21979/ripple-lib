import * as _ from 'lodash'
import {EventEmitter} from 'events'
import {parse as parseUrl} from 'url'
import WebSocket from 'ws'
import RangeSet from './rangeset'
import {
  RippledError,
  DisconnectedError,
  NotConnectedError,
  TimeoutError,
  ResponseFormatError,
  ConnectionError,
  RippledNotInitializedError,
  RippleError
} from './errors'
var Backoff = require('backo')

/**
 * Represents an intentionally triggered web-socket disconnect code.
 * WebSocket spec allows 4xxx codes for app/library specific codes.
 * See: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent
 **/
const INTENTIONAL_DISCONNECT_CODE = 4000

/**
 * ConnectionOptions is the configuration for the Connection class.
 */
export interface ConnectionOptions {
  trace?: boolean | ((id: string, message: string) => void)
  proxy?: string
  proxyAuthorization?: string
  authorization?: string
  trustedCertificates?: string[]
  key?: string
  passphrase?: string
  certificate?: string
  timeout: number
  connectionTimeout: number
}

/**
 * ConnectionUserOptions is the user-provided configuration object. All configuration
 * is optional, so any ConnectionOptions configuration that has a default value is
 * still optional at the point that the user provides it.
 */
export type ConnectionUserOptions = Partial<ConnectionOptions>

/**
 * Ledger is used to store and reference ledger information that has been
 * captured by the Connection class.
 */
class Ledger {
  private availableVersions = new RangeSet()
  latestVersion: null | number = null
  feeBase: null | number = null
  feeRef: null | number = null

  hasVersions(lowVersion: number, highVersion: number): boolean {
    return this.availableVersions.containsRange(lowVersion, highVersion)
  }

  hasVersion(version: number): boolean {
    return this.availableVersions.containsValue(version)
  }

  update(data: {
    ledger_index?: string
    validated_ledgers?: string
    fee_base?: string
    fee_ref?: string
  }) {
    this.latestVersion = Number(data.ledger_index)
    if (data.validated_ledgers) {
      this.availableVersions.reset()
      this.availableVersions.parseAndAddRanges(data.validated_ledgers)
    } else {
      this.availableVersions.addValue(this.latestVersion)
    }
    if (data.fee_base) {
      this.feeBase = Number(data.fee_base)
    }
    if (data.fee_ref) {
      this.feeRef = Number(data.fee_ref)
    }
  }
}

/**
 * The main Connection class. Responsible for mananging an active WebSocket
 * connection to some Ripple ledger.
 */
class Connection extends EventEmitter {
  private _url: string
  private _ws: null | WebSocket = null
  private _nextRequestID: number = 1
  private _heartbeatIntervalID: null | NodeJS.Timeout = null
  private retryConnectionBackoff = new Backoff({min: 100, max: 20000})
  private promisesAwaitingConnection: {
    resolve: Function
    reject: Function
  }[] = []

  private _trace: (id: string, message: string) => void = () => {}
  private _config: ConnectionOptions
  private _ledger: Ledger

  constructor(url?: string, options: ConnectionUserOptions = {}) {
    super()
    this.setMaxListeners(Infinity)
    this._url = url
    this._ledger = new Ledger()
    this._config = {
      timeout: 20 * 1000,
      connectionTimeout: 2 * 1000,
      ...options
    }
    if (typeof options.trace === 'function') {
      this._trace = options.trace
    } else if (options.trace === true) {
      this._trace = console.log
    }
  }

  // return value is array of arguments to Connection.emit
  private _parseMessage(
    message
  ): [string, Object] | ['error', string, string, Object] {
    const data = JSON.parse(message)
    if (data.type === 'response') {
      if (!(Number.isInteger(data.id) && data.id >= 0)) {
        throw new ResponseFormatError('valid id not found in response', data)
      }
      return [data.id.toString(), data]
    } else if (data.type === undefined && data.error) {
      return ['error', data.error, data.error_message, data] // e.g. slowDown
    }

    // Possible `data.type` values include 'ledgerClosed',
    // 'transaction', 'path_find', and many others.
    if (data.type === 'ledgerClosed') {
      this._ledger.update(data)
    }
    return [data.type, data]
  }

  private _onMessage(message) {
    this._trace('receive', message)
    let parameters
    try {
      parameters = this._parseMessage(message)
    } catch (error) {
      this.emit('error', 'badMessage', error.message, message)
      return
    }
    // we don't want this inside the try/catch or exceptions in listener
    // will be caught
    this.emit.apply(this, parameters)
  }

  get _state() {
    return this._ws ? this._ws.readyState : WebSocket.CLOSED
  }

  get _shouldBeConnected() {
    return this._ws !== null
  }

  isConnected() {
    return this._state === WebSocket.OPEN
  }

  private _createWebSocket(): WebSocket {
    const options: WebSocket.ClientOptions = {}
    if (this._config.proxy !== undefined) {
      const parsedURL = parseUrl(this._url)
      const parsedProxyURL = parseUrl(this._config.proxy)
      const proxyOverrides = _.omitBy(
        {
          secureEndpoint: parsedURL.protocol === 'wss:',
          secureProxy: parsedProxyURL.protocol === 'https:',
          auth: this._config.proxyAuthorization,
          ca: this._config.trustedCertificates,
          key: this._config.key,
          passphrase: this._config.passphrase,
          cert: this._config.certificate
        },
        _.isUndefined
      )
      const proxyOptions = _.assign({}, parsedProxyURL, proxyOverrides)
      let HttpsProxyAgent
      try {
        HttpsProxyAgent = require('https-proxy-agent')
      } catch (error) {
        throw new Error('"proxy" option is not supported in the browser')
      }
      options.agent = new HttpsProxyAgent(proxyOptions)
    }
    if (this._config.authorization !== undefined) {
      const base64 = Buffer.from(this._config.authorization).toString('base64')
      options.headers = {Authorization: `Basic ${base64}`}
    }
    const optionsOverrides = _.omitBy(
      {
        ca: this._config.trustedCertificates,
        key: this._config.key,
        passphrase: this._config.passphrase,
        cert: this._config.certificate
      },
      _.isUndefined
    )
    const websocketOptions = _.assign({}, options, optionsOverrides)
    const websocket = new WebSocket(this._url, null, websocketOptions)
    // we will have a listener for each outstanding request,
    // so we have to raise the limit (the default is 10)
    if (typeof websocket.setMaxListeners === 'function') {
      websocket.setMaxListeners(Infinity)
    }
    return websocket
  }

  private _clearHeartbeatInterval = () => {
    clearInterval(this._heartbeatIntervalID)
  }

  private _startHeartbeatInterval = () => {
    this._clearHeartbeatInterval()
    this._heartbeatIntervalID = setInterval(
      () => this._heartbeat(),
      this._config.timeout
    )
  }

  /**
   * A heartbeat is just a "ping" command, sent on an interval.
   * If this succeeds, we're good. If it fails, disconnect so that the consumer can reconnect, if desired.
   */
  private _heartbeat = () => {
    return this.request({command: 'ping'}).catch(() => this.reconnect())
  }

  /**
   * Wait for a valid connection before resolving. Useful for deferring methods
   * until a connection has been established.
   */
  private _waitForReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this._shouldBeConnected) {
        reject(new NotConnectedError())
      } else if (this._state === WebSocket.OPEN) {
        resolve()
      } else {
        this.once('connected', () => resolve())
      }
    })
  }

  private async _subscribeToLedger() {
    const data = await this.request({
      command: 'subscribe',
      streams: ['ledger']
    })
    if (_.isEmpty(data) || !data.ledger_index) {
      // rippled instance doesn't have validated ledgers
      try {
        await this.disconnect()
      } catch (err) {
        // Ignore this error, propagate the root cause.
      } finally {
        throw new RippledNotInitializedError('Rippled not initialized')
        return
      }
    }
    this._ledger.update(data)
  }

  private _resolveAllAwaiting() {
    this.promisesAwaitingConnection.map(({resolve}) => resolve())
    this.promisesAwaitingConnection = []
  }

  private _rejectAllAwaiting(err: Error) {
    if (this.promisesAwaitingConnection.length === 0) {
      throw err
    }
    this.promisesAwaitingConnection.map(({reject}) => reject(err))
    this.promisesAwaitingConnection = []
  }

  private _onConnectionFailed = (errorOrCode: Error | number | undefined) => {
    if (this._ws) {
      this._ws.removeAllListeners()
      this._ws.on('error', () => {
        /* correctly listen for -- but ignore -- any future errors */
      })
      this._ws.close()
      this._ws = null
    }
    if (typeof errorOrCode === 'number') {
      const error = new NotConnectedError(
        `Connection failed with code ${errorOrCode}.`,
        {code: errorOrCode}
      )
      this._rejectAllAwaiting(error)
    } else if (errorOrCode && errorOrCode.message) {
      const error = new NotConnectedError(errorOrCode.message, errorOrCode)
      this._rejectAllAwaiting(error)
    } else {
      const error = new NotConnectedError('Connection failed.')
      this._rejectAllAwaiting(error)
    }
  }

  connect(): Promise<void> {
    if (this._state === WebSocket.OPEN) {
      return Promise.resolve()
    }
    if (this._state === WebSocket.CONNECTING) {
      return new Promise((resolve, reject) => {
        this.promisesAwaitingConnection.push({resolve, reject})
      })
    }
    if (!this._url) {
      return Promise.reject(
        new ConnectionError('Cannot connect because no server was specified')
      )
    }
    if (this._ws) {
      return Promise.reject(
        new RippleError('Websocket connection never cleaned up.', {
          state: this._state
        })
      )
    }

    // Create the connection timeout, in case the connection hangs longer than expected.
    const connectionTimeoutID = setTimeout(() => {
      this._onConnectionFailed(
        new ConnectionError(
          `Error: connect() timed out after ${this._config.connectionTimeout} ms. ` +
            `If your internet connection is working, the rippled server may be blocked or inaccessible.`
        )
      )
    }, this._config.connectionTimeout)
    // Connection listeners: these stay attached only until a connection is done/open.
    this._ws = this._createWebSocket()
    this._ws.once('error', this._onConnectionFailed)
    this._ws.once('error', () => clearTimeout(connectionTimeoutID))
    this._ws.once('close', this._onConnectionFailed)
    this._ws.once('close', () => clearTimeout(connectionTimeoutID))
    this._ws.once('open', async () => {
      // Once the connection completes successfully, remove all old listeners
      this._ws.removeAllListeners()
      clearTimeout(connectionTimeoutID)
      // Add new, long-term connected listeners for messages and errors
      this._ws.on('message', (message: string) => this._onMessage(message))
      this._ws.on('error', error =>
        this.emit('error', 'websocket', error.message, error)
      )
      // Finalize the connection and resolve all awaiting connect() requests
      try {
        this.retryConnectionBackoff.reset()
        await this._subscribeToLedger()
        this._startHeartbeatInterval()
        this._resolveAllAwaiting()
        this.emit('connected')
      } catch (err) {
        this._rejectAllAwaiting(err)
        this.disconnect()
        return
      }
      // Handle a closed connection: reconnect if it was unexpected
      this._ws.once('close', code => {
        this._clearHeartbeatInterval()
        this._ws.removeAllListeners()
        this._ws = null
        this.emit('disconnected', code)
        // If this wasn't a manual disconnect, then lets reconnect ASAP.
        if (code !== INTENTIONAL_DISCONNECT_CODE) {
          const retryTimeout = this.retryConnectionBackoff.duration()
          this._trace('reconnect', `Retrying connection in ${retryTimeout}ms.`)
          this.emit('reconnecting', this.retryConnectionBackoff.attempts)
          setTimeout(() => this.reconnect(), retryTimeout)
        }
      })
    })

    return new Promise((resolve, reject) => {
      this.promisesAwaitingConnection.push({resolve, reject})
    })
  }

  /**
   * Disconnect the websocket connection.
   * We never expect this method to reject. Even on "bad" disconnects, the websocket
   * should still successfully close with the relevant error code returned.
   * See https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent for the full list.
   * If no open websocket connection exists, resolve with no code (`undefined`).
   */
  disconnect(): Promise<number | undefined> {
    return new Promise(resolve => {
      if (this._state === WebSocket.CLOSED || !this._ws) {
        resolve(undefined)
        return
      }
      this._ws.once('close', code => resolve(code))
      if (this._state !== WebSocket.CLOSING) {
        this._ws.close(INTENTIONAL_DISCONNECT_CODE)
      }
    })
  }

  /**
   * Disconnect, then connect.
   */
  async reconnect() {
    // NOTE: We currently have a "reconnecting" event, but that only triggers through
    // an unexpected connection retry logic.
    // See: https://github.com/ripple/ripple-lib/pull/1101#issuecomment-565360423
    this.emit('reconnect')
    await this.disconnect()
    await this.connect()
  }

  async getLedgerVersion(): Promise<number> {
    await this._waitForReady()
    return this._ledger.latestVersion!
  }

  async getFeeBase(): Promise<number> {
    await this._waitForReady()
    return this._ledger.feeBase!
  }

  async getFeeRef(): Promise<number> {
    await this._waitForReady()
    return this._ledger.feeRef!
  }

  async hasLedgerVersions(
    lowLedgerVersion: number,
    highLedgerVersion: number | undefined
  ): Promise<boolean> {
    // You can call hasVersions with a potentially unknown upper limit, which
    // will just act as a check on the lower limit.
    if (!highLedgerVersion) {
      return this.hasLedgerVersion(lowLedgerVersion)
    }
    await this._waitForReady()
    return this._ledger.hasVersions(lowLedgerVersion, highLedgerVersion)
  }

  async hasLedgerVersion(ledgerVersion: number): Promise<boolean> {
    await this._waitForReady()
    return this._ledger.hasVersion(ledgerVersion)
  }

  private _send(message: string): Promise<void> {
    this._trace('send', message)
    return new Promise((resolve, reject) => {
      this._ws.send(message, undefined, error => {
        if (error) {
          reject(new DisconnectedError(error.message, error))
        } else {
          resolve()
        }
      })
    })
  }

  request(request, timeout?: number): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this._shouldBeConnected) {
        reject(new NotConnectedError())
      }

      let timer = null
      const self = this
      const id = this._nextRequestID
      this._nextRequestID += 1
      const eventName = id.toString()

      function onDisconnect() {
        clearTimeout(timer)
        self.removeAllListeners(eventName)
        reject(new DisconnectedError('websocket was closed'))
      }

      function cleanup() {
        clearTimeout(timer)
        self.removeAllListeners(eventName)
        if (self._ws !== null) {
          self._ws.removeListener('close', onDisconnect)
        }
      }

      function _resolve(response) {
        cleanup()
        resolve(response)
      }

      function _reject(error) {
        cleanup()
        reject(error)
      }

      this.once(eventName, response => {
        if (response.status === 'error') {
          _reject(
            new RippledError(response.error_message || response.error, response)
          )
        } else if (response.status === 'success') {
          _resolve(response.result)
        } else {
          _reject(
            new ResponseFormatError(
              'unrecognized status: ' + response.status,
              response
            )
          )
        }
      })

      this._ws.once('close', onDisconnect)

      // JSON.stringify automatically removes keys with value of 'undefined'
      const message = JSON.stringify(Object.assign({}, request, {id}))

      this._send(message)
        .then(() => {
          const delay = timeout || this._config.timeout
          timer = setTimeout(() => _reject(new TimeoutError()), delay)
          // Node.js won't exit if a timer is still running, so we tell Node to ignore (Node will still wait for the request to complete)
          if (timer.unref) {
            timer.unref()
          }
        })
        .catch(_reject)
    })
  }
}

export default Connection
