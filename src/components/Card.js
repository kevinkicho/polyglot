// src/components/Card.js

export function createCardDOM(data) {
    const scene = document.createElement('div');
    scene.classList.add('flashcard-scene');

    const inner = document.createElement('div');
    inner.classList.add('flashcard-inner');

    // --- FRONT BUILDER ---
    let frontHTML = '';
    
    if (data.type === 'JAPANESE') {
        // Japanese: Furigana on top of Kanji
        frontHTML = `
            <div class="word-group">
                <span class="furigana">${data.front.extra}</span>
                <span class="main-word">${data.front.main}</span>
            </div>
            <div class="romaji">${data.front.sub}</div>
        `;
    } else if (data.type === 'NON_LATIN') {
        // Korean/Chinese/Russian: Character + Romanization
        frontHTML = `
            <div class="main-word">${data.front.main}</div>
            <div class="romaji">${data.front.sub}</div>
        `;
    } else {
        // Western: Just the word
        frontHTML = `
            <div class="main-word">${data.front.main}</div>
        `;
    }

    const front = document.createElement('div');
    front.classList.add('card-face', 'card-front');
    front.innerHTML = `
        <small style="color:#ccc; margin-bottom: auto;">Tap to flip</small>
        ${frontHTML}
        <div style="margin-top: auto;"></div> `;

    // --- BACK BUILDER ---
    const back = document.createElement('div');
    back.classList.add('card-face', 'card-back');
    back.innerHTML = `
        <small style="color:#ccc;">Meaning</small>
        <div class="definition">${data.back.definition}</div>
        
        <div class="sentence-box">
            <div class="sentence-target">${data.back.sentenceTarget}</div>
            <div class="sentence-origin">${data.back.sentenceOrigin}</div>
        </div>
    `;

    inner.appendChild(front);
    inner.appendChild(back);
    scene.appendChild(inner);

    scene.addEventListener('click', () => {
        inner.classList.toggle('is-flipped');
    });

    return scene;
}
