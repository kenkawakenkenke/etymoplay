import chalk from 'chalk';

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
export function depth(term) {
    if (term.parents.length === 0) return 0;
    var max = 0;
    for (const parent of term.parents) {
        max = Math.max(max, depth(parent));
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

export function walkTerm(term, f) {
    f(term);
    for (const parent of term.parents) {
        walkTerm(parent, f);
    }
}
