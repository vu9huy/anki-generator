import express from 'express';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { spawn } from 'child_process';
import { getAudioBuffer } from './utils/tts.js';
import { getWordData } from './utils/dictionary.js';
import { genAnki } from './utils/gen_anki.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import multer from 'multer';
import Papa from 'papaparse';
import "dotenv/config.js";

const app = express();

// __dirname replacement for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.txt', '.csv'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt and .csv files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/public/index.html'));
});

// Function to extract words from file content
function extractWordsFromFile(fileContent, filename) {
  const fileExt = path.extname(filename).toLowerCase();
  
  if (fileExt === '.txt') {
    // For .txt files, split by lines and clean up
    return fileContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  } else if (fileExt === '.csv') {
    // For .csv files, parse with Papa Parse
    const parsed = Papa.parse(fileContent, {
      header: false,
      skipEmptyLines: true,
      delimiter: ',',
      dynamicTyping: false
    });
    
    // Extract words from all columns and rows
    const words = [];
    parsed.data.forEach(row => {
      row.forEach(cell => {
        if (cell && typeof cell === 'string') {
          // Split cell content by common delimiters and add individual words
          const cellWords = cell
            .split(/[,;|\t\n]/)
            .map(word => word.trim())
            .filter(word => word.length > 0);
          words.push(...cellWords);
        }
      });
    });
    
    return words;
  }
  
  return [];
}

app.post('/generate', upload.single('wordFile'), async (req, res) => {
  try {
    const { words: wordsInput, deckName } = req.body;
    const uploadedFile = req.file;
    
    if (!deckName) {
      return res.status(400).send('<p style="color: red;">Deck name is required.</p>');
    }

    let words = [];

    // Process uploaded file if present
    if (uploadedFile) {
      try {
        const fileContent = fs.readFileSync(uploadedFile.path, 'utf-8');
        words = extractWordsFromFile(fileContent, uploadedFile.originalname);
        
        // Clean up uploaded file
        fs.unlinkSync(uploadedFile.path);
        
        if (words.length === 0) {
          return res.status(400).send('<p style="color: red;">No words found in the uploaded file. Please check the file format.</p>');
        }
      } catch (error) {
        // Clean up uploaded file on error
        if (fs.existsSync(uploadedFile.path)) {
          fs.unlinkSync(uploadedFile.path);
        }
        return res.status(400).send('<p style="color: red;">Error reading uploaded file: ' + error.message + '</p>');
      }
    } 
    // Process manual input if no file uploaded
    else if (wordsInput) {
      words = wordsInput.split('\n').map(w => w.trim()).filter(Boolean);
    } 
    // No input provided
    else {
      return res.status(400).send('<p style="color: red;">Please either upload a file or enter words manually.</p>');
    }

    if (words.length === 0) {
      return res.status(400).send('<p style="color: red;">Please enter at least one word or upload a valid file.</p>');
    }

    // Remove duplicates while preserving order
    words = [...new Set(words)];

    const output = [];
    const processedWords = [];
    const failedWords = [];

    for (const word of words) {
      try {
        const data = await getWordData(word);
        if (!data) {
          failedWords.push(word);
          continue;
        }

        const folder = path.join(__dirname, 'public/audio');
        if (!fs.existsSync(folder)) {
          fs.mkdirSync(folder, { recursive: true });
        }

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

        processedWords.push(word);
      } catch (error) {
        console.error(`Error processing word "${word}":`, error);
        failedWords.push(word);
      }
    }

    if (output.length === 0) {
      return res.status(400).send('<p style="color: red;">No valid words could be processed. Please check your word list.</p>');
    }

    // Ensure data directory exists
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Save data with deck name
    const cardData = {
      deckName: deckName.trim(),
      cards: output
    };
    
    fs.writeFileSync(path.join(dataDir, 'data.json'), JSON.stringify(cardData, null, 2));

    // Generate Anki package
    await genAnki();

    // Generate success HTML
    let html = `<div class="success-message">
      <h3>✅ Success!</h3>
      <p>Generated ${processedWords.length} cards for "${deckName}"</p>`;

    if (uploadedFile) {
      html += `<p style="color: #2196F3;">📁 From file: ${uploadedFile.originalname}</p>`;
    }

    if (failedWords.length > 0) {
      html += `<p style="color: #ff9800;">⚠️ Failed: ${failedWords.join(', ')}</p>`;
    }

    html += `
      <div class="download-section">
        <a class="download-btn" href="/output/output.apkg" download="${deckName.replace(/[^a-zA-Z0-9]/g, '_')}.apkg">
          Download Anki Deck
        </a>
      </div>
    </div>`;

    res.send(html);

  } catch (error) {
    console.error('Error generating cards:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).send(`<p style="color: red;">An error occurred while generating cards: ${error.message}</p>`);
  }
});

// Serve the generated .apkg file
app.get('/output/output.apkg', (req, res) => {
  const filePath = path.join(__dirname, 'public', '/output/output.apkg');
  
  if (fs.existsSync(filePath)) {
    res.download(filePath, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).send('Error downloading file');
      }
    });
  } else {
    res.status(404).send('File not found. Please generate cards first.');
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('Server started on http://localhost:' + PORT);
});