import chalk from 'chalk';
import fs from 'fs';

export function hasChildId(term, id) {
    for (const parent of term.parents) {
        if (parent.id === id) return true;
        if (hasChildId(parent, id)) return true;
    }
    return false;
}

export function getLeaves(term, leaves) {
    if (term.parents.length === 0) {
        leaves.push(term);
    }
    for (const parent of term.parents) {
        getLeaves(parent, leaves);
    }
    return leaves;
}

export function getAllIds(term, ids) {
    ids[term.id] = true;
    for (const parent of term.parents) {
        getAllIds(parent, ids);
    }
    return ids;
}
export function termDepth(term) {
    if (term.parents.length === 0) return 0;
    var max = 0;
    for (const parent of term.parents) {
        max = Math.max(max, termDepth(parent));
    }
    return max + 1;
}

// TERM FUNCTIONS: PRINT
export function printTerm(prefix, term) {
    console.log(
        prefix +
        chalk.red(term.term || "-") + " " + chalk.green(term.lang || "-")
        + " " + term.id
        + " " + (term.type || "")
    );
    for (const parent of term.parents) {
        printTerm(prefix + "  ", parent);
    }
}

export function walkTerm(term, f, path = []) {
    f(term, path);
    path.push(term);
    for (const parent of term.parents) {
        walkTerm(parent, f, path);
    }
    path.pop();
}

// Read all the chunks.
export function loadStoredTerms(baseDir) {
    const allTerms = [];
    fs.readdirSync(baseDir).forEach(file => {
        if (file.match(/terms_\d+\.json/)) {
            const chunk = JSON.parse(fs.readFileSync(baseDir + file, 'utf8'));
            for (const term of chunk) {
                allTerms.push(term);
            }
        }
    });
    return allTerms;
}

export function exportTerms(terms, baseDir, chunkSize) {
    // Chunkify the list of terms because JSON.stringify can't handle the entire list at once.
    // Make sure all chunk files have been deleted first.
    fs.readdirSync(baseDir).forEach(file => {
        if (file.match(/terms_\d+\.json/)) {
            console.log("Deleting: " + file);
            fs.unlinkSync(baseDir + file);
        }
    });

    let pageIdx = 0;
    for (let firstIdx = 0; firstIdx < terms.length; firstIdx += chunkSize) {
        const chunk = terms.slice(firstIdx, firstIdx + chunkSize);
        const fileName = `${baseDir}terms_${pageIdx}.json`;
        console.log("Export: " + fileName);
        fs.writeFileSync(fileName, JSON.stringify(chunk, null, 0));
        pageIdx++;
    }

}