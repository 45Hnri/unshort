main();

// 1. Check until PageManager exists
function main() {
    observe(
        document.body,
        act_init,
        { subtree: true, childList: true },
        getPageManager,
    );
}

// 2. Disconnect body observer, check PageManager
function act_init(_, obs) {
    obs.disconnect();
    observe(getPageManager(), act_pageManager);
}

// 3. Initialize shortCatcher or Check primary content browser
function act_pageManager(mut) {
    removeShortNav();
    const related = getRelated();
    if (related) observe(related, act_findSubContents);
    mut.forEach((u) =>
        u.addedNodes.forEach((n) => {
            if (n.nodeName === "YTD-BROWSE" && n.ELEMENT_NODE) {
                const contents = n.querySelector("[id=contents]");
                if (contents) {
                    observe(contents, act_shortCatcher);
                } else {
                    observe(
                        n.querySelector("div[id=primary]"),
                        act_findSubContents,
                    );
                }
            }
        }),
    );
}

// 4. Check for contents Element
function act_findSubContents(mut, obs) {
    mut.forEach((u) => {
        u.addedNodes.forEach((n) => {
            if (
                (n.nodeName === "YTD-RICH-GRID-RENDERER" ||
                    n.nodeName === "YTD-ITEM-SECTION-RENDERER") &&
                n.ELEMENT_NODE
            ) {
                const contents = n.querySelector("div[id=contents]");
                contents
                    .querySelectorAll("ytd-reel-shelf-renderer")
                    .forEach((e) => {
                        e.style.display = "none";
                    });
                obs.disconnect();
                observe(contents, act_shortCatcher);
            }
        });
    });
}

// 5. Find shorts from Updates and remove
function act_shortCatcher(mut) {
    mut.forEach((m) =>
        m.addedNodes.forEach((n) => {
            if (
                (n.nodeName === "YTD-RICH-SECTION-RENDERER" &&
                    n.ELEMENT_NODE &&
                    n.querySelector("ytd-rich-shelf-renderer")?.attributes[
                        "is-shorts"
                    ]) ||
                n.nodeName === "YTD-REEL-SHELF-RENDERER"
            )
                n.style.display = "none";
        }),
    );
}

function removeShortNav() {
    document
        .querySelector("ytd-mini-guide-entry-renderer[aria-label=Shorts]")
        ?.remove();
    document
        .querySelector("ytd-guide-entry-renderer > a[title=Shorts]")
        ?.remove();
}

function getPageManager() {
    return document.querySelector("ytd-page-manager");
}

function getRelated() {
    return document
        .getElementById("related")
        .querySelector("ytd-watch-next-secondary-results-renderer")
        .querySelector("div[id=items]");
}

function observe(
    node,
    action,
    config = { childList: true },
    condition = () => true,
) {
    const observer = new MutationObserver((mutations) => {
        if (condition()) action(mutations, observer);
    });
    observer.observe(node, config);
}
