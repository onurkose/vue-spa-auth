const utils = require('./lib/utils')
const storage = require('./lib/storage')
const CryptoJS = require('crypto-js')

module.exports = function () {
  function SPAAuth (Vue, defaultOptions, userOptions) {
    if (!storage.check()) {
      throw new Error('Browser storage is not supported.')
    }

    this.options = utils.extend(defaultOptions, [userOptions || {}])

    this.accessToken = storage.get('accessToken')
    this.authenticated = this.accessToken !== null
    this.router = Vue.router

    Vue.router.beforeEach((to, from, next) => {
      if (to.matched.some(record => record.meta.auth)) {
        if (this.authenticated) {
          next()
          return
        }

        next(this.options.paths.consumer.redirect)
      } else {
        next()
      }
    })

    Vue.prototype.$axios.interceptors.response.use(undefined, function (err) {
      return new Promise(function (resolve, reject) {
        if (err.status === 401 && err.config && !err.config.__isRetryRequest) {
          this.revokeAuthentication()
        }
        throw err
      })
    })
  }

  const base64URLEncode = (str) => {
    return CryptoJS.enc.Base64.stringify(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  const rndStr = (len) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz1234567890'
    let text = ''

    for (let i = 0; i < len; i++) {
      text += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    return text
  }

  SPAAuth.prototype.redirectToAuthentication = function (params) {
    this.state = rndStr(40)
    this.codeVerifier = rndStr(128)

    this.codeChallenge = base64URLEncode(CryptoJS.SHA256(this.codeVerifier))

    this.$auth.options.authorizationParams.state = this.state
    this.$auth.options.authorizationParams.code_challenge = this.codeChallenge
    this.$auth.options.authorizationParams.redirect_uri = encodeURIComponent(this.$auth.options.authorizationParams.redirect_uri)

    const requestParams = []

    for (const key in this.$auth.options.authorizationParams) {
      requestParams.push(`${key}=${this.$auth.options.authorizationParams[key]}`)
    }

    storage.set('state', this.state)
    storage.set('codeVerifier', this.codeVerifier)

    window.location = `${this.$auth.options.apiUrl}${this.$auth.options.paths.server.authorize}?${requestParams.join('&')}`
  }

  SPAAuth.prototype.confirmAuthentication = function (params) {
    return new Promise((resolve, reject) => {
      const state = storage.get('state')
      const codeVerifier = storage.get('codeVerifier')

      storage.clear()

      if (!state || !codeVerifier) {
        reject('storage_exception')
      } else if (state !== params.state) {
        reject('state_mismatch')
      } else {
        this.$axios.post(`${this.$auth.options.apiUrl}${this.$auth.options.paths.server.token}`, {
          grant_type: 'authorization_code',
          client_id: this.$auth.options.authorizationParams.client_id,
          redirect_uri: this.$auth.options.authorizationParams.redirect_uri,
          code_verifier: codeVerifier,
          code: params.code
        })
          .then(({ data }) => {
            if (data.access_token !== undefined) {
              storage.set('accessToken', data.access_token)
              storage.set('tokenExpiresIn', data.expires_in)
              storage.set('refreshToken', (data.refresh_token || ''))

              this.$auth.accessToken = data.access_token

              this.$auth.authenticated = true

              this.$auth.router.push(this.$auth.options.paths.consumer.authenticated)
            }
          })
          .catch((error) => {
            if (error.response) {
              reject(error.response.data.error)
            }
          })
      }
    })
  }

  SPAAuth.prototype.revokeAuthentication = function (params) {
    // storage.clear()

    this.$auth.authenticated = false

    this.$auth.router.push({ path: this.$auth.options.paths.consumer.revoked, query: { prompt: true } })
  }

  return SPAAuth
}
