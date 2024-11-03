import fs from 'fs';
import { printTerm, walkTerm, loadStoredTerms, exportGraphManual } from './terms.js';

const terms = loadStoredTerms('../data/');

function getTermsForId(terms) {
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
const termsForId = getTermsForId(terms);

function getTermsStartingWith(terms) {
    const termsStartingWith = {};
    // const termsEndingWith = {};
    function appendTo(map, key, value) {
        if (!map[key]) {
            map[key] = [];
        }
        map[key].push(value);
    }
    for (const term of terms) {
        if (term.lang !== "English" && term.lang !== "Japanese") continue;
        // Ignore terms that start with "-".
        if (term.term.startsWith("-")) continue;
        // Ignore terms that end with "-".
        if (term.term.endsWith("-")) continue;

        // Ignore any terms that have calques.
        var hasUninterestingTerm = false;
        walkTerm(term, t => {
            if (t.type === "calque_of" /*|| t.type === "clipping_of"*/) {
                hasUninterestingTerm = true;
            }
        });
        if (hasUninterestingTerm) continue;

        const startingTerms = [];
        let current = term;
        while (current !== null) {
            startingTerms.push(current);
            current = current.parents.length > 0 ? current.parents[0] : null;
        }

        const endingTerms = [];
        current = term;
        while (current !== null) {
            endingTerms.push(current);
            current = current.parents.length > 0 ? current.parents[current.parents.length - 1] : null;
        }

        // Now ignore any terms that reside in both starting and ending.
        term.starting = [];
        for (const startingTerm of startingTerms) {
            if (!endingTerms.find(term => term.id === startingTerm.id)) {
                term.starting.push(startingTerm);
                appendTo(termsStartingWith, startingTerm.id, term);
            }
        }
        term.ending = [];
        for (const endingTerm of endingTerms) {
            if (!startingTerms.find(term => term.id === endingTerm.id)) {
                term.ending.push(endingTerm);
            }
        }
    }
    return termsStartingWith;
}
const termsStartingWith = getTermsStartingWith(terms);

function lowestCommonTerm(term1, term2) {
    for (const endingTerm of term1.ending) {
        if (term2.starting.find(t => t.id === endingTerm.id)) {
            return endingTerm;
        }
    }
    return null;
}

function getConnectedTerms(prevTerm, termsStartingWith, termsForId) {
    const allConnectedTermIds = {};
    for (const endingTerm of prevTerm.ending) {
        const connectedTerms = termsStartingWith[endingTerm.id] || [];
        for (const connectedTerm of connectedTerms) {
            if (connectedTerm.id === prevTerm.id) continue;
            allConnectedTermIds[connectedTerm.id] = true;
        }
    }
    const allConnectedTerms = [];
    for (const id of Object.keys(allConnectedTermIds)) {
        const connectedTerm = termsForId[id];
        const commonTerm = lowestCommonTerm(prevTerm, connectedTerm);
        if (commonTerm.lang === "English") {
            continue;
        }
        allConnectedTerms.push({ connectedTerm, commonTerm });
    }
    return allConnectedTerms;
}

// Random walk to create a path.
function createPathRandomWalk(rootNode, connectedTermsForId) {
    const baseTerms = [];
    baseTerms.push(rootNode);
    while (baseTerms.length < 10) {
        const prevTerm = baseTerms[baseTerms.length - 1];
        printTerm("", prevTerm);

        const connectedTerms = connectedTermsForId[prevTerm.id] || [];
        if (connectedTerms.length === 0) break;
        const connectedTerm = connectedTerms[Math.floor(Math.random() * connectedTerms.length)];

        baseTerms.push(connectedTerm.connectedTerm);
    }
    return baseTerms;
}

// Walk the graph.
function createPathLongest(rootNode, connectedTermsForId) {
    const baseTerms = [];
    const queue = [];
    const visited = {};
    queue.push({ term: rootNode, depth: 0 });
    visited[rootNode.id] = rootNode.id;

    var maxDepth = 0;
    var maxTerm = rootNode;
    while (queue.length > 0) {
        const { term, depth } = queue.shift();
        if (depth > maxDepth) {
            maxDepth = depth;
            maxTerm = term;
        }
        if (depth > 10) break;
        const connectedTerms = connectedTermsForId[term.id] || [];
        // Randomize the order of the connected terms.
        for (const connectedTerm of connectedTerms) {
            connectedTerm.seed = Math.random();
        }
        connectedTerms.sort((a, b) => a.seed - b.seed);
        for (const connectedTerm of connectedTerms) {
            if (visited[connectedTerm.connectedTerm.id]) continue;
            visited[connectedTerm.connectedTerm.id] = term.id;
            queue.push({ term: connectedTerm.connectedTerm, depth: depth + 1 });
        }
    }

    // Now walk back from the maxTerm to the root, adding the terms to the baseTerms backwards.
    var currentTerm = maxTerm;
    while (currentTerm.id !== rootNode.id) {
        baseTerms.unshift(currentTerm);
        currentTerm = termsForId[visited[currentTerm.id]];
    }
    baseTerms.unshift(rootNode);
    return baseTerms;
}

function paintConnectingTerms(baseTerms) {
    const bgColors = {};
    for (let i = 0; i < baseTerms.length - 1; i++) {
        const term1 = baseTerms[i];
        const term2 = baseTerms[i + 1];
        const commonTerm = lowestCommonTerm(term1, term2);
        bgColors[commonTerm.id] = "#ddffdd";
    }
    return bgColors;
}

console.log("Creating connection graph");
const connectedTermsForId = {};
var numConnections = 0;
for (const term of terms) {
    if (term.lang !== "English") continue;
    if (!term.starting) continue;

    const allConnectedTerms = getConnectedTerms(term, termsStartingWith, termsForId);
    connectedTermsForId[term.id] = allConnectedTerms;
    numConnections += allConnectedTerms.length;
}
console.log("done " + numConnections);

const rootNode = terms.find(term => term.term.toLowerCase() === "helicopter" && term.lang === "English");

// const baseTerms = createPathRandomWalk(rootNode, connectedTermsForId);
const baseTerms = createPathLongest(rootNode, connectedTermsForId);

const bgColors = paintConnectingTerms(baseTerms);

for (const term of baseTerms) {
    printTerm("", term);
}
exportGraphManual("../data/graph/", baseTerms, bgColors);
