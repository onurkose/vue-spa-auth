# Vue SPA Auth

Vue.js authentication package for The Authorization Code grant with "Proof Key for Code Exchange" (PKCE) flow.

## Installation

```
yarn add @onurkose/vue-spa-auth
```

or

```
npm install @onurkose/vue-spa-auth
```

## Configuration

Sample Vue Router config:

```javascript
const routes = [
  {
    path: '/',
    meta: { auth: true },
    component: () => import('layouts/restricted/Layout.vue'),
    children: [
      { path: '', component: () => import('pages/restricted/Index.vue') }
    ]
  },
  {
    path: '/auth',
    component: () => import('layouts/unrestricted/Auth.vue'),
    children: [{
      path: 'login/redirect',
      name: 'auth.login.redirect',
      component: () => import('pages/unrestricted/auth/login-redirect.vue'),
      props: (route) => ({
        prompt: route.query.prompt
      })
    }, {
      path: 'callback',
      name: 'auth.callback',
      component: () => import('pages/unrestricted/auth/callback.vue'),
      props: (route) => ({
        code: route.query.code,
        state: route.query.state,
        error: route.query.error
      })
    }]
  }
]
```
Importing plugin to your Vue.js project:

```javascript
import Vue from 'vue'

Vue.use(require('@onurkose/vue-spa-auth'), {
  paths: {
    consumer: {
      redirect: '/auth/login/redirect',
      callback: '/auth/callback',
      authenticated: '/',
      revoked: '/auth/login/redirect'
    },
    server: {
      authorize: '/oauth/authorize',
      token: '/oauth/token'
    }
  },

  apiUrl: 'https://oauth2.0-provider-url',

  authorizationParams: {
    client_id: 'client_id',
    // Use window.location.origin to prevent changing/setting different URIs for different environments. Just do not forget to add all of them to your Client record of OAuth provider.
    redirect_uri: `${window.location.origin}/#/auth/callback`,
    scope: ''
  }
})
```

## Usage

Usage examples does not includes any template (html) materials. It is totally up to you how to handle UI (display redirecting message on login-redirect page or error message presentation on callback page etc.) on these screens.

Redirecting users from Client to Auth provider:

Content of ```pages/unrestricted/auth/login-redirect.vue```:

```javascript
export default {
  name: 'AuthenticationRedirect',

  props: {
    prompt: String
  },

  data () {
    return {
      hasPrompt: false
    }
  },

  mounted () {
    if (this.prompt === undefined) {
      this.$auth.redirect()
    } else {
      this.hasPrompt = true
    }
  }
}
```

Callback page after user authorized the access request:

Content of: ```pages/unrestricted/auth/callback.vue```

```javascript
export default {
  name: 'AuthenticationCallback',

  props: {
    code: String,
    state: String,
    error: String
  },

  data () {
    return {
      loading: false,
      hasError: false,
      errorMessage: {
        title: '',
        ctx: ''
      }
    }
  },

  watch: {
    error: {
      immediate: true,
      handler: function (error) {
        this.hasError = error !== undefined

        switch (error) {
          case 'access_denied':
            this.errorMessage.title = 'Access Denied'
            this.errorMessage.ctx = 'Authentication failed because you denied access request.'
            break

          default:
            break
        }
      }
    }
  },

  mounted () {
    this.loading = true

    if (this.code !== undefined) {
      this.$auth.callback({
        code: this.code,
        state: this.state
      })
        .then(() => {
          this.loading = false
          // If callback succesfull, $auth package redirects user to paths.consumer.authenticated automatically. You can use this method to do some other work before redirection.
        })
        .catch(error => {
          this.loading = false
          this.hasError = true

          switch (error) {
            case 'invalid_request':
            case 'storage_exception':
              this.errorMessage.title = 'Something Went Wrong'
              this.errorMessage.ctx = 'An unexpected glitch caused the authentication process stop. Please try again.'
              break

            case 'state_mismatch':
              this.errorMessage.title = 'Something Went Teribbly Wrong'
              this.errorMessage.ctx = 'Some parameters within the authentication process mismatch.'
              break

            default:
              break
          }
        })
    }
  }
}
```

User logout:

I named this method as "revoke" because it will not log the user out from OAuth provider. It basically clears the token data from browser and redirects user to login screen. Therefore, it revokes the tokens from Client app. The actual logout should happen on OAuth provider and I am still working on it.

```javascript
<any-element @click="$auth.revoke()">Logout</a>
```

or in some method

```javascript
myLogoutMethod () {
  this.$auth.revoke()
}
```