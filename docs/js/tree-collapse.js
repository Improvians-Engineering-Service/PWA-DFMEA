(function(){
  "use strict";
  // Collapsible branches for the risk diagram. The diagram is a pre-laid-out SVG (every card has a
  // fixed position), so a Crimp-sized analysis is thousands of pixels tall. This file shows it
  // progressively instead: a card that has causes below it carries a small round button; clicking
  // it opens or closes that branch, and the diagram closes up around what is left.
  //
  // Nothing in the original drawing is edited. A card is moved with a transform, a connector's
  // original path is kept in data-orig-d, and hiding is just display="none", so removing this
  // script (and its <script> line) puts the diagram back exactly as it was.
  var content = document.getElementById("treeContent");
  if(!content) return;
  var svg = content.ownerSVGElement;
  var NS = "http://www.w3.org/2000/svg";
  var GAP = 10;            // vertical space between two cards in the same column
  var TOP_PAD = 16;        // space above the first card
  var BIG = 60;            // a diagram with more cards than this starts closed

  var items = [];          // every card: { el, x, y, w, h, col, plus, toggle, parent, kids, collapsed, ny, shown }
  var byEl = new Map();
  var edges = [];          // connectors: { path, k, x1, y1, x2, y2, src, dst, cross }
  var lanes = [];

  var tf = (function(){
    var m = /matrix\(([-\d.]+)\s+0\s+0\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\)/.exec(content.getAttribute("transform") || "");
    return m ? { sx: parseFloat(m[1]), sy: parseFloat(m[2]), tx: parseFloat(m[3]), ty: parseFloat(m[4]) } : { sx: 1, sy: 1, tx: 0, ty: 0 };
  })();

  // ---------------------------------------------------------------- style
  var style = document.createElement("style");
  style.textContent =
    // The diagram's top padding must sit outside the box it is scaled into, or the drawing is scaled
    // to the box minus that padding, and its size would drift as the diagram grows and shrinks.
    ".treezoom{box-sizing:content-box}"
    + ".cx-toggle{cursor:pointer}"
    + ".cx-toggle .cx-bg{stroke-width:1.5}"
    + ".cx-toggle:hover .cx-bg{opacity:.88}"
    + ".cx-toggle text{font:700 10px Cambria,Georgia,serif;text-anchor:middle;pointer-events:none}"
    + ".hitbox.cx-branch{cursor:pointer}"
    + ".cx-edit{cursor:pointer}"
    + ".cx-edit:hover circle{fill:#F1F5F9}"
    + ".cx-in{animation:cxIn .25s ease}"
    + "@keyframes cxIn{from{opacity:0}to{opacity:1}}"
    + ".cx-bar{margin-right:22px}"
    + ".cx-bar button{width:auto;padding:0 11px;font-size:11.5px;font-weight:600;color:#334155;white-space:nowrap}";
  document.head.appendChild(style);

  // ---------------------------------------------------------------- reading the drawing
  function boxOf(g){
    var rects = g.querySelectorAll("rect");
    var r = rects[1];
    if(!r) return null;
    return { x: parseFloat(r.getAttribute("x")), y: parseFloat(r.getAttribute("y")), w: parseFloat(r.getAttribute("width")), h: parseFloat(r.getAttribute("height")) };
  }
  function addItem(g){
    if(byEl.has(g)) return null;
    var b = boxOf(g);
    if(!b) return null;
    var it = { el: g, x: b.x, y: b.y, w: b.w, h: b.h, col: Math.round(b.x), plus: null, toggle: null,
      parent: null, kids: [], collapsed: false, ny: b.y, shown: true };
    items.push(it);
    byEl.set(g, it);
    var next = g.nextElementSibling;
    if(next && next.classList.contains("pl")) it.plus = next;
    return it;
  }
  function parseEdge(path){
    if(path.parentNode !== content) return null;
    var d = path.getAttribute("data-orig-d") || path.getAttribute("d") || "";
    var m = /^\s*M\s*(-?[\d.]+)[ ,]\s*(-?[\d.]+)\s*C\s*(-?[\d.]+)[ ,]\s*(-?[\d.]+)\s+(-?[\d.]+)[ ,]\s*(-?[\d.]+)\s+(-?[\d.]+)[ ,]\s*(-?[\d.]+)/.exec(d);
    if(!m) return null;
    if(!path.hasAttribute("data-orig-d")) path.setAttribute("data-orig-d", d);
    var e = { path: path, x1: +m[1], y1: +m[2], x2: +m[7], y2: +m[8], k: +m[3] - +m[1], src: null, dst: null, cross: path.hasAttribute("data-local-cause-link") };
    return e;
  }
  // A connector was drawn before a card's height was trimmed, so its end can sit a few pixels off
  // the card's exact middle: the nearest card in the right column, within a card's reach, is it.
  function resolve(e){
    var bestS = 12, bestD = 12;
    items.forEach(function(it){
      var cy = it.y + it.h / 2;
      if(Math.abs(it.x + it.w - e.x1) < 2){
        var ds = Math.abs(cy - e.y1);
        if(ds < bestS){ bestS = ds; e.src = it; }
      }
      if(Math.abs(it.x - e.x2) < 2){
        var dd = Math.abs(cy - e.y2);
        if(dd < bestD){ bestD = dd; e.dst = it; }
      }
    });
  }
  function link(){
    items.forEach(function(it){ it.parent = null; it.kids = []; });
    edges.forEach(function(e){
      if(e.cross || !e.src || !e.dst) return;
      e.dst.parent = e.src;
      e.src.kids.push(e.dst);
    });
    items.forEach(function(it){ it.kids.sort(function(a, b){ return a.y - b.y; }); });
  }
  function isFunction(it){
    var tag = it.el.querySelector(".ttag");
    return !!tag && /^FUNCTION/i.test(tag.textContent.trim());
  }
  function countBelow(it){
    var n = 0;
    it.kids.forEach(function(k){ n += 1 + countBelow(k); });
    return n;
  }

  // ---------------------------------------------------------------- layout
  // Closes the diagram up around what is showing. A card never moves because of what is below or
  // beside it to the right: its causes stack down from its own top, and only the cards that come
  // after its branch (further down) make room. So opening a card leaves it, and everything to its
  // left and above, exactly where it is.
  function layout(){
    items.forEach(function(it){ it.shown = false; });
    // Places a card at y with its open causes below it; returns the bottom of the whole branch.
    function place(it, y){
      it.shown = true;
      it.ny = y;
      var bottom = y + it.h;
      if(!it.collapsed){
        var at = y;
        it.kids.forEach(function(k){
          var kidBottom = place(k, at);
          bottom = Math.max(bottom, kidBottom);
          at = kidBottom + GAP;
        });
      }
      return bottom;
    }
    var cursor = TOP_PAD;
    items.filter(function(it){ return !it.parent; }).sort(function(a, b){ return a.y - b.y; }).forEach(function(root){
      cursor = place(root, cursor) + GAP;
    });
  }

  // ---------------------------------------------------------------- applying it
  function setShown(el, shown){
    if(!el) return;
    if(shown) el.removeAttribute("display"); else el.setAttribute("display", "none");
  }
  function move(el, dy){
    if(!el) return;
    if(Math.abs(dy) < 0.01) el.removeAttribute("transform"); else el.setAttribute("transform", "translate(0 " + dy + ")");
  }
  // A small badge on a card that has causes below it: the number of causes inside when it is
  // closed, a minus when it is open. Clicking it, or the card itself, opens or closes the branch.
  function makeToggle(it){
    var g = document.createElementNS(NS, "g");
    g.setAttribute("class", "cx-toggle");
    g.innerHTML = '<rect class="cx-bg" rx="9" height="18"></rect><text></text>';
    // After the card's own "+" so the card, its "+" and its badge stay together.
    var anchor = it.plus || it.el;
    anchor.parentNode.insertBefore(g, anchor.nextSibling);
    it.toggle = g;
  }
  function paintToggle(it){
    var g = it.toggle;
    var closed = it.collapsed;
    var label = closed ? String(Math.min(countBelow(it), 999)) : "−";
    var width = closed ? Math.max(20, 9 + label.length * 6.5) : 18;
    var cx = it.x + it.w + 3;
    var cy = it.y + it.h - 11;
    var rect = g.firstChild, text = g.lastChild;
    rect.setAttribute("width", width);
    rect.setAttribute("x", cx - width / 2);
    rect.setAttribute("y", cy - 9);
    // The card's own accent colour as painted now (one colour, or the manufacturing colour).
    var accent = window.getComputedStyle(it.el.querySelectorAll("rect")[2]).fill;
    rect.style.fill = closed ? accent : "#fff";
    rect.style.stroke = closed ? "none" : accent;
    text.setAttribute("x", cx);
    text.setAttribute("y", cy + 3.6);
    text.style.fill = closed ? "#fff" : accent;
    text.style.fontSize = closed ? "10px" : "13px";
    text.textContent = label;
    g.setAttribute("aria-label", closed ? "Show the causes below" : "Hide the causes below");
    it.el.classList.add("cx-branch");
  }

  // An edit button on each cause card (next to its flag), so renaming is a visible control and
  // not a hidden double-click. It asks the diagram's own rename to start.
  function addEdit(it){
    var tag = it.el.querySelector(".ttag");
    if(!tag || !/^CAUSE/i.test(tag.textContent.trim()) || it.el.querySelector(".cx-edit")) return;
    var cx = it.x + it.w - 33, cy = it.y + 11;
    var g = document.createElementNS(NS, "g");
    g.setAttribute("class", "cx-edit");
    g.setAttribute("role", "button");
    g.setAttribute("tabindex", "0");
    g.setAttribute("aria-label", "Edit this cause");
    g.setAttribute("data-tip", "Edit this cause");
    g.innerHTML = '<circle cx="' + cx + '" cy="' + cy + '" r="7" fill="#fff" stroke="#CBD5E1" stroke-width="1.2"></circle>'
      + '<path d="M' + (cx - 3) + ',' + (cy + 3) + ' l.6,-2.2 L' + (cx + 2.2) + ',' + (cy - 3.4) + ' l1.6,1.6 L' + (cx - .6) + ',' + (cy + 2.4) + ' Z" fill="none" stroke="#94A3B8" stroke-width="1.2" stroke-linejoin="round"></path>';
    function edit(event){
      event.preventDefault();
      event.stopPropagation();
      it.el.dispatchEvent(new CustomEvent("editnode", { bubbles: true }));
    }
    g.addEventListener("click", edit);
    g.addEventListener("pointerdown", function(event){ event.stopPropagation(); });
    g.addEventListener("keydown", function(event){ if(event.key === "Enter" || event.key === " ") edit(event); });
    it.el.appendChild(g);
  }

  function apply(){
    layout();
    var right = 0, bottom = 0;
    var cols = {};
    items.forEach(function(it){
      setShown(it.el, it.shown);
      setShown(it.plus, it.shown);
      var dy = it.ny - it.y;
      move(it.el, dy);
      move(it.plus, dy);
      if(it.kids.length){
        if(!it.toggle) makeToggle(it);
        paintToggle(it);
        move(it.toggle, dy);
        setShown(it.toggle, it.shown);
      }else if(it.toggle){
        it.toggle.remove();
        it.toggle = null;
      }
      if(it.shown){
        cols[it.col] = true;
        right = Math.max(right, it.x + it.w);
        bottom = Math.max(bottom, it.ny + it.h);
      }
    });
    edges.forEach(function(e){
      var s = e.src, t = e.dst;
      var visible = s && t && s.shown && t.shown && (e.cross || !s.collapsed);
      setShown(e.path, visible);
      if(!visible) return;
      var y1 = e.y1 + (s.ny - s.y), y2 = e.y2 + (t.ny - t.y);
      e.path.setAttribute("d", "M" + e.x1 + "," + y1 + " C" + (e.x1 + e.k) + "," + y1 + " " + (e.x2 - e.k) + "," + y2 + " " + e.x2 + "," + y2);
    });
    lanes.forEach(function(l){ setShown(l.el, !!cols[l.col]); });
    resize(right, bottom);
  }

  // The drawing's frame follows what is showing, so a closed-up diagram is genuinely smaller.
  function resize(right, bottom){
    var w = Math.ceil(Math.max(right, 1) * tf.sx + tf.tx + 40);
    var h = Math.ceil(Math.max(bottom, 1) * tf.sy + tf.ty + 40);
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    svg.setAttribute("width", w);
    svg.setAttribute("height", h);
    if(window.refreshTreeZoom) window.refreshTreeZoom();
    var wrap = document.getElementById("treeWrap");
    if(wrap && wrap.classList.contains("open")) window.dispatchEvent(new Event("treeModalOpened"));
  }

  // ---------------------------------------------------------------- actions
  function zoomOf(){
    var wrap = document.getElementById("treeWrap");
    return wrap ? (Number(wrap.style.getPropertyValue("--z")) || 1) : 1;
  }
  // Runs a change and keeps the card the person is looking at where it was on screen.
  function keepInView(it, change){
    var before = it ? it.ny : 0;
    change();
    apply();
    var wrap = document.getElementById("treeWrap");
    if(it && wrap && it.shown) wrap.scrollTop += (it.ny - before) * tf.sy * zoomOf();
  }
  function toggle(it){
    keepInView(it, function(){
      it.collapsed = !it.collapsed;
      if(!it.collapsed) it.kids.forEach(function(k){ k.el.classList.add("cx-in"); });
      setTimeout(function(){ it.kids.forEach(function(k){ k.el.classList.remove("cx-in"); }); }, 300);
    });
  }
  function openPathTo(it){
    for(var p = it.parent; p; p = p.parent) p.collapsed = false;
  }
  function setAll(collapsed){
    items.forEach(function(it){ if(it.kids.length) it.collapsed = collapsed && !isFunction(it); });
    apply();
    var wrap = document.getElementById("treeWrap");
    if(wrap){ wrap.scrollTop = 0; wrap.scrollLeft = 0; }
  }
  function centreOn(it){
    var wrap = document.getElementById("treeWrap");
    if(!wrap || !it.shown) return;
    var z = zoomOf();
    var cx = ((it.x + it.w / 2) * tf.sx + tf.tx) * z;
    var cy = ((it.ny + it.h / 2) * tf.sy + tf.ty) * z;
    wrap.scrollLeft = Math.max(0, cx - wrap.clientWidth / 2);
    wrap.scrollTop = Math.max(0, cy - wrap.clientHeight / 2);
  }

  // Clicking a card (or its badge) that has causes below it opens or closes that branch (a drag, or a
  // click on the card's own buttons, does not).
  var downAt = null;
  content.addEventListener("pointerdown", function(event){ downAt = { x: event.clientX, y: event.clientY }; });
  content.addEventListener("click", function(event){
    if(event.target.closest(".pl, .flagbtn, .cx-edit")) return;
    if(downAt && (Math.abs(event.clientX - downAt.x) > 5 || Math.abs(event.clientY - downAt.y) > 5)) return;
    var badge = event.target.closest(".cx-toggle");
    var g = badge ? null : event.target.closest("g.hitbox");
    var it = g ? byEl.get(g) : badge ? items.filter(function(i){ return i.toggle === badge; })[0] : null;
    if(it && it.kids.length) toggle(it);
  });

  // ---------------------------------------------------------------- start
  Array.prototype.slice.call(content.querySelectorAll(":scope > g.hitbox")).forEach(addItem);
  Array.prototype.slice.call(content.querySelectorAll(":scope > path")).forEach(function(p){
    var e = parseEdge(p);
    if(e){ resolve(e); edges.push(e); }
  });
  Array.prototype.slice.call(content.querySelectorAll(":scope > text.lane")).forEach(function(t){
    lanes.push({ el: t, col: Math.round(parseFloat(t.getAttribute("x"))) });
  });
  link();
  items.forEach(addEdit);
  // A small diagram needs no closing up; only a large one (the Crimp analysis) starts closed.
  function closeUp(){
    if(items.length > BIG) items.forEach(function(it){ it.collapsed = it.kids.length > 0 && !isFunction(it); });
  }
  closeUp();
  apply();

  // Closing the full view puts the diagram back to how it first appeared: branches closed again,
  // and the search highlights and path dimming cleared.
  var treeWrap = document.getElementById("treeWrap");
  if(treeWrap){
    var wasOpen = treeWrap.classList.contains("open");
    new MutationObserver(function(){
      var open = treeWrap.classList.contains("open");
      if(wasOpen && !open){
        closeUp();
        apply();
        Array.prototype.slice.call(svg.querySelectorAll(".dim, .search-hit, .search-current, .node-flash")).forEach(function(el){
          el.classList.remove("dim", "search-hit", "search-current", "node-flash");
        });
        svg.classList.remove("searching");
        treeWrap.scrollLeft = 0;
        treeWrap.scrollTop = 0;
      }
      wasOpen = open;
    }).observe(treeWrap, { attributes: true, attributeFilter: ["class"] });
  }

  // The page hides the diagram until it is closed up (see #cxHold in the page head), so the open
  // version never flashes; it shows from here.
  var hold = document.getElementById("cxHold");
  if(hold) hold.remove();

  // A cause added, moved or removed later (the "+" buttons, drag to re-parent, undo) joins the
  // diagram: it opens the branch it was added to so it is not hidden the moment it is made.
  var pending = false;
  new MutationObserver(function(records){
    var added = false;
    records.forEach(function(r){
      Array.prototype.slice.call(r.addedNodes).forEach(function(n){
        if(n.nodeType === 1 && n.parentNode === content && !n.classList.contains("cx-toggle")) added = true;
      });
      if(r.removedNodes.length) added = true;
    });
    if(!added || pending) return;
    pending = true;
    Promise.resolve().then(function(){
      pending = false;
      sync();
    });
  }).observe(content, { childList: true });

  // Other scripts grow a card after load (a long title makes its box taller), so the spacing is
  // worked out again whenever a card's height changes.
  var regrow = false;
  new MutationObserver(function(){
    if(regrow) return;
    regrow = true;
    requestAnimationFrame(function(){
      regrow = false;
      var changed = false;
      items.forEach(function(it){
        var b = boxOf(it.el);
        if(b && b.h !== it.h){ it.h = b.h; changed = true; }
      });
      if(changed) apply();
    });
  }).observe(content, { subtree: true, attributes: true, attributeFilter: ["height"] });

  function sync(){
    items = items.filter(function(it){
      if(content.contains(it.el)) return true;
      if(it.toggle) it.toggle.remove();
      byEl.delete(it.el);
      return false;
    });
    var fresh = [];
    Array.prototype.slice.call(content.querySelectorAll(":scope > g.hitbox")).forEach(function(g){
      var it = addItem(g);
      if(it) fresh.push(it);
    });
    edges = edges.filter(function(e){ return content.contains(e.path) && (!e.src || items.indexOf(e.src) !== -1) && (!e.dst || items.indexOf(e.dst) !== -1); });
    Array.prototype.slice.call(content.querySelectorAll(":scope > path")).forEach(function(p){
      if(p.hasAttribute("data-orig-d") && edges.some(function(e){ return e.path === p; })) return;
      var e = parseEdge(p);
      if(e){ resolve(e); edges.push(e); }
    });
    var more = content.querySelectorAll(":scope > text.lane");
    if(more.length !== lanes.length){
      lanes = Array.prototype.slice.call(more).map(function(t){ return { el: t, col: Math.round(parseFloat(t.getAttribute("x"))) }; });
    }
    link();
    fresh.forEach(addEdit);
    fresh.forEach(openPathTo);
    apply();
    if(fresh.length) centreOn(fresh[fresh.length - 1]);
  }

  // An export carries the whole diagram: every branch is opened for the length of the export
  // (which may be asynchronous), then the screen goes back to how it was.
  window.treeWithAllOpen = function(run){
    var saved = items.map(function(it){ return [it, it.collapsed]; });
    var wrap = document.getElementById("treeWrap");
    var left = wrap ? wrap.scrollLeft : 0, top = wrap ? wrap.scrollTop : 0;
    items.forEach(function(it){ it.collapsed = false; });
    apply();
    function restore(){
      saved.forEach(function(s){ s[0].collapsed = s[1]; });
      apply();
      if(wrap){ wrap.scrollLeft = left; wrap.scrollTop = top; }
    }
    var out;
    try{ out = run(); }catch(error){ restore(); throw error; }
    if(out && typeof out.then === "function") return out.then(function(r){ restore(); return r; }, function(error){ restore(); throw error; });
    restore();
    return out;
  };

  // ---------------------------------------------------------------- toolbar
  var bar = document.querySelector("#treeWrap .treemodalbar");
  if(bar){
    var group = document.createElement("div");
    group.className = "tzoom cx-bar";
    group.innerHTML = '<button type="button" data-tip="Open every branch of the diagram.">Expand all</button>'
      + '<button type="button" data-tip="Close the branches so only the functions and failure modes show.">Collapse all</button>';
    bar.insertBefore(group, bar.firstChild.nextSibling);
    group.children[0].addEventListener("click", function(){ setAll(false); });
    group.children[1].addEventListener("click", function(){ setAll(true); });
  }

  // ---------------------------------------------------------------- the rest of the page
  // Searching opens the branches that hold a match, so each match is on screen to step to.
  var search = document.getElementById("treeSearch");
  if(search){
    search.addEventListener("input", function(){
      var q = search.value.trim().toLowerCase();
      if(!q) return;
      var opened = false;
      items.forEach(function(it){
        var t = it.el.querySelector(".ttl2");
        var text = t ? t.textContent.replace(/\s+/g, " ").trim().toLowerCase() : "";
        if(text.indexOf(q) === -1) return;
        for(var p = it.parent; p; p = p.parent){ if(p.collapsed){ p.collapsed = false; opened = true; } }
      });
      if(opened) apply();
    }, true);
  }
  // "Locate" on a worksheet row: open the branch, then land on the card.
  document.addEventListener("click", function(event){
    var btn = event.target.closest && event.target.closest(".locate-btn");
    var row = btn && btn.closest("tr");
    if(!row || !row.dataset.nodeId) return;
    var target = items.filter(function(it){ return it.el.dataset.nodeId === row.dataset.nodeId; })[0];
    if(!target) return;
    openPathTo(target);
    apply();
    // The page's own scroll-to-card runs a moment later from the card's unmoved position, so land after it.
    [380, 900].forEach(function(ms){ setTimeout(function(){ centreOn(target); }, ms); });
  }, true);
})();
