import fs from 'fs';
import Papa from 'papaparse';
import chalk from 'chalk';

// RELATION FUNCTIONS: PRINT
function print(prefix, relation) {
    console.log(
        prefix +
        (
            relation.parent_tag === "" ? "" :
                `${relation.parent_position}: `
        ) +
        (
            relation.related_term_id === "" ? "" :
                chalk.red(`${relation.related_term} (${relation.related_lang}) `)
        ) +
        // It seems that relation.position is always 0 if there are children.
        // Probably means that we don't ever have a group inside a suffix.
        chalk.green("pos: ") + relation.position + " " +
        relation.reltype
    );
    if (relation.children) {
        for (const child of relation.children) {
            print(prefix + "  ", child);
        }
    }
}

function printRaw(relations) {
    if (relations.length === 0) return;
    console.log("======== " + relations[0].term);
    for (const root of relations) {
        print("", root);
    }
}


// RELATION FUNCTIONS: PARSE

function parseLeaf(relation) {
    return {
        id: relation.related_term_id,
        term: relation.related_term,
        lang: relation.related_lang,
        parents: [],
    }
}

function parseFlatRelations(relations) {
    // Group the childs by the level (parent_position)
    const levels = {};
    for (const child of relations) {
        const position = child.parent_position || '?';
        if (!levels[position]) {
            levels[position] = [];
        }
        levels[position].push(child);
    }
    const sortedLevels = Object.keys(levels).sort((a, b) => a - b);

    const childGroups = [];
    for (const level of sortedLevels) {
        const levelTerms = levels[level];

        // When a level has multiple terms, it is a composite term of leaves.
        if (levelTerms.length > 1) {
            for (const leafRelation of levelTerms) {
                childGroups.push(parseLeaf(leafRelation));
            }
            continue;
        }
        const leafRelation = levelTerms[0];
        if (leafRelation.reltype === "group_affix_root") {
            const group = parseGroupAffixRoot(leafRelation);
            if (group) {
                childGroups.push(group);
            }
            continue;
        }
        if (leafRelation.reltype === "group_related_root") {
            const group = parseGroupRelatedRoot(leafRelation);
            if (group) {
                childGroups.push(group);
            }
            continue;
        }
        // Guaranteed to have no children.
        childGroups.push(parseLeaf(leafRelation));
    }
    return childGroups;
}

function parseGroupAffixRoot(group) {
    const term = {
        type: "affix group",
        parents: [],
    };
    for (const leafRelation of group.children || []) {
        term.parents.push(parseLeaf(leafRelation));
    }
    return term;
}

function parseGroupRelatedRoot(group) {
    const childGroups = parseFlatRelations(group.children || []);
    if (childGroups.length === 0) {
        return null;
    }
    // Try to pick the most interesting one.
    // TODO: think of something better here.

    // First go for one with a hierarchy.
    for (const childGroup of childGroups) {
        if (childGroup.parents.length > 0) {
            return childGroup;
        }
    }
    return childGroups[0];
}

function termFromRelations(termRoot, childRelations) {
    const childGroups = parseFlatRelations(childRelations);

    var prevTerm = termRoot;
    for (const childGroup of childGroups) {
        prevTerm.parents.push(childGroup);
        prevTerm = childGroup;
    }

    // Try to flatten any terms that are just pointers to later children.
    function flatten(term) {
        for (const parent of term.parents) {
            flatten(parent);
        }
        if (term.parents.length === 1) {
            const singleParent = term.parents[0];
            if (!singleParent.term) {
                term.parents = singleParent.parents;
            }
        }
    }
    flatten(termRoot);

    return termRoot;
}

function hasChildId(term, id) {
    for (const parent of term.parents) {
        if (parent.id === id) return true;
        if (hasChildId(parent, id)) return true;
    }
    return false;
}

function getLeaves(term, leaves) {
    if (term.parents.length === 0) {
        leaves.push(term);
    }
    for (const parent of term.parents) {
        getLeaves(parent, leaves);
    }
    return leaves;
}

function getAllIds(term, ids) {
    ids[term.id] = true;
    for (const parent of term.parents) {
        getAllIds(parent, ids);
    }
    return ids;
}
function depth(term) {
    if (term.parents.length === 0) return 0;
    var max = 0;
    for (const parent of term.parents) {
        max = Math.max(max, depth(parent));
    }
    return max + 1;
}

// TERM FUNCTIONS: PRINT
function printTerm(prefix, term) {
    console.log(
        prefix +
        chalk.red(term.term || "-") + " " + chalk.green(term.lang || "-")
        + " " + term.id
    );
    for (const parent of term.parents) {
        printTerm(prefix + "  ", parent);
    }
}

