// File: utils/tts.js
const fs = require('fs');
const googleTTS = require('google-tts-api');
const axios = require('axios');

async function getAudioBuffer(text, filename) {
  const url = googleTTS.getAudioUrl(text, {
    lang: 'en',
    slow: false,
    host: 'https://translate.google.com',
  });
  const res = await axios.get(url, { responseType: 'arraybuffer' });
  fs.writeFileSync(filename, res.data);
}

module.exports = { getAudioBuffer };