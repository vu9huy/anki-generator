const axios = require('axios');

async function getWordData(word) {
  try {
    const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const entry = res.data[0];

    let definition = '';
    let example = '';
    let partOfSpeech = '';

    for (const meaning of entry.meanings) {
      for (const def of meaning.definitions) {
        if (!definition && def.definition) definition = def.definition;
        if (!example && def.example) example = def.example;
      }
      if (!partOfSpeech && meaning.partOfSpeech) partOfSpeech = meaning.partOfSpeech;
      if (definition && example && partOfSpeech) break;
    }

    const pronunciation = entry.phonetic || (entry.phonetics.find(p => p.text)?.text || '');

    return {
      definition: definition || `No definition found for ${word}.`,
      example: example || `No example found for ${word}.`,
      partOfSpeech: partOfSpeech || 'unknown',
      pronunciation
    };
  } catch (e) {
    console.error(`Error fetching word: ${word}`, e);
    return null;
  }
}

module.exports = { getWordData };