import fs from 'fs';
import { printTerm, walkTerm } from './terms.js';

// Map of terms keyed by their IDs.
const terms = JSON.parse(fs.readFileSync('../data/terms.json', 'utf8'));

/**
for (const englishTerm of Object.values(terms).filter(term => term.lang === "English")) {
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
*/

// for (const japaneseTerm of Object.values(terms).filter(term => term.lang === "Japanese")) {
//     // Ignore any japanese terms that contain Katakana.
//     if (japaneseTerm.term.match(/.*[\u30A0-\u30FF]+.*/)) {
//         continue;
//     }
//     // Ignore any japanese terms that are just Katakana.
//     if (japaneseTerm.term.match(/^[\u30A0-\u30FF A-z \- あ-ん]+$/)) {
//         continue;
//     }
//     var englishParent = null;
//     walkTerm(japaneseTerm, term => {
//         if (term.lang === "English") {
//             if (!englishParent) englishParent = term;
//         }
//     });
//     if (englishParent && englishParent.type !== "calque_of") {
//         printTerm("", japaneseTerm);
//     }
// }


