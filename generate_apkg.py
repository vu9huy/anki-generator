import genanki, json

with open('data/data.json', 'r') as f:
    data = json.load(f)

model = genanki.Model(
    1607392319,
    'Word Model',
    fields=[
        {'name': 'Word'},
        {'name': 'Pronunciation'},
        {'name': 'Definition'},
        {'name': 'Example'},
        {'name': 'WordAudio'},
        {'name': 'DefAudio'},
        {'name': 'ExAudio'}
    ],
    templates=[{
        'name': 'Card 1',
        'qfmt': '{{Word}}<br>{{Pronunciation}}<br>{{WordAudio}}',
        'afmt': '{{FrontSide}}<hr>{{Definition}}<br>{{DefAudio}}<br>{{Example}}<br>{{ExAudio}}'
    }]
)

deck = genanki.Deck(2059400110, 'My Vocab Deck')
media_files = []

for card in data:
    note = genanki.Note(
        model=model,
        fields=[
            card['word'],
            card['pronunciation'],
            card['definition'],
            card['example'],
            f"[sound:{card['audio']['word']}]",
            f"[sound:{card['audio']['definition']}]",
            f"[sound:{card['audio']['example']}]"
        ]
    )
    deck.add_note(note)
    media_files.extend([
        f"public/audio/{card['audio']['word']}",
        f"public/audio/{card['audio']['definition']}",
        f"public/audio/{card['audio']['example']}"
    ])

package = genanki.Package(deck)
package.media_files = media_files
package.write_to_file('public/output.apkg')
