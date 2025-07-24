

import { Package, Deck, Note, Model } from 'genankjs';
import { readFileSync } from 'fs';

export const genAnki = async () => {
    // Read JSON data (equivalent to Python: with open('data/data.json', 'r') as f: data = json.load(f))
    const data = JSON.parse(readFileSync('data/data.json', 'utf8'));

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
            qfmt: '{{Word}}<br>{{Pronunciation}}<br>{{WordAudio}}',
            afmt: '{{FrontSide}}<hr id="answer">{{Definition}}<br>{{DefAudio}}<br>{{Example}}<br>{{ExAudio}}'
        }]
    });

    // Create deck (equivalent to Python genanki.Deck)
    const deck = new Deck({
        deckId: 2059400110,
        name: 'My Vocab Deck'
    });

    // Create package (equivalent to Python genanki.Package)
    const pkg = new Package();

    // Track media files array (equivalent to Python media_files = [])
    const mediaFiles = [];

    // Process each card (equivalent to Python for card in data:)
    for (const card of data) {
    // Create note (equivalent to Python genanki.Note)
    const note = new Note({
        modelId: model.modelId, // Use model.modelId instead of model=model
        fields: [
        card.word,
        card.pronunciation,
        card.definition,
        card.example,
        `[sound:${card.audio.word}]`,
        `[sound:${card.audio.definition}]`,
        `[sound:${card.audio.example}]`
        ]
    });
    
    // Add note to deck (equivalent to Python deck.add_note(note))
    deck.addNote(note, model);
    
    // Add media files to array (equivalent to Python media_files.extend([...]))
    mediaFiles.push(
        `public/audio/${card.audio.word}`,
        `public/audio/${card.audio.definition}`,
        `public/audio/${card.audio.example}`
    );
    }

    // Add deck to package
    pkg.addDeck(deck);
    pkg.addModel(model);

    // Add media files to package (equivalent to Python package.media_files = media_files)
    for (const mediaPath of mediaFiles) {
        try {
            const fileName = mediaPath.split('/').pop(); // Extract filename
            const mediaData = readFileSync(mediaPath);
            pkg.addMedia({
                name: fileName,
                data: mediaData
            });
        } catch (error) {
            console.warn(`Warning: Could not read media file: ${mediaPath}`);
        }
    }

    // Write to file (equivalent to Python package.write_to_file('public/output.apkg'))
    await pkg.writeToFile('public/output.apkg');

    console.log('✅ Generated public/output.apkg successfully!');
};
