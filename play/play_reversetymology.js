import { printTerm, walkTerm, loadStoredTerms } from './terms.js';

const terms = loadStoredTerms('../data/');

// Words that went to a different language and then came back.
/**/
const interestingLangs = {
    "English": true,
    // "Japanese": true,
};
for (const origTerm of terms) {
    if (!interestingLangs[origTerm.lang]) continue;

    var interestingParent = null;
    walkTerm(origTerm, term => {
        if (interestingParent) return;
        if (term.lang === origTerm.lang) return;
        for (const parent of term.parents) {
            if (parent.lang === origTerm.lang) {
                // if (obviousRelations[parent.type]) continue;

                // console.log("Found: " + term.term + "(" + term.lang + ") <- " + parent.term + "(" + parent.lang + ")" + " " + parent.type);

                interestingParent = term;

                return;
            }
        }
    });
    if (interestingParent) {
        printTerm("", origTerm);
    }
}
/**/

// Unusual etymologies.
/**
for (const origTerm of terms) {
    if (origTerm.term.toLowerCase() !== "さかな") continue;

    printTerm("", origTerm);
}
/**/


