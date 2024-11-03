import fs from 'fs';
import { printTerm, walkTerm, loadStoredTerms } from './terms.js';

const terms = loadStoredTerms('../data/');

function getTermForId(terms) {
    const termsForId = {};
    // First add the top level nodes which are probably most "canonical".
    terms.forEach(term => {
        termsForId[term.id] = term;
    });
    // Then add the children if they are not already in the map.
    for (const term of terms) {
        walkTerm(term, t => {
            if (!termsForId[t.id]) {
                termsForId[t.id] = t;
            }
        });
    }
    return termsForId;
}
const termsForId = getTermForId(terms);

const englishTerms = terms.filter(term => term.lang === "English");

/**
const numForLang = {};
for (const term of terms) {
    if (numForLang[term.lang] === undefined) {
        numForLang[term.lang] = 0;
    }
    numForLang[term.lang]++;
}
Object.entries(numForLang).sort((a, b) => a[1] - b[1]).forEach(([lang, num]) => {
    console.log(lang + ": " + num);
});
/**/

// Top ancestors for English terms.
/**
const numForAncestor = {};
for (const term of terms.filter(term => term.lang === "English")) {
    walkTerm(term, t => {
        if (t.lang === term.lang) return;
        numForAncestor[t.id] = (numForAncestor[t.id] || 0) + 1;
    });
}
Object.entries(numForAncestor).sort((a, b) => a[1] - b[1])
    .slice(-100)
    .forEach(([id, num]) => {
        const term = termsForId[id];
        console.log(term.term + " " + term.lang + ": " + num);
    });
/**/
