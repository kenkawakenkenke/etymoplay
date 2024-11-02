import fs from 'fs';
import { printTerm, walkTerm } from './terms.js';

// Map of terms keyed by their IDs.
const terms = JSON.parse(fs.readFileSync('../data/terms.json', 'utf8'));

// English words that have Japanese origins.
/**
for (const englishTerm of Object.values(terms).filter(term => term.lang === "English")) {
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

// Japanese words that have English origins.
for (const japaneseTerm of Object.values(terms).filter(term => term.lang === "Japanese")) {
    // Select only terms that contain kanji.
    if (!japaneseTerm.term.match(/[\u4E00-\u9FFF]+/)) {
        continue;
    }
    // Ignore any japanese terms that contain Katakana.
    if (japaneseTerm.term.match(/.*[\u30A0-\u30FFA-zあ-ん]+.*/)) {
        continue;
    }
    var englishParent = null;
    walkTerm(japaneseTerm, term => {
        if (term.lang === "English") {
            if (!englishParent) englishParent = term;
        }
    });
    if (englishParent && englishParent.type !== "calque_of") {
        printTerm("", japaneseTerm);
    }
}


