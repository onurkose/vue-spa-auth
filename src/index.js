
const SPAAuth = require('./spa-auth.js')()

const defaultOptions = {
  apiUrl: null,

  authorizationParams: {
    client_id: null,
    redirect_uri: null,
    response_type: 'code',
    scope: '',
    state: null,
    code_challenge: null,
    code_challenge_method: 'S256',
    grant_type: 'authorization_code'
  },

  consumer: {
    redirect: '/auth/login/redirect',
    callback: '/auth/callback',
    authenticated: '/home',
    revoked: '/auth/login/redirect'
  },
  server: {
    authorize: '/oauth/authorize',
    token: '/oauth/token'
  }
}

module.exports = (function () {
  return function install (Vue, opts) {
    const auth = new SPAAuth(Vue, defaultOptions, opts)

    const redirectToAuthentication = auth.redirectToAuthentication,
      confirmAuthentication = auth.confirmAuthentication,
      revokeAuthentication = auth.revokeAuthentication

    Vue.auth = auth

    Object.defineProperty(Vue.prototype, '$token', {
      get () { return auth.accessToken },
      set (value) {}
    })

    Object.defineProperties(Vue.prototype, {
      $auth: {
        get: function () {
          auth.redirect = redirectToAuthentication.bind(this)
          auth.callback = confirmAuthentication.bind(this)
          auth.revoke = revokeAuthentication.bind(this)

          return auth
        }
      }
    })
  }
})()
