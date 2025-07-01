// File: server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { getAudioBuffer } = require('./utils/tts');
const { getWordData } = require('./utils/dictionary');
const { spawn } = require('child_process');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.post('/generate', async (req, res) => {
  const words = req.body.words?.split('\n').map(w => w.trim()).filter(Boolean);
  const output = [];

  for (const word of words) {
    const data = await getWordData(word);
    if (!data) continue;

    const folder = path.join(__dirname, 'public/audio');
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

    const wordMp3 = path.join(folder, `${word}_word.mp3`);
    const defMp3 = path.join(folder, `${word}_def.mp3`);
    const exMp3 = path.join(folder, `${word}_ex.mp3`);

    await getAudioBuffer(word, wordMp3);
    await getAudioBuffer(data.definition, defMp3);
    await getAudioBuffer(data.example, exMp3);

    output.push({
      word,
      pronunciation: data.pronunciation,
      definition: data.definition,
      example: data.example,
      partOfSpeech: data.partOfSpeech,
      audio: {
        word: `${word}_word.mp3`,
        definition: `${word}_def.mp3`,
        example: `${word}_ex.mp3`
      }
    });
  }

  fs.writeFileSync('data/data.json', JSON.stringify(output, null, 2));

  const python = spawn('python3', ['generate_apkg.py']);

  python.on('close', (code) => {
    if (code === 0) {
      let html = output.map(card => `
        <div class="card">
          <h3>${card.word} <span class="pos">(${card.partOfSpeech})</span></h3>
          <p class="pronunciation">${card.pronunciation}</p>
          <audio controls src="/audio/${card.audio.word}"></audio>
          <p><strong>Definition:</strong> ${card.definition}</p>
          <audio controls src="/audio/${card.audio.definition}"></audio>
          <p><strong>Example:</strong> ${card.example}</p>
          <audio controls src="/audio/${card.audio.example}"></audio>
        </div>
      `).join('');

      html += `<a class="download-btn" href="/output.apkg" download>Download .apkg</a>`;
      res.send(html);
    } else {
      res.status(500).send('<p style="color: red">Failed to generate .apkg file.</p>');
    }
  });
});

app.listen(3000, () => console.log('Server started on http://localhost:3000'));