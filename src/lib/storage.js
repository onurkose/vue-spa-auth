module.exports = (function () {
  function isWebStorageSupported () {
    try {
      if (!window.sessionStorage) {
        throw new Error()
      }

      sessionStorage.setItem('storage_test', 1)
      sessionStorage.removeItem('storage_test')

      return true
    } catch (e) {
      return false
    }
  }

  return {
    check: function () {
      return isWebStorageSupported()
    },

    get: function (name) {
      return sessionStorage.getItem(name)
    },

    set: function (name, token) {
      return sessionStorage.setItem(name, token)
    },

    remove: function (name) {
      return sessionStorage.removeItem(name)
    },

    clear: function () {
      return sessionStorage.clear()
    },

    expiring: function () {
      return false
    }
  }
})()
