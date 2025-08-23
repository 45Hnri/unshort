main();

let m_obs = null;
let url = null;

// Connect to related / featured (mobil) or Page Manager (desktop)
function main() {
    if (isMobilVersion()) {
        observe(
            document.head.querySelector("title"),
            () =>
                observe(
                    document.body,
                    act_m_init,
                    { subtree: true, childList: true },
                    () => m_getBrowseHost() || m_getWatchNext(),
                ),
            undefined,
            () => {
                if (url !== document.URL) {
                    url = document.URL;
                    return true;
                }
                return false;
            },
        );
    } else {
        observe(
            document.body,
            act_init,
            { subtree: true, childList: true },
            getPageManager,
        );
    }
}

//#################
// OBSERVER-ACTIONS
//#################

function act_init(_, obs) {
    obs.disconnect();
    observe(getPageManager(), act_pageManager);
}

// Connect to related grid (on video) and to new Pages
function act_pageManager(mut) {
    removeShortNav();
    const related = getRelated();
    if (related) observe(related, act_findSubContents);
    iter_mutations(mut, (n) => {
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
    });
}

// Check until "contents" loaded
function act_findSubContents(mut, obs) {
    iter_mutations(mut, (n) => {
        const isRenderer =
            n.nodeName === "YTD-RICH-GRID-RENDERER" ||
            n.nodeName === "YTD-ITEM-SECTION-RENDERER";
        if (isRenderer && n.ELEMENT_NODE) {
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
}

function act_shortCatcher(mut) {
    iter_mutations(mut, blockShort);
}

// Connect related (on video) or featured (on overview) grid
function act_m_init(_, obs) {
    obs.disconnect();
    if (m_getWatchNext()) {
        observe(m_getWatchNext(), act_m_related);
    } else {
        const gridRenderer = m_getFeaturedGrid();
        if (gridRenderer) observe(gridRenderer, act_m_list);
        observe(m_getBrowseHost(), act_m_browse, undefined, m_getFeaturedGrid);
    }
}

function act_m_lazyList(mut) {
    iter_mutations(mut, (n) => {
        if (n.nodeName === "YTM-REEL-SHELF-RENDERER") n.style.display = "none";
    });
}

function act_m_related(mut) {
    iter_mutations(mut, (n) => {
        const lazyList = n.querySelector && n.querySelector("lazy-list");
        const isItemSection =
            n.nodeName === "YTM-ITEM-SECTION-RENDERER" ||
            n?.attributes?.["class"] === "related-items-container";
        if (isItemSection && lazyList) {
            const reelShelf = lazyList.querySelector("ytm-reel-shelf-renderer");
            if (reelShelf) reelShelf.style.display = "none";
            observe(lazyList, act_m_lazyList);
        }
    });
}

function act_m_list(mut, obs) {
    obs.disconnect();
    m_obs = obs;
    act_shortCatcher(mut);
    setTimeout(
        () =>
            document
                .querySelectorAll("ytm-reel-shelf-renderer")
                .forEach(blockShort),
        50,
    );
}

function act_m_browse(_, obs) {
    obs.disconnect();
    observe(m_getFeaturedGrid(), act_m_list);
}

//###############
// ELEMENT-GETTER
//###############

function getPageManager() {
    return document.querySelector("ytd-page-manager");
}

function getRelated() {
    return document
        .getElementById("related")
        ?.querySelector("ytd-watch-next-secondary-results-renderer")
        ?.querySelector("div[id=items]");
}

function m_getBrowseHost() {
    return document.querySelector("ytm-browse[class=YtmBrowseHost]");
}

function m_getFeaturedGrid() {
    return (
        document.querySelector("div[class=rich-grid-renderer-contents]") ||
        document.querySelector("lazy-list")
    );
}

function m_getWatchNext() {
    return document.querySelector(
        "ytm-single-column-watch-next-results-renderer",
    );
}

//######
// UTILS
//######

function removeShortNav() {
    document
        .querySelector("ytd-mini-guide-entry-renderer[aria-label=Shorts]")
        ?.remove();
    document
        .querySelector("ytd-guide-entry-renderer > a[title=Shorts]")
        ?.remove();
}

function isMobilVersion() {
    return /https?:\/\/m/.test(document.URL);
}

function iter_mutations(mut, fn) {
    return mut.forEach((u) => u.addedNodes.forEach(fn));
}

function blockShort(n) {
    const isReelShelf =
        n.nodeName === "YTD-REEL-SHELF-RENDERER" ||
        n.nodeName === "YTM-REEL-SHELF-RENDERER";
    const isRichSection =
        n.nodeName === "YTD-RICH-SECTION-RENDERER" ||
        n.nodeName === "YTM-RICH-SECTION-RENDERER";
    const containsShort =
        n.querySelector &&
        (n.querySelector("ytd-rich-shelf-renderer")?.attributes["is-shorts"] ||
            n.querySelector("h2 > span")?.textContent === "Shorts");
    if ((isRichSection && containsShort) || isReelShelf)
        n.style.display = "none";
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
