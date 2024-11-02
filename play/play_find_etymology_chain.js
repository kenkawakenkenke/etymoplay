import fs from 'fs';
import { walkTerm, printTerm } from './terms.js';

// Map of terms keyed by their IDs.
const terms = JSON.parse(fs.readFileSync('../data/terms.json', 'utf8'));

const termsStartingWith = {};
const termsEndingWith = {};

function appendTo(map, key, value) {
    if (map[key] === undefined) {
        map[key] = [];
    }
    map[key].push(value);
}

for (const term of Object.values(terms)) {
    term.starting = [];
    term.ending = [];

    // Ignore any terms that have calques.
    var hasCalque = false;
    walkTerm(term, t => {
        if (t.type === "calque_of") {
            hasCalque = true;
        }
    });
    if (hasCalque) continue;

    // Add to termsStartingWith.
    let current = term;
    while (current !== null) {
        term.starting.push(current.id);
        if (current.parents.length > 0) {
            current = current.parents[0];
            appendTo(termsStartingWith, current.id, term);
        } else {
            current = null;
        }
    }

    // Add to termsEndingWith.
    current = term;
    while (current !== null) {
        term.ending.push(current.id);
        if (current.parents.length > 0) {
            current = current.parents[current.parents.length - 1];
            appendTo(termsEndingWith, current.id, term);
        } else {
            current = null;
        }
    }
}

const firstTerm = Object.values(terms).find(term => term.term.toLowerCase() === "heliocentric" && term.lang === "English");

printTerm("", firstTerm);

for (const endingId of firstTerm.ending) {
    const endingTerms = termsStartingWith[endingId] || [];
    for (const endingTerm of endingTerms) {
        if (endingTerm.lang === "English" && endingTerm.term !== firstTerm.term) {
            console.log("next: " + endingTerm.term + " " + (terms[endingId]?.term || ""));
        }
    }
}