function processTermRelations(relations) {
    // Boring ones (for now)
    // Abort if every relation in input array are English.
    // if (relations.every(relation => relation.related_lang === 'English' || relation.related_lang === '')) return;

    // Filter out has_root. These seem to not be meaningful.
    relations = relations.filter(relation => relation.reltype !== 'has_root');
    if (relations.length === 0) return null;

    const relationByGroup = {};
    for (const relation of relations) {
        if (relation.group_tag) {
            relationByGroup[relation.group_tag] = relation;
            relation.children = [];
        }
    }
    const relationsWithoutParents = [];
    for (const relation of relations) {
        if (relation.parent_tag && relationByGroup[relation.parent_tag]) {
            const parent = relationByGroup[relation.parent_tag];
            parent.children.push(relation);
        } else {
            relationsWithoutParents.push(relation);
        }
    }

    const termRoot = {
        term: relations[0].term,
        lang: relations[0].lang,
        id: relations[0].term_id,
        parents: [],
    };

    // First try to pick a group_derived_root.
    for (const relation of relationsWithoutParents) {
        if (relation.reltype === 'group_derived_root') {
            return termFromRelations(termRoot, relation.children || []);
        }
        if (relation.reltype === 'group_related_root' || relation.reltype === 'group_affix_root') {
            return termFromRelations(termRoot, [relation]);
        }
    }

    // Non-group ancestries are handled separately.

    if (relationsWithoutParents.length === 1) {
        return termFromRelations(termRoot, relationsWithoutParents);
    }

    const firstType = relationsWithoutParents[0].reltype;
    if (firstType === "compound_of" || firstType === "hax_affix" || firstType === "has_confix" || firstType === "blend_of") {
        for (const relation of relationsWithoutParents) {
            if (relation.reltype !== firstType) {
                break;
            }
            termRoot.parents.push(parseLeaf(relation));
        }
        return;
    }
    if (firstType === "has_prefix" || firstType === "has_prefix_with_root") {
        for (const relation of relationsWithoutParents) {
            if (relation.reltype !== "has_prefix" && relation.reltype !== "has_prefix_with_root" && relation.reltype !== "has_suffix") {
                break;
            }
            termRoot.parents.push(parseLeaf(relation));
        }
        return;
    }

    // Catch all
    termRoot.parents.push(parseLeaf(relationsWithoutParents[0]));
    if (relationsWithoutParents.length >= 2 && relationsWithoutParents[1].reltype === "has_suffix") {
        termRoot.parents.push(parseLeaf(relationsWithoutParents[1]));
    }
}


function loadTerms(results) {
    const terms = [];

    var currentTerm = [];
    for (const relation of results) {
        // if (relation.lang !== 'English') continue;
        // if (!interestingTerms[relation.term.toLowerCase()]) continue;

        // Probably don't care about doublets.
        if (relation.reltype === 'doublet_with') continue;
        if (relation.reltype === 'cognate_of') continue;

        if (currentTerm.length !== 0 && currentTerm[0].term !== relation.term) {
            const term = processTermRelations(currentTerm);
            if (term) {
                terms.push(term);
            }
            currentTerm = [];
        }
        currentTerm.push(relation);
    }
    if (currentTerm.length > 0) {
        const term = processTermRelations(currentTerm);
        if (term) {
            terms.push(term);
        }
    }
    var numFound = 0;
    const termForId = {};
    for (const term of terms) {
        if (term.parents.length === 0) continue;

        // Kill self references.
        if (hasChildId(term, term.id)) {
            continue;
        }
        termForId[term.id] = term;
    }
    console.log(`found ${Object.keys(termForId).length} terms`);
    return termForId;
}


// Read csv from ../data/etymology.csv
const data = fs.readFileSync('../data/etymology.csv', 'utf8');
const results = Papa.parse(data, {
    header: true, // Set to true if the CSV has headers
    skipEmptyLines: true
}).data;

const interestingTerms = {
    "pteranodon": true,
    "autobiography": true,
    "arachniphobia": true,
    "gentleman": true,
    "gentle": true,
    "man": true,
    "telescope": true,
    "escalator": true,
    "helicopter": true,
    "japanese": true,
    "japan": true,
    "englishman": true,
    "blindspot": true,
    "microwave": true,
}

const terms = loadTerms(results);

for (const term of Object.values(terms)) {
    for (const leaf of getLeaves(term, [])) {
        const moreParents = terms[leaf.id]?.parents || [];
        for (const child of moreParents) {
            const termIds = getAllIds(term, {});
            const childIds = getAllIds(child, {});

            // See if there are any intersections between termIds and childIds (except for term.id).
            let hasIntersection = false;
            for (const id of Object.keys(childIds)) {
                if (id !== term.id && termIds[id]) {
                    hasIntersection = true;
                    break;
                }
            }
            if (!hasIntersection) {
                leaf.parents.push(child);
            }
        }
    }
}

for (const term of Object.values(terms)) {
    if (interestingTerms[term.term.toLowerCase()]) {
        // if (depth(term) > 3) {
        printTerm("", term);
    }
}

fs.writeFileSync('../data/terms.json', JSON.stringify(terms, null, 2));