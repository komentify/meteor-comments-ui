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

const validateCaptchaIfRequired = async (referenceId, config, data) => {
  const captchaConfig = config.sweetCaptcha(referenceId)

  if (captchaConfig) {
    const valid = await validateCaptcha(captchaConfig, data)

    if (!valid) {
      throw new Meteor.Error('Invalid captcha!')
    }
  }
}

export {
  retrieveCaptchaHtml,
  validateCaptchaIfRequired,
}
