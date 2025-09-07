import { Package, Deck, Note, Model } from 'genankjs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from "fs"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const genAnki = async () => {
    try {
        // Read JSON data with deck name
        const dataPath = path.join(__dirname, '..', 'data', 'data.json');
        const jsonData = JSON.parse(readFileSync(dataPath, 'utf8'));
        // const jsonData = JSON.parse(readFileSync('../data/data.json', 'utf8'));
        const deckName = jsonData.deckName || 'My Vocab Deck';
        const data = jsonData.cards || jsonData; // Support both new and old format

        // Create model (equivalent to Python genanki.Model)
        const model = new Model({
            modelId: 1607392319,
            name: 'Word Model',
            fields: [
                { name: 'Word' },
                { name: 'Pronunciation' },
                { name: 'Definition' },
                { name: 'Example' },
                { name: 'WordAudio' },
                { name: 'DefAudio' },
                { name: 'ExAudio' }
            ],
            templates: [{
                name: 'Card 1',
                qfmt: '{{Word}}<br><div style="color: #666; font-size: 0.9em;">{{Pronunciation}}</div><br>{{WordAudio}}',
                afmt: '{{FrontSide}}<hr id="answer"><div style="margin-bottom: 10px;"><strong>Definition:</strong><br>{{Definition}}</div>{{DefAudio}}<br><div style="margin-top: 15px;"><strong>Example:</strong><br><em>{{Example}}</em></div>{{ExAudio}}'
            }]
        });

        // Create deck with custom name
        const deck = new Deck({
            deckId: Date.now(), // Use timestamp for unique deck ID
            name: deckName
        });

        // Create package
        const pkg = new Package();

        // Track media files array
        const mediaFiles = [];

        console.log(`🔄 Processing ${data.length} cards for deck "${deckName}"...`);

        // Process each card
        for (const [index, card] of data.entries()) {
            try {
                // Create note
                const note = new Note({
                    modelId: model.modelId,
                    fields: [
                        card.word,
                        card.pronunciation || '',
                        card.definition || '',
                        card.example || '',
                        `[sound:${card.audio.word}]`,
                        `[sound:${card.audio.definition}]`,
                        `[sound:${card.audio.example}]`
                    ]
                });
                
                // Add note to deck
                deck.addNote(note, model);
                
                // Add media files to array
                mediaFiles.push(
                    `public/audio/${card.audio.word}`,
                    `public/audio/${card.audio.definition}`,
                    `public/audio/${card.audio.example}`
                );

                console.log(`✓ Processed card ${index + 1}/${data.length}: ${card.word}`);
            } catch (error) {
                console.error(`❌ Error processing card "${card.word}":`, error.message);
            }
        }

        // Add deck to package
        pkg.addDeck(deck);
        pkg.addModel(model);

        console.log(`🔄 Adding ${mediaFiles.length} media files...`);

        // Add media files to package
        let mediaCount = 0;
        for (const mediaPath of mediaFiles) {
            try {
                const fileName = mediaPath.split('/').pop(); // Extract filename
                const mediaData = readFileSync(mediaPath);
                pkg.addMedia({
                    name: fileName,
                    data: mediaData
                });
                mediaCount++;
            } catch (error) {
                console.warn(`⚠️  Warning: Could not read media file: ${mediaPath}`);
            }
        }

        console.log(`✓ Added ${mediaCount} media files successfully`);

        // Write to file
        const outputDir = path.join(__dirname, '..', 'public', 'output');
        if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        }
        const outputPath = path.join(outputDir, 'output.apkg');
        await pkg.writeToFile(outputPath);

        console.log(`🎉 Generated public/output/output.apkg successfully!`);
        console.log(`📦 Deck Name: "${deckName}"`);
        console.log(`📚 Total Cards: ${data.length}`);
        console.log(`🎵 Media Files: ${mediaCount}`);

        return {
            success: true,
            deckName,
            cardCount: data.length,
            mediaCount
        };

    } catch (error) {
        console.error('❌ Error generating Anki package:', error);
        throw error;
    }
};