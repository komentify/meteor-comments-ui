const retrieveCaptchaHtml = ({ appId, appKey, appSecret }) => {
  const sweetcaptcha = require('sweetcaptcha')(appId, appKey, appSecret)

  return new Promise((res) => sweetcaptcha.api('get_html', (err, data) => res(data)))
}

const validateCaptcha = ({ appId, appKey, appSecret }, { key, value }) => {
  const data = { sckey: key, scvalue: value }

  if (Meteor.isClient) {
    return true
  }

  const sweetcaptcha = require('sweetcaptcha')(appId, appKey, appSecret)

  return new Promise((res, rej) => sweetcaptcha.api('check', data, (err, response) => {
    if (err) return rej(err)

    res(response === 'true')
  }))
}

const validateCaptchaIfRequired = (referenceId, config, data) => {
  const captchaConfig = config.sweetCaptcha(referenceId)

  if (captchaConfig) {
    const isValid = Meteor.wrapAsync((cb) => {
      validateCaptcha(captchaConfig, data)
        .then((isValid) => cb(null, isValid))
        .catch((err) => cb(err, false))
    })

    if (!isValid()) {
      throw new Meteor.Error('Invalid captcha!')
    }
  }
}

export {
  retrieveCaptchaHtml,
  validateCaptchaIfRequired,
}
