import fs from 'fs';
import { printTerm, walkTerm } from './terms.js';

// Map of terms keyed by their IDs.
const terms = JSON.parse(fs.readFileSync('../data/terms.json', 'utf8'));

// English words that have Japanese origins.
/**/
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


