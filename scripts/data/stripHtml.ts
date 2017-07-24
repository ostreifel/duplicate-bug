function textNodesUnder(node: Node): string[] {
    if (node.nodeType === 3 && node.nodeValue) {
        return [node.nodeValue];
    }
    if (typeof document !== "undefined") {
        const textNodes: string[] = [];
        const walk = document.createTreeWalker(
            node,
            NodeFilter.SHOW_TEXT,
            undefined,
            false,
        );
        let nextNode = walk.nextNode();
        while (nextNode) {
            if (nextNode.nodeValue) {
                textNodes.push(nextNode.nodeValue);
            }
            nextNode = walk.nextNode();
        }
        return textNodes;
    } else {
        const all: string[] = [];
        for (
            let currNode = node.firstChild;
            currNode;
            currNode = currNode.nextSibling
        ) {
            if (currNode.nodeType === 3 && currNode.nodeValue) {
                all.push(currNode.nodeValue);
            } else {
                all.push(...textNodesUnder(currNode));
            }
        }
        return all;
    }
}

function toNode(htmlStr: string): Node[] {
    const parser = new DOMParser();
    return [parser.parseFromString(htmlStr, "text/html")];
}

/**
 * Strip out everything but text from the html
 * @param htmlStr
 */
export function stripHtml(htmlStr: string): string {
    const docs = toNode(htmlStr);
    const textNodes: string[] = [];
    for (const doc of docs) {
        textNodes.push(...textNodesUnder(doc));
    }
    return textNodes.join(" ");
}
