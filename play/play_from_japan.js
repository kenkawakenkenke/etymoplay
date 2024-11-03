import fs from 'fs';
import { printTerm, walkTerm, loadStoredTerms } from './terms.js';

function containsKanji(term) {
    return term.match(/[\u4E00-\u9FFF]+/);
}

function containsKatakana(term) {
    return term.match(/.*[\u30A0-\u30FFA-zあ-ん]+.*/);
}

const terms = loadStoredTerms('../data/');

// English words that have Japanese origins.
/**
for (const englishTerm of terms.filter(term => term.lang === "English")) {
    // Ignore any english terms that start with upper case (as they tend to be names.)
    if (englishTerm.term.match(/^[A-Z]/)) continue;

    var hasJapaneseParent = false;
    walkTerm(englishTerm, term => {
        if (term.lang === "Japanese") {
            hasJapaneseParent = true;
        }
    });
    if (hasJapaneseParent) {
        printTerm("", englishTerm);
    }
}
/**/

/**/
// Japanese words that have English origins.
const obviousAncestors = {
    "Japanese": true,
    "Old Japanese": true,
    "Middle Chinese": true,
    "Literary Chinese": true,
    "Chinese": true,
    "Okinawan": true,
    "Korean": true,
    "Ainu": true,
    "Mandarin": true,
    "Cantonese": true,
    "Proto-Japonic": true,
};
const obviousRelations = {
    "calque_of": true,
}
for (const baseTerm of terms.filter(term => term.lang === "Japanese")) {
    if (!containsKanji(baseTerm.term) || containsKatakana(baseTerm.term)) continue;
    // Pick the first non-obvious non-Japanese parent of a Japanese term.
    var interestingParent = null;
    walkTerm(baseTerm, term => {
        if (interestingParent || term.lang !== baseTerm.lang) return;
        for (const parent of term.parents) {
            if (obviousAncestors[parent.lang] || obviousRelations[parent.type]) continue;
            interestingParent = term;
            return;
        }
    });
    if (interestingParent) printTerm("", baseTerm);
}
/**/


