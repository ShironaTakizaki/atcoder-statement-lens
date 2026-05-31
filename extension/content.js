(function () {
  "use strict";

  const STATEMENT_SELECTOR = "#task-statement";
  const TEXT_TOKEN_PATTERN = /[A-Za-z]_[A-Za-z0-9]+|[A-Z]|(?<![A-Za-z\\])[ijk](?![A-Za-z])/g;
  const MATH_TOKEN_PATTERN = /[A-Za-z]_[A-Za-z0-9]+|[A-Z]|(?<![A-Za-z\\])[ijk](?![A-Za-z])/g;
  const INDEX_TOKEN_PATTERN = /^[ijk]$/;
  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "BUTTON"]);
  const SAMPLE_HEADING_PATTERN = /^(入力例|出力例|Sample Input|Sample Output)(?:\s|$)/i;

  const state = {
    pinnedTokens: null,
    hoverTokens: null
  };

  const statement = document.querySelector(STATEMENT_SELECTOR);
  if (!statement) {
    return;
  }

  initialize();

  function initialize() {
    wrapTextTokens(statement);
    markKatexFormulas(statement);
    statement.addEventListener("mouseover", handleMouseOver);
    statement.addEventListener("mouseout", handleMouseOut);
    statement.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeyDown);
  }

  function wrapTextTokens(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        const pattern = parent && parent.closest("var") ? MATH_TOKEN_PATTERN : TEXT_TOKEN_PATTERN;

        if (!node.nodeValue || !pattern.test(node.nodeValue)) {
          pattern.lastIndex = 0;
          return NodeFilter.FILTER_REJECT;
        }
        pattern.lastIndex = 0;

        if (
          !parent ||
          shouldSkipElement(parent) ||
          isHiddenInsideStatement(parent) ||
          isInSampleSection(parent)
        ) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) {
      const parent = walker.currentNode.parentElement;
      nodes.push({
        node: walker.currentNode,
        pattern: parent && parent.closest("var") ? MATH_TOKEN_PATTERN : TEXT_TOKEN_PATTERN
      });
    }

    for (const item of nodes) {
      replaceTextNode(item.node, item.pattern);
    }
  }

  function replaceTextNode(node, pattern) {
    const text = node.nodeValue;
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const token = match[0];
      const start = match.index;

      if (start > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, start)));
      }

      const span = document.createElement("span");
      span.className = "asl-token";
      span.dataset.aslToken = token;
      span.textContent = token;
      fragment.appendChild(span);

      lastIndex = start + token.length;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    node.parentNode.replaceChild(fragment, node);
  }

  function markKatexFormulas(root) {
    const annotations = root.querySelectorAll(
      '.katex annotation[encoding="application/x-tex"]'
    );

    for (const annotation of annotations) {
      const formula = annotation.closest(".katex");
      if (!formula || isHiddenInsideStatement(formula) || isInSampleSection(formula)) {
        continue;
      }

      const tokens = extractTokens(annotation.textContent || "");
      if (tokens.length === 0) {
        continue;
      }

      formula.classList.add("asl-formula");
      formula.dataset.aslTokens = tokens.join(" ");
    }
  }

  function extractTokens(source) {
    const tokens = new Set();
    MATH_TOKEN_PATTERN.lastIndex = 0;
    for (const match of source.matchAll(MATH_TOKEN_PATTERN)) {
      tokens.add(match[0]);
    }
    return Array.from(tokens);
  }

  function handleMouseOver(event) {
    const tokenElement = event.target.closest(".asl-token");
    const formulaElement = event.target.closest(".asl-formula");

    if (tokenElement && statement.contains(tokenElement)) {
      state.hoverTokens = expandTokenSelection(tokenElement.dataset.aslToken);
      applyHighlights(tokenElement);
      return;
    }

    if (formulaElement && statement.contains(formulaElement)) {
      state.hoverTokens = expandTokenSet(getFormulaTokens(formulaElement));
      applyHighlights(formulaElement);
    }
  }

  function handleMouseOut(event) {
    const tokenElement = event.target.closest(".asl-token");
    const formulaElement = event.target.closest(".asl-formula");
    const activeElement = tokenElement || formulaElement;

    if (!activeElement || !statement.contains(activeElement)) {
      return;
    }

    if (event.relatedTarget instanceof Node && activeElement.contains(event.relatedTarget)) {
      return;
    }

    state.hoverTokens = null;
    applyHighlights(null);
  }

  function handleClick(event) {
    const tokenElement = event.target.closest(".asl-token");
    const formulaElement = event.target.closest(".asl-formula");

    if (tokenElement && statement.contains(tokenElement)) {
      const tokens = expandTokenSelection(tokenElement.dataset.aslToken);
      state.pinnedTokens = sameTokens(state.pinnedTokens, tokens) ? null : tokens;
      applyHighlights(tokenElement);
      return;
    }

    if (formulaElement && statement.contains(formulaElement)) {
      const tokens = expandTokenSet(getFormulaTokens(formulaElement));
      state.pinnedTokens = sameTokens(state.pinnedTokens, tokens) ? null : tokens;
      applyHighlights(formulaElement);
    }
  }

  function handleKeyDown(event) {
    if (event.key !== "Escape") {
      return;
    }

    state.pinnedTokens = null;
    state.hoverTokens = null;
    applyHighlights(null);
  }

  function applyHighlights(activeElement) {
    const activeTokens = state.pinnedTokens || state.hoverTokens;

    for (const element of statement.querySelectorAll(".asl-match, .asl-active, .asl-pinned")) {
      element.classList.remove("asl-match", "asl-active", "asl-pinned");
    }

    for (const element of statement.querySelectorAll(".asl-formula-match, .asl-formula-active")) {
      element.classList.remove("asl-formula-match", "asl-formula-active");
    }

    if (!activeTokens || activeTokens.length === 0) {
      return;
    }

    for (const element of statement.querySelectorAll(".asl-token")) {
      if (!activeTokens.includes(element.dataset.aslToken)) {
        continue;
      }

      element.classList.add("asl-match");
      if (state.pinnedTokens && activeTokens.includes(element.dataset.aslToken)) {
        element.classList.add("asl-pinned");
      }
    }

    for (const formula of statement.querySelectorAll(".asl-formula")) {
      const tokens = getFormulaTokens(formula);
      if (tokens.some((token) => activeTokens.includes(token))) {
        formula.classList.add("asl-formula-match");
      }
    }

    if (activeElement && activeElement.classList.contains("asl-token")) {
      activeElement.classList.add("asl-active");
    }

    if (activeElement && activeElement.classList.contains("asl-formula")) {
      activeElement.classList.add("asl-formula-active");
    }
  }

  function getFormulaTokens(formula) {
    return (formula.dataset.aslTokens || "").split(" ").filter(Boolean);
  }

  function expandTokenSelection(token) {
    if (!INDEX_TOKEN_PATTERN.test(token)) {
      return [token];
    }

    const tokens = new Set([token]);
    for (const element of statement.querySelectorAll(".asl-token")) {
      const candidate = element.dataset.aslToken || "";
      if (candidate.endsWith(`_${token}`)) {
        tokens.add(candidate);
      }
    }

    for (const formula of statement.querySelectorAll(".asl-formula")) {
      for (const candidate of getFormulaTokens(formula)) {
        if (candidate.endsWith(`_${token}`)) {
          tokens.add(candidate);
        }
      }
    }

    return Array.from(tokens);
  }

  function expandTokenSet(tokens) {
    const expanded = new Set();
    for (const token of tokens) {
      for (const expandedToken of expandTokenSelection(token)) {
        expanded.add(expandedToken);
      }
    }

    return Array.from(expanded);
  }

  function sameTokens(left, right) {
    if (!left || !right || left.length !== right.length) {
      return false;
    }

    return left.every((token) => right.includes(token));
  }

  function shouldSkipElement(element) {
    if (SKIP_TAGS.has(element.tagName)) {
      return true;
    }

    return Boolean(
      element.closest(
        ".katex, .asl-token, script, style, textarea, input, button"
      )
    );
  }

  function isHiddenInsideStatement(element) {
    for (let current = element; current && current !== statement; current = current.parentElement) {
      const style = window.getComputedStyle(current);
      if (style.display === "none" || style.visibility === "hidden") {
        return true;
      }
    }

    return false;
  }

  function isInSampleSection(element) {
    const part = element.closest(".part");
    if (!part) {
      return false;
    }

    const heading = part.querySelector("h3");
    return Boolean(heading && SAMPLE_HEADING_PATTERN.test(heading.textContent.trim()));
  }
})();
