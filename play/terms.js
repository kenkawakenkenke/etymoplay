import chalk from 'chalk';
import fs from 'fs';
import graphviz from 'graphviz';
import { exec } from 'child_process';

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

export function exportGraph(outDir, baseTerms) {
    const graph = graphviz.digraph("G");
    graph.set("rankdir", "TB"); // Bottom-to-top for ancestors to appear above
    graph.setNodeAttribut("shape", "rectangle");
    // graph.setNodeAttribut("shape", "plaintext");

    const root = graph.addNode("ROOT", { shape: "point", style: "invis" });

    const nodeForTerm = {};
    for (const term of baseTerms) {
        walkTerm(term, (t, path) => {
            const node = nodeForTerm[t.id];
            if (!node) {
                const isRoot = path.length === 0;
                const label = `${t.term}\n${t.lang}` + (isRoot ? "ROOT!!" : "");

                nodeForTerm[t.id] = graph.addNode(t.id, { label: label, shape: "rectangle" });
                if (isRoot) {
                    nodeForTerm[t.id].set("rank", "min");
                }
            }
        });
    }
    const renderedEdges = {};
    for (const term of baseTerms) {
        walkTerm(term, (t, path) => {
            if (path.length === 0) {
                // graph.addEdge(root, nodeForTerm[t.id], { style: "invis" });
                // graph.addEdge(root, nodeForTerm[t.id]);
                // graph.addEdge(nodeForTerm[t.id], root, { style: "invis" });
            }
            if (!renderedEdges[t.id]) {
                for (const parent of t.parents) {
                    // graph.addEdge(nodeForTerm[parent.id], nodeForTerm[t.id]);
                    graph.addEdge(nodeForTerm[t.id], nodeForTerm[parent.id]);
                }
                renderedEdges[t.id] = true;
            }
        });
    }

    fs.mkdirSync(outDir, { recursive: true });

    const dotFilePath = outDir + 'etymology_graph.dot';
    fs.writeFileSync(dotFilePath, graph.to_dot());

    // Render as PNG image
    const outPath = outDir + "etymology_graph.png";
    graph.output("png", outPath, (err) => {
        if (err) console.error("Error generating image:", err);
        else console.log("Etymology graph saved as etymology_graph.png");
    });
    return outPath;
}

function renderDotToPng(dotFilePath, outputFilePath) {
    exec(`dot -Tpng ${dotFilePath} -o ${outputFilePath}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error generating PNG: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
        }
        console.log(`Etymology graph saved as ${outputFilePath}`);
    });
}

export function exportGraphManual(outDir, baseTerms, bgColors = {}) {
    const dotParts = [];
    dotParts.push("digraph G {");
    dotParts.push("graph [ rankdir=TB ];");
    dotParts.push("node [ shape=rectangle ];");

    const nodeForTerm = {};
    for (const term of baseTerms) {
        walkTerm(term, (t, path) => {
            const node = nodeForTerm[t.id];
            if (!node) {
                const isRoot = path.length === 0;
                // const label = `${t.term}\n${t.lang}` + (isRoot ? "ROOT!!" : "");
                // const label = `<<TABLE BORDER=\"0\" COLOR=\"red\" CELLSPACING=\"0\"><TR><TD>${t.term}</TD></TR><TR><TD><FONT POINT-SIZE="8">${t.lang}</FONT></TD></TR></TABLE>>`;

                const color = bgColors[t.id] || "#ffffff";

                const label = `<<TABLE BORDER="1" BGCOLOR="${color}" CELLSPACING="0" CELLPADDING="4" > <TR><TD>${t.term}<br /><FONT POINT-SIZE="8">${t.lang}</FONT></TD></TR></TABLE>>`;

                dotParts.push(`"${t.id}" [ label=${label}, shape=none, margin="0,0" ];`);
                nodeForTerm[t.id] = true;
            }
        });
    }
    const renderedEdges = {};
    for (const term of baseTerms) {
        walkTerm(term, (t, path) => {
            if (!renderedEdges[t.id]) {
                for (const parent of t.parents) {
                    dotParts.push(`"${parent.id}" -> "${t.id}";`);
                }
                renderedEdges[t.id] = true;
            }
        });
    }

    // Add invisible edges between siblings to ensure they show in the correct left->right order.  
    for (const term of baseTerms) {
        walkTerm(term, (t, path) => {
            var prev = null;
            for (const parent of t.parents) {
                if (prev) {
                    // dotParts.push(`"${prev.id}" -> "${parent.id}" [ style=invis ];`);
                    dotParts.push(`"${prev.id}" -> "${parent.id}" [ style=dashed ];`);
                    // dotParts.push(`"${prev.id}" -> "${parent.id}" [ color=white ];`);
                }
                prev = parent;
            }
        });
    }

    // Add visible edges between base terms
    for (let i = 0; i < baseTerms.length - 1; i++) {
        dotParts.push(`"${baseTerms[i].id}" -> "${baseTerms[i + 1].id}" [ color=red ];`);
    }

    const baseIds = baseTerms.map(t => `"${t.id}"`).join(", ");
    dotParts.push(`{rank = same; ${baseIds};}`);
    dotParts.push("}");

    fs.mkdirSync(outDir, { recursive: true });

    const dotStr = dotParts.join("\n");
    const dotFilePath = outDir + 'etymology_graph.dot';
    fs.writeFileSync(dotFilePath, dotStr);

    // Render as PNG image
    const outPath = outDir + "etymology_graph.png";

    renderDotToPng(dotFilePath, outPath);
    // graph.output("png", outPath, (err) => {
    //     if (err) console.error("Error generating image:", err);
    //     else console.log("Etymology graph saved as etymology_graph.png");
    // });
    return outPath;
}