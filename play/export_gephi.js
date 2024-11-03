import fs from 'fs';
import { printTerm, walkTerm, loadStoredTerms } from './terms.js';

const terms = loadStoredTerms('../data/');

function exportToGephiCSV(terms) {
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

    const nodes = [];
    const edges = [];

    for (const term of Object.values(termsForId)) {
        // Remove any commas from the term.
        const cleanTerm = term.term.replace(/,/g, "");
        nodes.push(`${term.id},${cleanTerm},${term.lang}`);
        term.parents.forEach(parent => {
            edges.push(`${parent.id},${term.id}`);
        });
    }

    // Write nodes to nodes.csv
    fs.writeFileSync('../data/graph_nodes.csv', 'id,label,language\n' + nodes.join('\n'));
    console.log(`exported ${nodes.length} nodes`);

    // Write edges to edges.csv
    fs.writeFileSync('../data/graph_edges.csv', 'source,target\n' + edges.join('\n'));
    console.log(`exported ${edges.length} edges`);

    console.log("Export complete: nodes.csv and edges.csv are ready for Gephi.");
}

exportToGephiCSV(terms);
