(function(){
  "use strict";

  var svg = document.querySelector("#treeZoom svg");
  var treeContent = svg && svg.querySelector("#treeContent");
  var tableBody = document.getElementById("wsBody");
  if(!svg || !treeContent || !tableBody) return;

  var svgNs = "http://www.w3.org/2000/svg";
  // Every other document opens on this same page via ?doc=<id>, so edits
  // must be stored per document -- otherwise a cause added in one shows
  // up in all of them. The plain Crimp DFMEA keeps its original key.
  var docParam = new URLSearchParams(window.location.search).get("doc");
  var storageKey = "dfmea-it1-local-edits-347352010pdp000_01" + (docParam ? "--" + docParam : "");
  // One failure mode per function, in the order they appear in the diagram. The first keeps the
  // id "failure-main"; every cause hangs off the failure mode named in its data-fm attribute.
  var failureNodes = Array.prototype.slice.call(svg.querySelectorAll("g.hitbox")).filter(function(node){
    var tag = node.querySelector(".ttag");
    return tag && tag.textContent.trim().indexOf("FAILURE MODE") === 0;
  });
  function failureId(index){ return index === 1 ? "failure-main" : "failure-" + index; }
  var nodes = new Map();
  var localNodes = [];
  var localLinks = [];
  var dialogParentId = null;
  var editingItem = null;
  var editingRow = null;
  var canStore = true;
  var localState = { nodes: [], links: [] };
  var dialog = document.createElement("dialog");
  dialog.id = "causeEditor";
  dialog.className = "cause-editor";
  dialog.innerHTML = '<form id="causeEditorForm"><header><h2 id="causeEditorTitle">Add or link a cause</h2><p id="causeEditorParent"></p></header><div class="ce-body"><label class="ce-field" id="causeParentField">Add under<select id="causeParentSelect"></select></label><label class="ce-field">Action<select id="causeAction"><option value="add">Add child cause</option><option value="link">Link existing cause</option><option value="both">Add child and link cause</option></select></label>'
    + '<label class="ce-field" id="causeDescriptionField">Cause description<input id="causeDescription" maxlength="180" required placeholder="Describe the cause"></label>'
    + '<label class="ce-tbd-toggle"><input type="checkbox" id="causeTbd"> Mark as TBD <span>(the cause is not yet identified, no description needed)</span></label>'
    + '<div class="ce-field" id="causeCategoryField"><span>Category</span><div class="ce-cat-toggle" id="causeCategoryToggle">'
    + '<button type="button" class="ce-cat-opt on" data-value="none">None</button>'
    + '<button type="button" class="ce-cat-opt" data-value="design">Design</button>'
    + '<button type="button" class="ce-cat-opt" data-value="manufacturing">Manufacturing</button>'
    + '</div><div class="ce-note">Marks this as the deepest Design or Manufacturing cause for this chain, same as the client\'s own Summary columns.</div></div>'
    + '<div class="ce-field" id="causeRatingField"><span>Risk rating</span>'
    + '<div class="rate-grid" id="causeRateGrid"></div></div>'
    + '<label class="ce-field" id="causeLinkField" hidden>Link to existing cause<select id="causeLinkTarget"></select></label><div class="ce-level" id="causeLevel"></div><div class="ce-note" id="causeEditorStatus">All changes are saved automatically.</div></div><footer><button type="button" id="causeCancel">Cancel</button><button type="submit" class="primary">Save</button></footer></form>';
  document.body.appendChild(dialog);
  var actionSelect = document.getElementById("causeAction");
  var descriptionInput = document.getElementById("causeDescription");
  var descriptionField = document.getElementById("causeDescriptionField");
  var tbdCheckbox = document.getElementById("causeTbd");
  var linkField = document.getElementById("causeLinkField");
  var levelNote = document.getElementById("causeLevel");
  var parentField = document.getElementById("causeParentField");
  var parentSelect = document.getElementById("causeParentSelect");
  var ratingField = document.getElementById("causeRatingField");
  var rateGrid = document.getElementById("causeRateGrid");
  var categoryField = document.getElementById("causeCategoryField");
  var categoryToggle = document.getElementById("causeCategoryToggle");
  var selectedCategory = "none";
  if(categoryToggle) categoryToggle.addEventListener("click", function(event){
    var btn = event.target.closest(".ce-cat-opt");
    if(!btn) return;
    setCategoryToggle(btn.dataset.value);
  });
  function setCategoryToggle(value){
    selectedCategory = value;
    if(!categoryToggle) return;
    Array.prototype.slice.call(categoryToggle.querySelectorAll(".ce-cat-opt")).forEach(function(b){
      b.classList.toggle("on", b.dataset.value === value);
    });
  }
  var FIXED_SEVERITY = 9;
  if(window.enhanceSelect){
    window.enhanceSelect(actionSelect);
    window.enhanceSelect(parentSelect);
    window.enhanceSelect(document.getElementById("causeLinkTarget"));
  }

  // The dialog's rating section is one card per product variant (plus a
  // fixed Severity card), built fresh from window.dfmeaVariants instead
  // of two hard-coded TPX50-50/TPX120 fields -- so adding a variant
  // (see "Add variant" in the worksheet toolbar) immediately shows up
  // here too, with no second place that could fall out of sync.
  var severityInput = null;
  var variantInputs = []; // [{ variant, occInput, detInput, rpnBadge }]
  function buildRateCards(){
    rateGrid.innerHTML = '<div class="rate-card rate-sev"><div class="rate-h">Severity</div>'
      + '<input id="causeSeverity" type="number" min="1" max="10" step="1" readonly title="Severity comes from the failure mode/effect, not the cause, so it is the same for every path here.">'
      + '<div class="rate-f">Fixed by failure mode</div></div>';
    severityInput = document.getElementById("causeSeverity");
    variantInputs = [];
    var variants = window.dfmeaVariants || [];
    variants.forEach(function(variant, index){
      var card = document.createElement("div");
      card.className = "rate-card";
      card.innerHTML = '<div class="rate-h"></div><div class="rate-inputs">'
        + '<label>Occ.<input type="number" min="1" max="10" step="1" required></label>'
        + '<label>Det.<input type="number" min="1" max="10" step="1" required></label>'
        + '</div><div class="rate-rpn">RPN</div>';
      card.querySelector(".rate-h").textContent = variant.name;
      var inputs = card.querySelectorAll("input");
      var occInput = inputs[0], detInput = inputs[1];
      var rpnBadge = card.querySelector(".rate-rpn");
      occInput.addEventListener("input", updateRpnPreview);
      detInput.addEventListener("input", updateRpnPreview);
      rateGrid.appendChild(card);
      variantInputs.push({ variant: variant, occInput: occInput, detInput: detInput, rpnBadge: rpnBadge });
    });
  }
  window.dfmeaRebuildRatingCards = buildRateCards;
  buildRateCards();

  function updateRpnPreview(){
    var sev = Number(severityInput.value) || 0;
    variantInputs.forEach(function(v){
      var occ = Number(v.occInput.value) || 0, det = Number(v.detInput.value) || 0;
      v.rpnBadge.textContent = "RPN " + (sev * occ * det);
    });
  }
  if(severityInput) severityInput.addEventListener("input", updateRpnPreview);

  function readLocalState(){
    try{
      var raw = window.localStorage.getItem(storageKey);
      if(raw){
        var parsed = JSON.parse(raw);
        if(parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.links)) localState = parsed;
      }
    }catch(error){
      canStore = false;
    }
  }
  readLocalState();
  localNodes = localState.nodes.slice();
  localLinks = localState.links.slice();

  function record(nodeId, element, level, parentId, title, isLocal){
    var item = { id: nodeId, el: element, level: level, parentId: parentId, title: title, isLocal: !!isLocal };
    nodes.set(nodeId, item);
    element.dataset.nodeId = nodeId;
    element.dataset.nodeLevel = String(level);
    return item;
  }

  function causeLevel(element){
    var match = /L(\d+)/.exec(element.querySelector(".ttag").textContent);
    return match ? Number(match[1]) : 0;
  }

  function svgTitle(element){
    var lines=Array.prototype.slice.call(element.querySelectorAll(".ttl2 tspan"));
    return (lines.length ? lines.map(function(line){return line.textContent;}).join(" ") : element.querySelector(".ttl2").textContent)
      .replace(/\s+/g," ").trim();
  }

  function indexSourceNodes(){
    var stack = [];
    var sourceCauses = Array.prototype.slice.call(svg.querySelectorAll("g.hitbox")).filter(function(node){
      return node.querySelector(".ttag") && node.querySelector(".ttag").textContent.trim().indexOf("CAUSE") === 0;
    });
    failureNodes.forEach(function(node, index){
      var label = node.getAttribute("data-fn");
      var item = record(failureId(index + 1), node, 0, null, svgTitle(node) + (label ? " · " + label : ""), false);
      item.fm = index + 1;
    });
    sourceCauses.forEach(function(element, index){
      var level = causeLevel(element);
      var fm = Number(element.getAttribute("data-fm")) || 1;
      var parent = level === 1 ? nodes.get(failureId(fm)) : stack[level - 2];
      var id = "source-cause-" + String(index + 1).padStart(3, "0");
      record(id, element, level, parent ? parent.id : failureId(fm), svgTitle(element), false);
      stack.length = Math.max(0, level - 1);
      stack[level - 1] = nodes.get(id);
    });
  }

  function svgElement(name, attributes){
    var element = document.createElementNS(svgNs, name);
    Object.keys(attributes || {}).forEach(function(key){ element.setAttribute(key, attributes[key]); });
    return element;
  }

  function nodeBox(node){
    return node && node.el && node.el.querySelector("rect:nth-of-type(2)");
  }

  function wrapTitle(text, maxChars){
    var words = text.trim().split(/\s+/);
    var lines = [];
    var current = "";
    words.forEach(function(word){
      var next = current ? current + " " + word : word;
      if(next.length > maxChars && current){
        lines.push(current);
        current = word;
      }else current = next;
    });
    if(current) lines.push(current);
    if(lines.length > 3){
      lines = lines.slice(0, 3);
      lines[2] = lines[2].slice(0, Math.max(8, maxChars - 1)).replace(/\s+$/, "") + "…";
    }
    return lines;
  }

  function palette(level){
    if(level <= 3) return { fill: "#FFFAEB", stroke: "#FCD34D", accent: "#B45309" };
    if(level <= 6) return { fill: "#FFF7ED", stroke: "#FDBA74", accent: "#C2410C" };
    if(level <= 9) return { fill: "#F5F3FF", stroke: "#C4B5FD", accent: "#6D28D9" };
    return { fill: "#FFF1F2", stroke: "#FDA4AF", accent: "#BE123C" };
  }

  // A new cause used to be dropped below the lowest point of the ENTIRE
  // diagram, no matter which branch it actually belonged to -- so after
  // a few additions under different parents, each one landed further
  // from its own branch than the last, with empty space sitting right
  // next to its real parent the whole time. Scope the placement to just
  // this parent's existing children instead: stack below the last real
  // sibling if there are any, or start level with the parent itself if
  // this is its first child.
  function nextNodeY(parent, x, height){
    var siblingIds = childrenMap.get(parent.id) || [];
    var bottom = null;
    siblingIds.forEach(function(id){
      var sibling = nodes.get(id);
      var rect = sibling && nodeBox(sibling);
      if(!rect) return;
      var siblingBottom = Number(rect.getAttribute("y")) + Number(rect.getAttribute("height"));
      if(bottom === null || siblingBottom > bottom) bottom = siblingBottom;
    });
    var parentRect = nodeBox(parent);
    var y = bottom !== null ? bottom + 20 : (parentRect ? Number(parentRect.getAttribute("y")) : 24);
    // Siblings alone aren't the whole story: every node at the same
    // level shares this same column regardless of which parent it hangs
    // off, so an unrelated branch could already occupy this exact spot.
    // Nudge down past anything in this column that would overlap.
    var columnRects = Array.prototype.slice.call(treeContent.querySelectorAll("g.hitbox")).map(function(element){
      return nodeBox({ el: element });
    }).filter(function(rect){ return rect && Math.abs(Number(rect.getAttribute("x")) - x) < 1; });
    var moved = true;
    while(moved){
      moved = false;
      columnRects.forEach(function(rect){
        var ry = Number(rect.getAttribute("y")), rh = Number(rect.getAttribute("height"));
        if(y < ry + rh && y + height > ry){ y = ry + rh + 20; moved = true; }
      });
    }
    return y;
  }

  function resizeDiagram(){
    // treeContent carries its own scale+translate transform (set up once
    // at page load so the whole diagram renders bigger). Every card's
    // x/y/width/height is in LOCAL, pre-transform coordinates, but the
    // svg's viewBox has to be big enough for where that content actually
    // ends up ON SCREEN -- i.e. the local coordinates run through that
    // same transform first. This used to compute the new viewBox from
    // the raw local numbers directly, which was only ever correct by
    // accident at scale 1; once the diagram was scaled up, every local
    // cause added past the original edge came out ~30% short of where
    // it needed to be, clipping the card at the SOURCE (the svg's own
    // viewBox), which no amount of the outer CSS zoom can undo.
    var m = /matrix\(([-\d.]+)\s+0\s+0\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\)/.exec(treeContent.getAttribute("transform") || "");
    var scaleX = m ? parseFloat(m[1]) : 1;
    var scaleY = m ? parseFloat(m[2]) : 1;
    var tx = m ? parseFloat(m[3]) : 0;
    var ty = m ? parseFloat(m[4]) : 0;
    var right = svg.viewBox.baseVal.width;
    var bottom = svg.viewBox.baseVal.height;
    Array.prototype.slice.call(treeContent.querySelectorAll("g.hitbox")).forEach(function(element){
      var rect = nodeBox({ el: element });
      if(!rect) return;
      var localRight = Number(rect.getAttribute("x")) + Number(rect.getAttribute("width"));
      var localBottom = Number(rect.getAttribute("y")) + Number(rect.getAttribute("height"));
      right = Math.max(right, localRight * scaleX + tx + 40);
      bottom = Math.max(bottom, localBottom * scaleY + ty + 40);
    });
    svg.setAttribute("viewBox", "0 0 " + Math.ceil(right) + " " + Math.ceil(bottom));
    svg.setAttribute("width", Math.ceil(right));
    svg.setAttribute("height", Math.ceil(bottom));
    if(window.refreshTreeZoom) window.refreshTreeZoom();
  }

  function bindPlus(plus, owner){
    if(!plus || !owner || plus.dataset.causeBound) return;
    plus.dataset.causeBound = "true";
    plus.setAttribute("role", "button");
    plus.setAttribute("tabindex", "0");
    plus.setAttribute("aria-label", "Add a cause under " + owner.title);
    plus.setAttribute("data-tip", "Add or link a cause under: " + owner.title);
    plus.addEventListener("click", function(event){
      event.preventDefault();
      event.stopPropagation();
      openEditor(owner.id);
    });
    plus.addEventListener("keydown", function(event){
      if(event.key === "Enter" || event.key === " "){
        event.preventDefault();
        openEditor(owner.id);
      }
    });
  }

  function bindExistingPlusControls(){
    Array.prototype.slice.call(svg.querySelectorAll("g.pl")).forEach(function(plus){
      var ownerElement = plus.previousElementSibling;
      var ownerId = ownerElement && ownerElement.dataset.nodeId;
      var owner = ownerId && nodes.get(ownerId);
      if(owner && (owner.level === 0 || owner.level < 14)) bindPlus(plus, owner);
      else plus.remove();
    });
  }

  function drawParentConnector(parent, child){
    var parentRect = nodeBox(parent);
    var childRect = nodeBox(child);
    if(!parentRect || !childRect) return;
    var x1 = Number(parentRect.getAttribute("x")) + Number(parentRect.getAttribute("width"));
    var y1 = Number(parentRect.getAttribute("y")) + Number(parentRect.getAttribute("height")) / 2;
    var x2 = Number(childRect.getAttribute("x"));
    var y2 = Number(childRect.getAttribute("y")) + Number(childRect.getAttribute("height")) / 2;
    var color = palette(child.level).stroke;
    var path = svgElement("path", {
      d: "M" + x1 + "," + y1 + " C" + (x1 + 13) + "," + y1 + " " + (x2 - 13) + "," + y2 + " " + x2 + "," + y2,
      fill: "none", stroke: color, "stroke-width": "1.6", "data-local-parent-link": "true"
    });
    treeContent.insertBefore(path, treeContent.firstChild);
    return path;
  }

  // The lane headers ("LEVEL 1", "LEVEL 2", ...) are static text baked
  // into the original diagram, one per column the client's own sheet
  // actually used -- the deepest being Level 11. Adding a cause deeper
  // than that is completely valid (the worksheet supports through Level
  // 14), but without a header the new column reads as broken: a card
  // with no label above it, in the middle of a diagram whose header row
  // visibly stops one column short. Create the missing header the first
  // time a cause actually reaches that level, using the same 256px
  // column spacing and colour-tier pattern as every other lane label.
  function ensureLaneHeader(level){
    var text = "LEVEL " + level;
    var laneTexts = Array.prototype.slice.call(treeContent.querySelectorAll("text.lane"));
    var alreadyExists = laneTexts.some(function(t){
      return t.textContent.trim() === text || t.textContent.trim() === text + " · ROOT";
    });
    if(alreadyExists) return;
    var x = 720 + (level - 1) * 256;
    var tier = level <= 3 ? "lane-t1" : level <= 6 ? "lane-t2" : level <= 9 ? "lane-t3" : "lane-t4";
    // "· ROOT" marks whichever column is the deepest reached anywhere in
    // the analysis right now -- that has to move to this new column
    // instead of staying stuck on whatever used to be deepest.
    laneTexts.forEach(function(t){
      if(/·\s*ROOT\s*$/.test(t.textContent)) t.textContent = t.textContent.replace(/\s*·\s*ROOT\s*$/, "");
    });
    var label = svgElement("text", { x: x, y: 12, "class": "lane " + tier });
    label.textContent = text + " · ROOT";
    treeContent.appendChild(label);
    var deepestKpi = document.getElementById("kpiDeepestLevel");
    if(deepestKpi) deepestKpi.textContent = String(level);
  }

  function renderLocalNode(item){
    var parent = nodes.get(item.parentId);
    if(!parent) return null;
    var level = parent.level + 1;
    if(level > 14) return null;
    var parentRect = nodeBox(parent);
    if(!parentRect) return null;
    item.level = level;
    if(level > 11) ensureLaneHeader(level);
    item.title = String(item.title || "").trim();
    var width = 230;
    var height = 72;
    var x = Number(parentRect.getAttribute("x")) + Number(parentRect.getAttribute("width")) + 26;
    var y = nextNodeY(parent, x, height);
    var colors = palette(level);
    var group = svgElement("g", {
      "class": "hitbox local-cause",
      "data-tip": "Level " + level + " cause: " + item.title + ". Added to this DFMEA."
    });
    group.appendChild(svgElement("rect", { x: x - 2, y: y - 2, width: width + 4, height: height + 4, rx: 10, fill: "#000", opacity: "0" }));
    group.appendChild(svgElement("rect", { x: x, y: y, width: width, height: height, rx: 12, fill: colors.fill, stroke: colors.stroke, "stroke-width": 1.3 }));
    group.appendChild(svgElement("rect", { x: x, y: y, width: 4, height: height, rx: 2, fill: colors.accent }));
    var tag = svgElement("text", { x: x + 12, y: y + 14, "class": "ttag", fill: colors.accent });
    tag.textContent = "CAUSE · L" + level;
    group.appendChild(tag);
    var title = svgElement("text", { x: x + 12, y: y + 30, "class": "ttl2" });
    wrapTitle(item.title, 34).forEach(function(line, index){
      var span = svgElement("tspan", { x: x + 12, dy: index === 0 ? 0 : 12 });
      span.textContent = line;
      title.appendChild(span);
    });
    group.appendChild(title);
    var subtitle = svgElement("text", { x: x + 12, y: y + height - 8, "class": "tsub" });
    subtitle.textContent = "Saved cause";
    group.appendChild(subtitle);
    group.classList.add("node-enter");
    treeContent.appendChild(group);
    item.el = group;
    record(item.id, group, level, item.parentId, item.title, true);
    item.connectorEl = drawParentConnector(parent, item);
    var plus = svgElement("g", { "class": "pl" });
    var cx = x + width;
    var cy = y + height / 2;
    plus.appendChild(svgElement("circle", { cx: cx, cy: cy, r: 8.5, fill: "#fff", stroke: colors.accent, "stroke-width": 1.3 }));
    plus.appendChild(svgElement("path", { d: "M" + (cx - 4) + "," + cy + " L" + (cx + 4) + "," + cy + " M" + cx + "," + (cy - 4) + " L" + cx + "," + (cy + 4), fill: "none", stroke: colors.accent, "stroke-width": 1.6, "stroke-linecap": "round" }));
    treeContent.appendChild(plus);
    item.plusEl = plus;
    bindPlus(plus, nodes.get(item.id));
    if(window.tightenNode) window.tightenNode(group);
    if(window.polishTreeNode) window.polishTreeNode(group);
    decorateNode(group);
    resizeDiagram();
    return nodes.get(item.id);
  }

  function drawLink(link){
    var source = nodes.get(link.from);
    var target = nodes.get(link.to);
    var sourceRect = nodeBox(source);
    var targetRect = nodeBox(target);
    if(!sourceRect || !targetRect) return;
    var x1 = Number(sourceRect.getAttribute("x")) + Number(sourceRect.getAttribute("width"));
    var y1 = Number(sourceRect.getAttribute("y")) + Number(sourceRect.getAttribute("height")) / 2;
    var x2 = Number(targetRect.getAttribute("x"));
    var y2 = Number(targetRect.getAttribute("y")) + Number(targetRect.getAttribute("height")) / 2;
    var path = svgElement("path", {
      d: "M" + x1 + "," + y1 + " C" + (x1 + 48) + "," + y1 + " " + (x2 - 48) + "," + y2 + " " + x2 + "," + y2,
      fill: "none", stroke: "#0F766E", "stroke-width": 2, "stroke-dasharray": "6 4",
      "data-local-cause-link": "true", "data-tip": "Related causes: " + source.title + " and " + target.title
    });
    treeContent.insertBefore(path, treeContent.firstChild);
    link.el = path;
  }

  // ---------------------------------------------------------------
  // Toast: small transient status message, shared by several features
  // below so none of them need a modal just to say "done".
  // ---------------------------------------------------------------
  var toastTimer = null;
  function showToast(message){
    var toast = document.getElementById("dfmeaToast");
    if(!toast){
      toast = document.createElement("div");
      toast.id = "dfmeaToast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toast.classList.remove("show"); }, 2600);
  }
  window.showToast = showToast;

  // ---------------------------------------------------------------
  // Parent/child lookup, used by hover-path highlighting, the
  // drag-to-reparent guard against creating a loop, and undo.
  // ---------------------------------------------------------------
  var childrenMap = new Map();
  function buildChildrenMap(){
    childrenMap = new Map();
    nodes.forEach(function(item){
      if(!item.parentId) return;
      if(!childrenMap.has(item.parentId)) childrenMap.set(item.parentId, []);
      childrenMap.get(item.parentId).push(item.id);
    });
  }
  function descendantsOf(id){
    var out = [];
    var queue = (childrenMap.get(id) || []).slice();
    while(queue.length){
      var current = queue.shift();
      out.push(current);
      (childrenMap.get(current) || []).forEach(function(childId){ queue.push(childId); });
    }
    return out;
  }
  function ancestorsOf(id){
    var out = [];
    var current = nodes.get(id);
    while(current && current.parentId){
      out.push(current.parentId);
      current = nodes.get(current.parentId);
    }
    return out;
  }

  // ---------------------------------------------------------------
  // Match every worksheet row to the tree node it ends on, so a click
  // in either place can find and highlight the other. New rows get
  // dataset.nodeId set directly when they're created (see
  // addWorksheetPath); this fills it in for the 26 rows that were
  // already in the page before any script ran.
  // ---------------------------------------------------------------
  function mapRowsToNodes(){
    Array.prototype.slice.call(tableBody.querySelectorAll("tr")).forEach(function(row){
      if(row.dataset.nodeId) return;
      // Rows in the page already say which cause node they end on (the same cause text can
      // repeat under different functions, so matching by text alone is not enough).
      if(row.dataset.cause){
        row.dataset.nodeId = "source-cause-" + String(row.dataset.cause).padStart(3, "0");
        return;
      }
      var chain = [];
      for(var col = 7; col <= 20; col++){
        var text = row.cells[col] ? row.cells[col].textContent.trim() : "";
        if(text) chain.push(text);
      }
      if(!chain.length) return;
      var match = Array.from(nodes.values()).find(function(item){
        if(item.level !== chain.length) return false;
        var path = causePath(item.id).map(function(n){ return n.title; });
        return path.length === chain.length && path.every(function(title, index){ return title === chain[index]; });
      });
      if(match) row.dataset.nodeId = match.id;
    });
  }

  // ---------------------------------------------------------------
  // Risk colour: the accent bar already encodes cause LEVEL (via the
  // palette); this adds a second, independent signal -- RPN band --
  // without touching that. Only leaf causes that own a worksheet row
  // have an RPN, so only they get tinted; branch nodes keep their
  // plain level colour, which is correct (they are not a risk figure
  // on their own).
  // ---------------------------------------------------------------
  function riskTier(rpn){
    if(rpn >= 100) return "risk-high";
    if(rpn >= 40) return "risk-med";
    return "risk-low";
  }
  function rpnCellValue(cell){
    // RPN cells append a "9 x 1 x 5" footnote via a nested .dep div with
    // no separating whitespace in textContent (e.g. "459 x 1 x 5"), which
    // would make a naive parseInt read "459" instead of "45".
    if(!cell) return 0;
    var dep = cell.querySelector(".dep");
    var text = dep ? cell.textContent.slice(0, cell.textContent.length - dep.textContent.length) : cell.textContent;
    return parseInt(text, 10) || 0;
  }
  function applyRiskColorForRow(row){
    var nodeId = row.dataset.nodeId;
    if(!nodeId) return;
    var item = nodes.get(nodeId);
    if(!item || !item.el) return;
    var maxRpn = (window.dfmeaVariants || []).reduce(function(max, variant){
      return Math.max(max, rpnCellValue(row.cells[variant.rpnCol]));
    }, 0);
    item.el.classList.remove("risk-high", "risk-med", "risk-low");
    // A path nobody has rated has no RPN, so it gets no risk colour.
    if(maxRpn > 0) item.el.classList.add(riskTier(maxRpn));
  }
  function applyAllRiskColors(){
    Array.prototype.slice.call(tableBody.querySelectorAll("tr")).forEach(applyRiskColorForRow);
  }

  // ---------------------------------------------------------------
  // Hover a node -> dim everything except its ancestors and
  // descendants, so one chain is easy to trace in a busy diagram.
  // Click a node -> jump to and flash its row (or the first of the
  // rows it participates in, if it is a branch point). Click a row ->
  // open the tree (if needed) and flash its node.
  // ---------------------------------------------------------------
  function highlightPath(id){
    var keep = new Set([id].concat(ancestorsOf(id), descendantsOf(id)));
    Array.prototype.slice.call(svg.querySelectorAll(".hitbox")).forEach(function(g){
      g.classList.toggle("dim", !!g.dataset.nodeId && !keep.has(g.dataset.nodeId));
    });
    Array.prototype.slice.call(svg.querySelectorAll("#treeContent > path")).forEach(function(p){
      p.classList.add("dim");
    });
  }
  function clearPathHighlight(){
    Array.prototype.slice.call(svg.querySelectorAll(".dim")).forEach(function(el){ el.classList.remove("dim"); });
  }
  function flashRow(row){
    if(!row) return;
    row.scrollIntoView({ block: "center", behavior: "smooth" });
    row.classList.add("row-flash");
    setTimeout(function(){ row.classList.remove("row-flash"); }, 1650);
  }
  function flashNode(nodeId){
    var item = nodes.get(nodeId);
    if(!item || !item.el) return;
    var wrap = document.getElementById("treeWrap");
    var goNow = function(){
      var rect = nodeBox(item);
      if(rect && wrap){
        var z = Number(wrap.style.getPropertyValue("--z")) || 1;
        var cx = (Number(rect.getAttribute("x")) + Number(rect.getAttribute("width")) / 2) * z;
        var cy = (Number(rect.getAttribute("y")) + Number(rect.getAttribute("height")) / 2) * z;
        wrap.scrollLeft = Math.max(0, cx - wrap.clientWidth / 2);
        wrap.scrollTop = Math.max(0, cy - wrap.clientHeight / 2);
      }
      item.el.classList.add("node-flash");
      setTimeout(function(){ item.el.classList.remove("node-flash"); }, 1650);
      // Jumping here from a table row (via the row itself or its Locate
      // button) is a deliberate "take me to this exact cause" action,
      // not a passing hover -- so it deserves the same dim-everything-
      // else path highlight AND the same "current flowing" wire glow
      // that hovering/clicking a node in the diagram already gets.
      highlightPath(nodeId);
      glowChainTo(nodeId);
    };
    if(wrap && !wrap.classList.contains("open")){
      var overlay = document.getElementById("treeOverlay");
      if(overlay) overlay.click();
      setTimeout(goNow, 260);
    } else goNow();
  }
  function rowsForNode(nodeId){
    var candidates = new Set([nodeId].concat(descendantsOf(nodeId)));
    return Array.prototype.slice.call(tableBody.querySelectorAll("tr")).filter(function(row){
      return candidates.has(row.dataset.nodeId);
    });
  }

  // ---------------------------------------------------------------
  // Wire glow: clicking a cause lights up the chain of connectors
  // from the failure mode down to it, like current travelling a
  // circuit. Static connector paths carry no parent/child id of their
  // own (they're positioned purely by coordinates), so the path for a
  // given child is found by matching its curve's end point to that
  // child's own box -- the same point drawParentConnector always ends
  // on. Local causes already keep a direct reference (connectorEl).
  function connectorPathTo(item){
    if(item.connectorEl) return item.connectorEl;
    var rect = nodeBox(item);
    if(!rect) return null;
    var x2 = Number(rect.getAttribute("x"));
    var y2 = Number(rect.getAttribute("y")) + Number(rect.getAttribute("height")) / 2;
    var paths = Array.prototype.slice.call(treeContent.querySelectorAll("path"));
    return paths.find(function(p){
      var d = p.getAttribute("data-orig-d") || p.getAttribute("d") || "";
      var match = /[ ,](-?[\d.]+),(-?[\d.]+)\s*$/.exec(d.trim());
      if(!match) return false;
      return Math.abs(Number(match[1]) - x2) < 1.5 && Math.abs(Number(match[2]) - y2) < 1.5;
    }) || null;
  }
  function chainPathsTo(nodeId){
    var chain = causePath(nodeId);
    var full = [chain.length ? nodes.get(chain[0].parentId) : null].concat(chain).filter(Boolean);
    var glowPaths = [];
    for(var i = 1; i < full.length; i++){
      var p = connectorPathTo(full[i]);
      if(p) glowPaths.push(p);
    }
    return glowPaths;
  }
  // One-shot pulse (click): glows once then fades.
  function glowChainTo(nodeId){
    var glowPaths = chainPathsTo(nodeId);
    glowPaths.forEach(function(p, index){
      p.classList.remove("wire-glow");
      void p.offsetWidth;
      p.style.animationDelay = (index * 90) + "ms";
      p.classList.add("wire-glow");
    });
    setTimeout(function(){
      glowPaths.forEach(function(p){ p.classList.remove("wire-glow"); p.style.animationDelay = ""; });
    }, 950 + glowPaths.length * 90);
  }
  // Persistent "current flowing" glow while hovering, cleared on mouseout.
  var hoverGlowPaths = [];
  function glowChainHoverStart(nodeId){
    hoverGlowPaths = chainPathsTo(nodeId);
    hoverGlowPaths.forEach(function(p, index){
      p.style.animationDelay = (index * 70) + "ms";
      p.classList.add("wire-glow-hover");
    });
  }
  function glowChainHoverStop(){
    hoverGlowPaths.forEach(function(p){ p.classList.remove("wire-glow-hover"); p.style.animationDelay = ""; });
    hoverGlowPaths = [];
  }

  svg.addEventListener("mouseover", function(event){
    var g = event.target.closest && event.target.closest(".hitbox");
    if(g && g.dataset.nodeId){ highlightPath(g.dataset.nodeId); glowChainHoverStart(g.dataset.nodeId); }
  });
  svg.addEventListener("mouseout", function(event){
    var g = event.target.closest && event.target.closest(".hitbox");
    if(g){ clearPathHighlight(); glowChainHoverStop(); }
  });
  svg.addEventListener("click", function(event){
    if(event.target.closest(".pl") || event.target.closest(".flagbtn")) return;
    var g = event.target.closest && event.target.closest(".hitbox");
    if(!g || !g.dataset.nodeId || dragJustEnded) return;
    glowChainTo(g.dataset.nodeId);
    var rows = rowsForNode(g.dataset.nodeId);
    if(rows.length) flashRow(rows[0]);
  });
  tableBody.addEventListener("click", function(event){
    var row = event.target.closest && event.target.closest("tr");
    if(!row || !row.dataset.nodeId) return;
    // The Locate button still jumps to the diagram; clicking anywhere
    // else on the row opens this cause for editing instead.
    if(event.target.closest(".locate-btn")){ flashNode(row.dataset.nodeId); return; }
    openEditCauseDialog(row);
  });

  // ---------------------------------------------------------------
  // The edit button on a cause renames it in place. Restricted to
  // real causes (level >= 1): the failure mode / function nodes feed
  // several other parts of the page (KPIs, breadcrumb) that a plain
  // text-rename here would silently fall out of sync with.
  // ---------------------------------------------------------------
  function startInlineEdit(g){
    var nodeId = g.dataset.nodeId;
    var item = nodes.get(nodeId);
    var titleEl = g.querySelector(".ttl2");
    if(!item || item.level < 1 || !titleEl) return;
    var rect = titleEl.getBoundingClientRect();
    var input = document.createElement("input");
    input.type = "text";
    input.value = item.title;
    input.className = "inline-edit-input";
    input.style.left = rect.left + "px";
    input.style.top = (rect.top - 3) + "px";
    input.style.width = Math.max(160, rect.width + 50) + "px";
    document.body.appendChild(input);
    input.focus();
    input.select();
    var done = false;
    function commit(){
      if(done) return;
      done = true;
      var newTitle = input.value.trim();
      input.remove();
      if(newTitle && newTitle !== item.title) renameNode(item, newTitle);
    }
    input.addEventListener("keydown", function(event){
      if(event.key === "Enter"){ event.preventDefault(); commit(); }
      else if(event.key === "Escape"){ done = true; input.remove(); }
    });
    input.addEventListener("blur", commit);
  }
  function renameNode(item, newTitle){
    var oldTitle = item.title;
    item.title = newTitle;
    var titleEl = item.el.querySelector(".ttl2");
    var x = Number(titleEl.getAttribute("x"));
    titleEl.innerHTML = "";
    wrapTitle(newTitle, 34).forEach(function(line, index){
      var span = svgElement("tspan", { x: x, dy: index === 0 ? 0 : 11 });
      span.textContent = line;
      titleEl.appendChild(span);
    });
    delete item.el.dataset.tightened;
    if(window.tightenNode) window.tightenNode(item.el);
    var level = item.level;
    Array.prototype.slice.call(tableBody.querySelectorAll("tr")).forEach(function(row){
      var cell = row.cells[7 + level - 1];
      if(cell && cell.textContent.trim() === oldTitle) cell.textContent = newTitle;
    });
    if(item.isLocal){
      var stored = localNodes.find(function(n){ return n.id === item.id; });
      if(stored) stored.title = newTitle;
      persistState();
    }
    refreshPageData();
    showToast("Cause renamed.");
  }
  svg.addEventListener("editnode", function(event){
    var g = event.target.closest && event.target.closest(".hitbox");
    if(g && g.dataset.nodeId) startInlineEdit(g);
  });

  // ---------------------------------------------------------------
  // Flag a cause for review, with an optional short note. Stored
  // alongside the local edits so it survives a reload.
  // ---------------------------------------------------------------
  var flags = localState.flags || {};
  function saveFlags(){ localState.flags = flags; persistState(); }
  function addFlagButton(g){
    if(g.querySelector(".flagbtn")) return;
    var body = g.querySelector("rect:nth-of-type(2)");
    if(!body) return;
    var fx = Number(body.getAttribute("x")) + Number(body.getAttribute("width")) - 15;
    var fy = Number(body.getAttribute("y")) + 11;
    var btn = svgElement("g", { "class": "flagbtn" });
    var circle = svgElement("circle", { cx: fx, cy: fy, r: 7, fill: "#fff", stroke: "#CBD5E1", "stroke-width": 1.2 });
    var flag = svgElement("path", {
      d: "M" + (fx - 2.5) + "," + (fy - 3.5) + " v7 M" + (fx - 2.5) + "," + (fy - 3.5) + " h4 l-1.1,1.6 l1.1,1.6 h-4",
      fill: "none", stroke: "#94A3B8", "stroke-width": 1.3, "stroke-linecap": "round", "stroke-linejoin": "round"
    });
    btn.appendChild(circle);
    btn.appendChild(flag);
    g.appendChild(btn);
    var nodeId = g.dataset.nodeId;
    function refresh(){
      var flagged = !!flags[nodeId];
      circle.setAttribute("fill", flagged ? "#FEE2E2" : "#fff");
      circle.setAttribute("stroke", flagged ? "#EF4444" : "#CBD5E1");
      flag.setAttribute("stroke", flagged ? "#DC2626" : "#94A3B8");
      btn.setAttribute("data-tip", flagged ? ("Flagged for review: " + flags[nodeId]) : "Flag this cause for review");
    }
    refresh();
    btn.addEventListener("click", function(event){
      event.preventDefault();
      event.stopPropagation();
      if(flags[nodeId]){
        if(window.confirm("Remove the review flag on this cause?")) delete flags[nodeId];
      }else{
        var note = window.prompt("Add a short note for this flag (optional):", "");
        if(note !== null) flags[nodeId] = note || "Needs review";
      }
      saveFlags();
      refresh();
    });
  }

  // ---------------------------------------------------------------
  // Drag to re-parent: only causes added through this app can be
  // dragged (moving one of the original 64 would mean rewriting the
  // whole pre-generated layout), and only onto a node that is not
  // its own descendant. A dragged cause with sub-causes of its own is
  // blocked rather than silently breaking their positions.
  // ---------------------------------------------------------------
  var dragJustEnded = false;
  function makeDraggable(g){
    var item = nodes.get(g.dataset.nodeId);
    if(!item || !item.isLocal || g.dataset.dragBound) return;
    g.dataset.dragBound = "true";
    g.classList.add("draggable");
    var dragging = false, moved = false, startX = 0, startY = 0;
    g.addEventListener("pointerdown", function(event){
      if(event.target.closest(".pl") || event.target.closest(".flagbtn")) return;
      if((childrenMap.get(item.id) || []).length){ showToast("Only a cause without its own sub-causes can be moved."); return; }
      dragging = true; moved = false;
      startX = event.clientX; startY = event.clientY;
      g.classList.add("dragging");
      try{ g.setPointerCapture(event.pointerId); }catch(error){}
    });
    g.addEventListener("pointermove", function(event){
      if(!dragging) return;
      if(Math.abs(event.clientX - startX) > 5 || Math.abs(event.clientY - startY) > 5) moved = true;
      var el = document.elementFromPoint(event.clientX, event.clientY);
      var target = el && el.closest && el.closest(".hitbox");
      Array.prototype.slice.call(svg.querySelectorAll(".drop-target")).forEach(function(n){ n.classList.remove("drop-target"); });
      if(target && target !== g && target.dataset.nodeId){
        var targetItem = nodes.get(target.dataset.nodeId);
        var wouldLoop = targetItem && ancestorsOf(targetItem.id).indexOf(item.id) > -1;
        if(targetItem && !wouldLoop && targetItem.level < 14) target.classList.add("drop-target");
      }
    });
    g.addEventListener("pointerup", function(event){
      if(!dragging) return;
      dragging = false;
      g.classList.remove("dragging");
      var el = document.elementFromPoint(event.clientX, event.clientY);
      var target = el && el.closest && el.closest(".hitbox");
      Array.prototype.slice.call(svg.querySelectorAll(".drop-target")).forEach(function(n){ n.classList.remove("drop-target"); });
      if(moved && target && target !== g && target.dataset.nodeId){
        var targetItem = nodes.get(target.dataset.nodeId);
        var wouldLoop = targetItem && ancestorsOf(targetItem.id).indexOf(item.id) > -1;
        if(targetItem && !wouldLoop && targetItem.level < 14) reparentNode(item, targetItem.id);
        dragJustEnded = true;
        setTimeout(function(){ dragJustEnded = false; }, 80);
      }
    });
  }
  function reparentNode(item, newParentId){
    if(item.connectorEl) item.connectorEl.remove();
    if(item.plusEl) item.plusEl.remove();
    if(item.el) item.el.remove();
    Array.prototype.slice.call(tableBody.querySelectorAll('tr[data-node-id="' + item.id + '"]')).forEach(function(row){ row.remove(); });
    item.parentId = newParentId;
    var stored = localNodes.find(function(n){ return n.id === item.id; });
    if(stored) stored.parentId = newParentId;
    var rendered = renderLocalNode(item);
    if(!rendered){ showToast("This cause could not be moved there."); return; }
    addWorksheetPath(item.id, item.ratings);
    buildChildrenMap();
    persistState();
    refreshPageData();
    showToast("Cause moved to its new parent.");
  }

  // Every per-node runtime enhancement (risk colour excluded -- that
  // is driven by the worksheet row, applied separately) in one place,
  // so both the initial pass and freshly rendered local nodes get the
  // exact same treatment.
  function decorateNode(g){
    addFlagButton(g);
    makeDraggable(g);
  }

  // ---------------------------------------------------------------
  // One-step undo/redo for the last add/link action. Deliberately a
  // single slot, not a full history stack: this is meant as quick
  // mistake-insurance for the action you just took, not a project-wide
  // version history.
  // ---------------------------------------------------------------
  var lastAction = null;
  var undoBtn = document.getElementById("treeUndoBtn");
  function updateUndoButton(){
    if(!undoBtn) return;
    if(!lastAction){ undoBtn.disabled = true; undoBtn.lastChild.textContent = " Undo"; return; }
    undoBtn.disabled = false;
    undoBtn.lastChild.textContent = " " + (lastAction.state === "done" ? ("Undo " + lastAction.label) : ("Redo " + lastAction.label));
  }
  function pushHistory(entry){
    entry.state = "done";
    lastAction = entry;
    updateUndoButton();
  }
  function toggleUndo(){
    if(!lastAction) return;
    if(lastAction.state === "done"){ lastAction.undo(); lastAction.state = "undone"; }
    else { lastAction.redo(); lastAction.state = "done"; }
    updateUndoButton();
  }
  if(undoBtn) undoBtn.addEventListener("click", toggleUndo);
  document.addEventListener("keydown", function(event){
    if((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z"){
      if(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
      event.preventDefault();
      toggleUndo();
    }
  });

  // ---------------------------------------------------------------
  // Compare-to-snapshot: save the current set of added causes, then
  // toggle a highlight on whatever was added since. A lightweight
  // stand-in for a full two-pane before/after view -- it lives only
  // for this session (not persisted), which matches its purpose as a
  // working aid while making a batch of changes, not a permanent record.
  // ---------------------------------------------------------------
  var compareSnapshot = null;
  var snapshotBtns = [document.getElementById("treeSnapshotBtn"), document.getElementById("treeSnapshotBtn2")].filter(Boolean);
  var compareBtns = [document.getElementById("treeCompareBtn"), document.getElementById("treeCompareBtn2")].filter(Boolean);
  snapshotBtns.forEach(function(btn){
    btn.addEventListener("click", function(){
      compareSnapshot = new Set(localNodes.map(function(n){ return n.id; }));
      compareBtns.forEach(function(b){ b.disabled = false; });
      showToast("Snapshot saved (" + compareSnapshot.size + " added causes so far). Use Compare to see what changes next.");
    });
  });
  compareBtns.forEach(function(btn){
    btn.addEventListener("click", function(){
      if(!compareSnapshot) return;
      var active = btn.classList.toggle("active");
      compareBtns.forEach(function(b){ if(b !== btn) b.classList.toggle("active", active); });
      svg.classList.toggle("compare-active", active);
      Array.prototype.slice.call(svg.querySelectorAll(".hitbox")).forEach(function(g){
        var id = g.dataset.nodeId;
        var item = id && nodes.get(id);
        var isNew = item && item.isLocal && !compareSnapshot.has(id);
        // Force the blink animation to restart every time Compare is
        // turned on, even for a node that was already marked "new" from
        // a previous toggle -- removing the class first (and letting the
        // browser register that removal before re-adding it) is what
        // makes a re-triggered CSS animation actually replay instead of
        // silently no-op because the class never technically changed.
        g.classList.remove("compare-new");
        if(active && isNew) void g.offsetWidth, g.classList.add("compare-new");
      });
      // The highlighted diff lives on the same diagram shown in the
      // full-screen modal -- if Compare is turned on from the closed
      // preview, the highlight is invisible unless the modal is opened
      // too, so open it automatically instead of leaving the user
      // looking at an unchanged small preview.
      if(active && window.openTreeModal && window.isTreeModalOpen && !window.isTreeModalOpen()){
        window.openTreeModal();
      }
      showToast(active ? "Showing causes added since your last snapshot." : "Compare view off.");
    });
  });

  // ---------------------------------------------------------------
  // Mini-map: a small live thumbnail of the whole diagram with a
  // viewport rectangle, shown only while the full-screen modal is
  // open (the compact preview is already small enough not to need
  // one). Rebuilt whenever the tree changes so newly added causes
  // show up in it too.
  // ---------------------------------------------------------------
  var minimapHost = null, minimapSvg = null, minimapViewport = null;
  function buildMinimap(){
    var wrap = document.getElementById("treeWrap");
    if(!wrap) return;
    if(!minimapHost){
      minimapHost = document.createElement("div");
      minimapHost.className = "minimap";
      minimapViewport = document.createElement("div");
      minimapViewport.className = "minimap-viewport";
      wrap.appendChild(minimapHost);
      // the viewport rectangle must be positioned relative to the small
      // minimap thumbnail itself, not the whole modal -- nesting it as a
      // sibling of minimapHost made its position:absolute resolve against
      // the modal instead, which is what stretched it into a huge box
      // covering the real diagram instead of a small rectangle inside
      // the corner thumbnail.
      minimapHost.appendChild(minimapViewport);
      minimapHost.addEventListener("click", function(event){
        var box = minimapSvg.getBoundingClientRect();
        var relX = (event.clientX - box.left) / box.width;
        var relY = (event.clientY - box.top) / box.height;
        var vb = svg.viewBox.baseVal;
        var z = Number(wrap.style.getPropertyValue("--z")) || 1;
        wrap.scrollLeft = Math.max(0, relX * vb.width * z - wrap.clientWidth / 2);
        wrap.scrollTop = Math.max(0, relY * vb.height * z - wrap.clientHeight / 2);
      });
      wrap.addEventListener("scroll", updateMinimapViewport);
      window.addEventListener("resize", updateMinimapViewport);
    }
    if(minimapSvg) minimapSvg.remove();
    minimapSvg = svg.cloneNode(true);
    minimapSvg.removeAttribute("width");
    minimapSvg.removeAttribute("height");
    Array.prototype.slice.call(minimapSvg.querySelectorAll(".pl, .flagbtn, .tag-pill")).forEach(function(el){ el.remove(); });
    // Cloning the whole SVG also clones its <defs> (marker/filter ids)
    // and the #treeContent group id, duplicating them document-wide --
    // harmless by luck (browsers just use the first match) but not
    // technically valid, and fragile if anything ever looks these up by
    // id. The minimap is decorative and needs none of this: the filter
    // url(#nodeShadow) references still resolve fine against the real
    // SVG's defs, since SVG id references search the whole document,
    // not just the local subtree.
    var clonedDefs = minimapSvg.querySelector("defs");
    if(clonedDefs) clonedDefs.remove();
    var clonedContent = minimapSvg.querySelector("#treeContent");
    if(clonedContent) clonedContent.removeAttribute("id");
    minimapHost.appendChild(minimapSvg);
    updateMinimapViewport();
  }
  function updateMinimapViewport(){
    var wrap = document.getElementById("treeWrap");
    if(!wrap || !minimapSvg || !wrap.classList.contains("open")) return;
    var vb = svg.viewBox.baseVal;
    var box = minimapSvg.getBoundingClientRect();
    if(!box.width || !box.height) return;
    var scaleX = box.width / vb.width, scaleY = box.height / vb.height;
    var z = Number(wrap.style.getPropertyValue("--z")) || 1;
    var hostBox = minimapHost.getBoundingClientRect();
    minimapViewport.style.left = ((wrap.scrollLeft / z) * scaleX) + "px";
    minimapViewport.style.top = ((wrap.scrollTop / z) * scaleY) + "px";
    minimapViewport.style.width = Math.min(hostBox.width, (wrap.clientWidth / z) * scaleX) + "px";
    minimapViewport.style.height = Math.min(hostBox.height, (wrap.clientHeight / z) * scaleY) + "px";
  }
  window.updateMinimapViewport = updateMinimapViewport;
  window.addEventListener("treeModalOpened", function(){ buildMinimap(); });

  function causePath(nodeId){
    var chain = [];
    var current = nodes.get(nodeId);
    while(current && current.level > 0){
      chain.unshift(current);
      current = nodes.get(current.parentId);
    }
    return chain;
  }

  function failureIndexFor(nodeId){
    var current = nodes.get(nodeId);
    while(current){
      if(current.level === 0) return current.fm || 1;
      current = nodes.get(current.parentId);
    }
    return 1;
  }

  function addWorksheetPath(nodeId, ratings){
    var chain = causePath(nodeId);
    if(!chain.length || chain.length > 14) return;
    var staticPrefix = chain.filter(function(item){ return !item.isLocal; }).map(function(item){ return item.title; });
    var currentRows = Array.prototype.slice.call(tableBody.querySelectorAll("tr"));
    // The new row belongs to the same function as the failure mode its cause hangs off.
    var fmIndex = failureIndexFor(nodeId);
    var sameFunction = currentRows.filter(function(row){ return Number(row.dataset.fm) === fmIndex; });
    var base = sameFunction.find(function(row){
      return staticPrefix.every(function(title, index){ return row.cells[7 + index] && row.cells[7 + index].textContent.trim() === title; });
    }) || sameFunction[0] || currentRows[0];
    if(!base) return;
    var row = base.cloneNode(true);
    delete row.dataset.cause;
    row.classList.remove("sel", "hide", "pg-hide", "row-flash", "row-enter");
    row.classList.add("row-enter");
    row.dataset.nodeId = nodeId;
    row.cells[0].textContent = String(currentRows.length + 1);
    for(var column = 7; column <= 20; column++) row.cells[column].textContent = "";
    chain.forEach(function(item, index){ row.cells[7 + index].textContent = item.title; });
    [21, 22, 23, 24].forEach(function(index){ row.cells[index].textContent = ""; });
    // Occurrence/Detection are specific to THIS cause, not inherited from
    // whichever row happened to get cloned as a template; the cloned row's
    // values would otherwise silently stick around and misreport risk for
    // a cause nobody actually rated. Recompute RPN from the values the user
    // entered (or, for a linked cause with no rating dialog, fall back to
    // whatever the cloned row already had, which is still an existing
    // real rating rather than an invented one). Driven by window.dfmeaVariants
    // so a variant added after this row exists still gets a correct cell.
    var severity = Number(row.cells[6].textContent.trim()) || 0;
    (window.dfmeaVariants || []).forEach(function(variant){
      if(row.cells[variant.ctrlCol]) row.cells[variant.ctrlCol].textContent = "";
      if(!ratings || !ratings[variant.name]) return;
      var r = ratings[variant.name];
      row.cells[variant.occCol].textContent = String(r.occ);
      row.cells[variant.detCol].textContent = String(r.det);
      row.cells[variant.rpnCol].innerHTML = String(severity * r.occ * r.det) +
        '<div class="dep">' + severity + ' &times; ' + r.occ + ' &times; ' + r.det + '</div>';
    });
    row.dataset.tbd = chain.some(function(item){ return item.title.toUpperCase() === "TBD"; }) ? "1" : "0";
    row.dataset.depth = String(chain.length);
    row.dataset.search = chain.map(function(item){ return item.title; }).join(" ").toLowerCase();
    tableBody.appendChild(row);
    applyRiskColorForRow(row);
  }

  function persistState(){
    localState.nodes = localNodes.map(function(item){ return { id: item.id, parentId: item.parentId, title: item.title, ratings: item.ratings, category: item.category || null }; });
    localState.links = localLinks.map(function(link){ return { id: link.id, from: link.from, to: link.to }; });
    try{
      window.localStorage.setItem(storageKey, JSON.stringify(localState));
      canStore = true;
      var saved = document.querySelector(".saved");
      if(saved) saved.textContent = "All changes saved";
    }catch(error){
      canStore = false;
      var status = document.getElementById("causeEditorStatus");
      if(status) status.textContent = "This edit could not be saved. Please try again.";
    }
  }

  function refreshPageData(){
    if(window.refreshDfmeaMetrics) window.refreshDfmeaMetrics();
    if(window.refreshDfmeaWorksheet) window.refreshDfmeaWorksheet();
    if(window.refreshTreeZoom) window.refreshTreeZoom();
  }

  function isDescendant(nodeId, ancestorId){
    var current=nodes.get(nodeId);
    while(current && current.parentId){
      if(current.parentId===ancestorId) return true;
      current=nodes.get(current.parentId);
    }
    return false;
  }

  function fillLinkTargets(parentId, mode){
    var select = document.getElementById("causeLinkTarget");
    select.innerHTML = '<option value="">Choose a cause…</option>';
    var excluded = new Set([parentId]);
    var parent = nodes.get(parentId);
    while(parent && parent.parentId){ excluded.add(parent.parentId); parent = nodes.get(parent.parentId); }
    Array.from(nodes.values()).filter(function(item){
      return item.level > 0 && !excluded.has(item.id) && !(mode === "link" && isDescendant(item.id,parentId));
    })
      .sort(function(a,b){ return a.level - b.level || a.title.localeCompare(b.title); })
      .forEach(function(item){
        var option = document.createElement("option");
        option.value = item.id;
        option.textContent = "L" + item.level + " · " + item.title;
        select.appendChild(option);
      });
  }

  function updateEditorMode(){
    if(editingItem){
      // Editing only ever touches description/TBD/ratings -- the mode
      // picker, parent picker and link field stay hidden regardless of
      // what they were last set to from a previous add-cause use.
      var isTbdEdit = tbdCheckbox.checked;
      descriptionInput.disabled = isTbdEdit;
      descriptionInput.placeholder = isTbdEdit ? "TBD, no description needed" : "Describe the cause";
      if(isTbdEdit) descriptionInput.value = "";
      descriptionInput.required = !isTbdEdit;
      document.getElementById("causeEditorForm").querySelector('[type="submit"]').disabled = false;
      return;
    }
    var parent = nodes.get(dialogParentId);
    var mode = actionSelect.value;
    var targetSelect = document.getElementById("causeLinkTarget");
    if(dialogParentId) fillLinkTargets(dialogParentId,"link");
    var hasLinkTargets = targetSelect.options.length > 1;
    actionSelect.querySelector('option[value="link"]').disabled = !hasLinkTargets;
    actionSelect.querySelector('option[value="both"]').disabled = !hasLinkTargets || (parent && parent.level >= 14);
    if(mode !== "add" && !hasLinkTargets){
      actionSelect.value = "add";
      mode = "add";
    }
    if(dialogParentId) fillLinkTargets(dialogParentId,mode);
    var isTbd = tbdCheckbox.checked;
    descriptionField.hidden = mode === "link";
    linkField.hidden = mode === "add";
    ratingField.hidden = mode === "link";
    if(categoryField) categoryField.hidden = mode === "link";
    descriptionInput.disabled = isTbd;
    descriptionInput.placeholder = isTbd ? "TBD, no description needed" : "Describe the cause";
    if(isTbd) descriptionInput.value = "";
    descriptionInput.required = mode !== "link" && !isTbd;
    variantInputs.forEach(function(v){ v.occInput.required = mode !== "link"; v.detInput.required = mode !== "link"; });
    targetSelect.required = mode !== "add";
    document.getElementById("causeEditorForm").querySelector('[type="submit"]').disabled = !hasLinkTargets && mode !== "add";
    var status = document.getElementById("causeEditorStatus");
    if(status){
      status.textContent = !hasLinkTargets
        ? "No related cause outside this branch is available to link. Add a cause here or choose another branch."
        : canStore ? "All changes are saved automatically." : "Changes could not be saved automatically. Please try again.";
    }
    var childLevel = parent ? parent.level + 1 : 1;
    levelNote.hidden = mode === "link";
    levelNote.textContent = childLevel <= 14 ? "New cause will be added at Level " + childLevel + "." : "The worksheet supports through Level 14; link an existing cause instead.";
    if(actionSelect.refreshCustomSelect) actionSelect.refreshCustomSelect();
    if(targetSelect.refreshCustomSelect) targetSelect.refreshCustomSelect();
  }

  function fillParentPicker(selectedId){
    parentSelect.innerHTML = "";
    Array.from(nodes.values())
      .filter(function(item){ return item.level < 14; })
      .sort(function(a,b){ return a.level - b.level || a.title.localeCompare(b.title); })
      .forEach(function(item){
        var option = document.createElement("option");
        option.value = item.id;
        option.textContent = item.level ? "L" + item.level + " · " + item.title : "Failure mode · " + item.title;
        if(item.id === selectedId) option.selected = true;
        parentSelect.appendChild(option);
      });
    if(parentSelect.refreshCustomSelect) parentSelect.refreshCustomSelect();
  }

  function setParent(parentId){
    var parent = nodes.get(parentId);
    if(!parent) return;
    dialogParentId = parentId;
    document.getElementById("causeEditorParent").textContent = parent.level
      ? "Under Level " + parent.level + ": " + parent.title
      : "Under failure mode: " + parent.title;
    actionSelect.value = parent.level >= 14 ? "link" : "add";
    updateEditorMode();
  }

  function openEditor(parentId, pickParent){
    var parent = nodes.get(parentId);
    if(!parent) return;
    parentField.hidden = !pickParent;
    fillParentPicker(parentId);
    document.getElementById("causeEditorStatus").textContent = canStore
      ? "All changes are saved automatically."
      : "Changes could not be saved automatically. Please try again.";
    descriptionInput.value = "";
    tbdCheckbox.checked = false;
    setCategoryToggle("none");
    // Severity belongs to the failure mode/effect, not the cause, so every
    // path for this function carries the same value; read it straight off
    // the worksheet rather than hard-coding it, so it can never drift out
    // of sync with the actual data. Occurrence/Detection are genuinely
    // cause-specific, so they default to the worksheet's first row purely
    // as a sane starting point, not as an assumed value: the user must
    // confirm or change them for the cause they are actually describing.
    buildRateCards();
    var firstRow = tableBody.querySelector("tr");
    severityInput.value = firstRow ? (Number(firstRow.cells[6].textContent.trim()) || FIXED_SEVERITY) : FIXED_SEVERITY;
    variantInputs.forEach(function(v){
      v.occInput.value = firstRow ? (Number(firstRow.cells[v.variant.occCol].textContent.trim()) || 1) : 1;
      v.detInput.value = firstRow ? (Number(firstRow.cells[v.variant.detCol].textContent.trim()) || 1) : 1;
    });
    updateRpnPreview();
    setParent(parentId);
    dialog.showModal();
    if(actionSelect.value !== "link") descriptionInput.focus();
  }

  // ---------------------------------------------------------------
  // Editing an existing cause reuses the same dialog as adding one,
  // but scoped down to just what makes sense for a cause that already
  // exists: description, TBD and this row's own ratings -- no parent
  // picker, no action mode, no linking (those only make sense when
  // creating something new).
  // ---------------------------------------------------------------
  var actionField = actionSelect.closest(".ce-field");
  function openEditCauseDialog(row){
    var nodeId = row && row.dataset.nodeId;
    var item = nodeId && nodes.get(nodeId);
    if(!item || item.level < 1) return;
    editingItem = item;
    editingRow = row;
    dialogParentId = item.parentId;
    parentField.hidden = true;
    if(actionField) actionField.hidden = true;
    linkField.hidden = true;
    levelNote.hidden = true;
    document.getElementById("causeEditorTitle").textContent = "Edit cause";
    document.getElementById("causeEditorParent").textContent = "Level " + item.level + " cause";
    document.getElementById("causeEditorStatus").textContent = canStore
      ? "All changes are saved automatically."
      : "Changes could not be saved automatically. Please try again.";
    var isTbd = item.title.toUpperCase() === "TBD";
    tbdCheckbox.checked = isTbd;
    descriptionInput.value = isTbd ? "" : item.title;
    descriptionField.hidden = false;
    ratingField.hidden = false;
    descriptionInput.disabled = isTbd;
    descriptionInput.placeholder = isTbd ? "TBD, no description needed" : "Describe the cause";
    descriptionInput.required = !isTbd;
    // Read this row's CURRENT category straight from its own Summary
    // cells -- if one of them already holds this exact cause's title,
    // that's the category it was given (by this feature or by the
    // client's original data); otherwise it has none yet.
    var designCell = row.cells[21], mfgCell = row.cells[23];
    if(designCell && designCell.textContent.trim() === item.title) setCategoryToggle("design");
    else if(mfgCell && mfgCell.textContent.trim() === item.title) setCategoryToggle("manufacturing");
    else setCategoryToggle("none");
    buildRateCards();
    var severity = Number(row.cells[6].textContent.trim()) || FIXED_SEVERITY;
    severityInput.value = severity;
    variantInputs.forEach(function(v){
      v.occInput.value = Number(row.cells[v.variant.occCol].textContent.trim()) || 1;
      v.detInput.value = Number(row.cells[v.variant.detCol].textContent.trim()) || 1;
      v.occInput.required = true;
      v.detInput.required = true;
    });
    updateRpnPreview();
    document.getElementById("causeEditorForm").querySelector('[type="submit"]').disabled = false;
    dialog.showModal();
    if(!isTbd) descriptionInput.focus();
  }
  dialog.addEventListener("close", function(){ editingItem = null; editingRow = null; });
  parentSelect.addEventListener("change", function(){ setParent(parentSelect.value); });

  actionSelect.addEventListener("change", updateEditorMode);
  tbdCheckbox.addEventListener("change", updateEditorMode);
  document.getElementById("causeCancel").addEventListener("click", function(){ dialog.close(); });
  dialog.addEventListener("click", function(event){ if(event.target === dialog) dialog.close(); });
  document.getElementById("causeEditorForm").addEventListener("submit", function(event){
    event.preventDefault();
    if(editingItem){
      var editedTitle = tbdCheckbox.checked ? "TBD" : descriptionInput.value.trim();
      if(!tbdCheckbox.checked && !editedTitle){ descriptionInput.focus(); return; }
      var item = editingItem, row = editingRow;
      var wasTbd = item.title.toUpperCase() === "TBD";
      var titleBeforeRename = item.title;
      if(editedTitle !== item.title) renameNode(item, editedTitle);
      var nowTbd = editedTitle.toUpperCase() === "TBD";
      if(wasTbd !== nowTbd){
        item.el.classList.toggle("is-tbd", nowTbd);
        var subtitleEl = item.el.querySelector(".tsub");
        if(subtitleEl){
          if(nowTbd){
            subtitleEl.textContent = "Cause not identified";
          }else{
            var childCount = (childrenMap.get(item.id) || []).length;
            subtitleEl.textContent = childCount + (childCount === 1 ? " sub-cause" : " sub-causes");
          }
        }
      }
      var clampEdit = function(value, fallback){
        var n = Math.round(Number(value));
        return Number.isFinite(n) && n >= 1 && n <= 10 ? n : fallback;
      };
      var severity = Number(row.cells[6].textContent.trim()) || FIXED_SEVERITY;
      variantInputs.forEach(function(v){
        var occ = clampEdit(v.occInput.value, 1);
        var det = clampEdit(v.detInput.value, 1);
        row.cells[v.variant.occCol].textContent = String(occ);
        row.cells[v.variant.detCol].textContent = String(det);
        row.cells[v.variant.rpnCol].innerHTML = String(severity * occ * det) +
          '<div class="dep">' + severity + ' &times; ' + occ + ' &times; ' + det + '</div>';
        if(item.isLocal){
          var stored = localNodes.find(function(n){ return n.id === item.id; });
          if(stored) stored.ratings = stored.ratings || {};
          if(stored) stored.ratings[v.variant.name] = { occ: occ, det: det };
        }
      });
      row.dataset.tbd = nowTbd ? "1" : "0";
      applyRiskColorForRow(row);
      // This row's own Design/Manufacturing Summary cells: only ever
      // touch a cell if it currently belongs to THIS cause (its old or
      // new title), so toggling one cause's category never clobbers a
      // value that actually belongs to some other cause in the chain.
      var designCell = row.cells[21], mfgCell = row.cells[23];
      [[designCell, "design"], [mfgCell, "manufacturing"]].forEach(function(pair){
        var cell = pair[0], key = pair[1];
        if(!cell) return;
        var current = cell.textContent.trim();
        var ownsCell = current === titleBeforeRename || current === editedTitle;
        if(selectedCategory === key) cell.textContent = editedTitle;
        else if(ownsCell) cell.textContent = "";
      });
      if(item.isLocal){
        var stored = localNodes.find(function(n){ return n.id === item.id; });
        if(stored) stored.category = (selectedCategory === "design" || selectedCategory === "manufacturing") ? selectedCategory : null;
        persistState();
      }
      buildChildrenMap();
      mapRowsToNodes();
      refreshDmBadges();
      refreshPageData();
      dialog.close();
      showToast("Cause updated.");
      return;
    }
    var mode = actionSelect.value;
    var parent = nodes.get(dialogParentId);
    if(!parent) return;
    var title = tbdCheckbox.checked ? "TBD" : descriptionInput.value.trim();
    if(mode !== "link" && !title){ descriptionInput.focus(); return; }
    var targetId = document.getElementById("causeLinkTarget").value;
    if((mode === "link" || mode === "both") && !targetId){ document.getElementById("causeLinkTarget").focus(); return; }
    if((mode === "link" || mode === "both") && !nodes.has(targetId)) return;
    if(mode !== "link" && parent.level >= 14){ levelNote.hidden = false; return; }

    var newNode = null;
    if(mode === "add" || mode === "both"){
      var clamp = function(value, fallback){
        var n = Math.round(Number(value));
        return Number.isFinite(n) && n >= 1 && n <= 10 ? n : fallback;
      };
      var ratings = {};
      variantInputs.forEach(function(v){
        ratings[v.variant.name] = { occ: clamp(v.occInput.value, 1), det: clamp(v.detInput.value, 1) };
      });
      newNode = { id: "local-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,7), parentId: parent.id, title: title, ratings: ratings,
        category: (selectedCategory === "design" || selectedCategory === "manufacturing") ? selectedCategory : null };
      var rendered = renderLocalNode(newNode);
      if(!rendered) return;
      localNodes.push(newNode);
      addWorksheetPath(newNode.id, ratings);
      if(newNode.category){
        var newRow = tableBody.querySelector('tr[data-node-id="' + newNode.id + '"]');
        var targetCell = newRow && newRow.cells[newNode.category === "design" ? 21 : 23];
        if(targetCell) targetCell.textContent = title;
      }
    }
    var createdLink = null;
    if(mode === "link" || mode === "both"){
      var fromId = newNode ? newNode.id : parent.id;
      if(fromId === targetId) return;
      var duplicate = localLinks.some(function(link){ return link.from === fromId && link.to === targetId; });
      if(!duplicate){
        var link = { id: "link-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,6), from: fromId, to: targetId };
        drawLink(link);
        localLinks.push(link);
        createdLink = link;
      }
    }
    buildChildrenMap();
    mapRowsToNodes();
    persistState();
    refreshDmBadges();
    refreshPageData();
    dialog.close();

    pushHistory({
      label: newNode ? "add cause" : "link",
      undo: function(){
        if(newNode){
          var idx = localNodes.indexOf(newNode);
          if(idx > -1) localNodes.splice(idx, 1);
          if(newNode.connectorEl) newNode.connectorEl.remove();
          if(newNode.plusEl) newNode.plusEl.remove();
          if(newNode.el) newNode.el.remove();
          nodes.delete(newNode.id);
          Array.prototype.slice.call(tableBody.querySelectorAll('tr[data-node-id="' + newNode.id + '"]')).forEach(function(row){ row.remove(); });
        }
        if(createdLink){
          var lidx = localLinks.indexOf(createdLink);
          if(lidx > -1) localLinks.splice(lidx, 1);
          if(createdLink.el) createdLink.el.remove();
        }
        buildChildrenMap();
        persistState();
        refreshPageData();
        showToast("Undone.");
      },
      redo: function(){
        if(newNode){
          renderLocalNode(newNode);
          addWorksheetPath(newNode.id, newNode.ratings);
          localNodes.push(newNode);
        }
        if(createdLink){ drawLink(createdLink); localLinks.push(createdLink); }
        buildChildrenMap();
        mapRowsToNodes();
        persistState();
        refreshPageData();
        showToast("Redone.");
      }
    });
  });

  // An export always carries the complete diagram, whichever branches are open on screen.
  function withOpenTree(run){ return window.treeWithAllOpen ? window.treeWithAllOpen(run) : run(); }
  function exportSvg(){ return withOpenTree(exportSvgNow); }
  function exportSvgNow(){
    var clone = svg.cloneNode(true);
    Array.prototype.slice.call(clone.querySelectorAll(".pl, .cx-toggle, .cx-edit")).forEach(function(plus){ plus.remove(); });
    var style = svgElement("style", {});
    style.textContent = ".hitbox>rect:nth-of-type(2){rx:12;stroke-width:1.2;filter:drop-shadow(0 3px 5px rgba(15,23,42,.10))}.hitbox .ttag{font-size:8px;letter-spacing:.65px}.hitbox .ttl2{font-size:11px;font-weight:600}.hitbox .tsub{font-size:9px}.hitbox.is-tbd>rect:nth-of-type(2){fill:#FEF2F2;stroke:#FCA5A5}.hitbox.is-tbd>rect:nth-of-type(3){fill:#EF4444}.hitbox.is-tbd .ttag,.hitbox.is-tbd .ttl2,.hitbox.is-tbd .tsub{fill:#B91C1C}.local-cause-link{stroke:#0F766E;stroke-dasharray:6 4}";
    clone.insertBefore(style, clone.firstChild);
    var source = new XMLSerializer().serializeToString(clone);
    downloadBlob(new Blob([source], { type: "image/svg+xml;charset=utf-8" }), "Crimp-DFMEA-Risk-Tree.svg");
  }

  function downloadBlob(blob, fileName){
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
  }

  function svgToPngDataUrl(){
    return new Promise(function(resolve, reject){
      var clone = svg.cloneNode(true);
      Array.prototype.slice.call(clone.querySelectorAll(".pl, .cx-toggle, .cx-edit")).forEach(function(plus){ plus.remove(); });
      var vb = svg.viewBox.baseVal;
      var scale = Math.min(1, 8192 / vb.width, 8192 / vb.height);
      var width = Math.ceil(vb.width * scale);
      var height = Math.ceil(vb.height * scale);
      clone.setAttribute("width", width);
      clone.setAttribute("height", height);
      var background = svgElement("rect", { x: 0, y: 0, width: width, height: height, fill: "#FFFFFF" });
      clone.insertBefore(background, clone.firstChild);
      var style = svgElement("style", {});
      style.textContent = ".hitbox>rect:nth-of-type(2){rx:12;stroke-width:1.2;filter:drop-shadow(0 3px 5px rgba(15,23,42,.10))}.hitbox .ttag{font-size:8px;letter-spacing:.65px}.hitbox .ttl2{font-size:11px;font-weight:600}.hitbox .tsub{font-size:9px}.hitbox.is-tbd>rect:nth-of-type(2){fill:#FEF2F2;stroke:#FCA5A5}.hitbox.is-tbd>rect:nth-of-type(3){fill:#EF4444}.hitbox.is-tbd .ttag,.hitbox.is-tbd .ttl2,.hitbox.is-tbd .tsub{fill:#B91C1C}.local-cause-link{stroke:#0F766E;stroke-dasharray:6 4}";
      clone.insertBefore(style, clone.firstChild);
      var xml = new XMLSerializer().serializeToString(clone);
      var url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
      var image = new Image();
      image.onload = function(){
        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        var context = canvas.getContext("2d");
        context.fillStyle = "#FFFFFF";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        URL.revokeObjectURL(url);
        try{ resolve(canvas.toDataURL("image/png")); }
        catch(error){ reject(error); }
      };
      image.onerror = function(){ URL.revokeObjectURL(url); reject(new Error("Could not render the risk tree image.")); };
      image.src = url;
    });
  }

  function exportExcel(){ return withOpenTree(exportExcelNow); }
  async function exportExcelNow(){
    if(!window.ExcelJS){ window.alert("Excel export could not load. Keep the source/node_modules folder beside this page."); return; }
    var button = document.querySelector(".top .btn.acc");
    if(button) button.setAttribute("aria-busy", "true");
    try{
      var workbook = new ExcelJS.Workbook();
      workbook.creator = "DFMEA";
      workbook.subject = "Crimp DFMEA worksheet and complete risk tree";
      workbook.calcProperties.fullCalcOnLoad = true;
      var sheet = workbook.addWorksheet("DFMEA");
      var headers = Array.prototype.slice.call(document.querySelectorAll(".source-sheet thead tr:last-child th:not(.locate-col)")).map(function(th){ return th.textContent.trim(); });
      var widthDefs = Array.prototype.slice.call(document.querySelectorAll(".source-sheet colgroup col"));
      var widths = [];
      widthDefs.forEach(function(col){
        var span = Number(col.getAttribute("span") || 1);
        var pixelWidth = Number((/width:\s*(\d+)px/.exec(col.getAttribute("style") || "") || [])[1] || 140);
        for(var i=0;i<span;i++) widths.push(Math.max(8, Math.round(pixelWidth / 7)));
      });
      sheet.columns = headers.map(function(header,index){ return { header: header, width: widths[index] || 18 }; });
      // Group header row (row 1): "Non Product Specific" plus one merged
      // block per product variant. Computed from window.dfmeaVariants /
      // dfmeaColLetter instead of fixed B1/Z1/AD1 cell refs, so adding a
      // variant (Add variant in the worksheet toolbar) keeps exporting
      // correctly without needing this touched by hand.
      var variants = window.dfmeaVariants || [];
      var colLetter = window.dfmeaColLetter || function(i){ return String(i); };
      var firstVariantCol = variants.length ? variants[0].occCol : headers.length;
      var groupRanges = [{ label: "Non Product Specific", from: 1, to: firstVariantCol - 1 }];
      variants.forEach(function(variant){
        groupRanges.push({ label: variant.name, from: variant.occCol, to: variant.rpnCol });
      });
      var groupColors = ["FFF1F5F9","FFECFDF5","FFFFFBEB","FFF5F3FF","FFFEF2F2","FFEFF6FF"];
      groupRanges.forEach(function(range, index){
        var fromLetter = colLetter(range.from), toLetter = colLetter(range.to);
        sheet.getCell(fromLetter + "1").value = range.label;
        if(toLetter !== fromLetter) sheet.mergeCells(fromLetter + "1:" + toLetter + "1");
        var cell = sheet.getCell(fromLetter + "1");
        cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: "FF334155" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: groupColors[index % groupColors.length] } };
      });
      sheet.addRow(headers);
      var dataRows = Array.prototype.slice.call(tableBody.querySelectorAll("tr"));
      dataRows.forEach(function(row,index){
        var excelRow = index + 3;
        var values = Array.prototype.slice.call(row.cells).filter(function(cell){
          return !cell.classList.contains("locate-col");
        }).map(function(cell){ return cell.textContent.trim(); });
        var severity = Number(row.cells[6].textContent.trim());
        variants.forEach(function(variant){
          var occ = Number(row.cells[variant.occCol].textContent.trim());
          var det = Number(row.cells[variant.detCol].textContent.trim());
          values[variant.rpnCol] = {
            formula: "G" + excelRow + "*" + colLetter(variant.occCol) + excelRow + "*" + colLetter(variant.detCol) + excelRow,
            result: severity * occ * det
          };
        });
        sheet.addRow(values);
      });
      sheet.views = [{ state: "frozen", xSplit: 7, ySplit: 2, topLeftCell: "H3" }];
      sheet.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: headers.length } };
      sheet.getRow(1).height = 22;
      sheet.getRow(2).height = 42;
      sheet.getRow(2).eachCell(function(cell){
        cell.font = { name: "Aptos", size: 9, bold: true, color: { argb: "FF334155" } };
        cell.alignment = { vertical: "middle", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F9FC" } };
        cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
      });
      for(var rowIndex=3; rowIndex<=dataRows.length+2; rowIndex++){
        var excelDataRow=sheet.getRow(rowIndex);
        excelDataRow.eachCell(function(cell,column){
          cell.font = { name: "Aptos", size: 9, color: { argb: "FF334155" } };
          cell.alignment = { vertical: "top", wrapText: column!==1 };
          if(rowIndex%2===0) cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFFBFCFE"}};
        });
        variants.forEach(function(variant){ excelDataRow.getCell(variant.rpnCol + 1).numFmt="0"; });
      }
      var diagramSheet=workbook.addWorksheet("Risk Tree");
      diagramSheet.getCell("A1").value="Complete Product and Risk Breakdown";
      diagramSheet.getCell("A1").font={name:"Aptos Display",size:16,bold:true,color:{argb:"FF0F172A"}};
      diagramSheet.getCell("A2").value="Includes the full cause tree and locally saved additions/links.";
      diagramSheet.getCell("A2").font={name:"Aptos",size:10,color:{argb:"FF64748B"}};
      var png=await svgToPngDataUrl();
      var imageId=workbook.addImage({base64:png,extension:"png"});
      var viewBox=svg.viewBox.baseVal;
      var imageWidth=Math.min(1800,viewBox.width);
      var imageHeight=imageWidth*viewBox.height/viewBox.width;
      diagramSheet.addImage(imageId,{tl:{col:0,row:3},ext:{width:imageWidth,height:imageHeight}});
      diagramSheet.getColumn(1).width=24;
      var buffer=await workbook.xlsx.writeBuffer();
      downloadBlob(new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),"Crimp-DFMEA.xlsx");
    }catch(error){
      window.alert("Excel export failed: " + error.message);
    }finally{
      if(button) button.removeAttribute("aria-busy");
    }
  }

  function activateControl(element, handler){
    if(!element) return;
    element.setAttribute("role", "button");
    element.setAttribute("tabindex", "0");
    element.addEventListener("click", handler);
    element.addEventListener("keydown", function(event){
      if(event.key === "Enter" || event.key === " "){ event.preventDefault(); handler(event); }
    });
  }

  indexSourceNodes();
  bindExistingPlusControls();
  Array.prototype.slice.call(svg.querySelectorAll(".hitbox")).forEach(decorateNode);
  // The worksheet already carries the client's own "Summary" columns --
  // the deepest cause on the Design side and on the Manufacturing side
  // of each chain -- but that only showed up as two more columns in a
  // 33-column table, easy to miss entirely. Mirror it onto the actual
  // cause card in the diagram too: whichever card's title matches one
  // of those Lowest-level values gets a small D/M badge, built straight
  // from the same cells already in the table, not a separate guess.
  // Re-run any time a cell in those columns changes (adding/editing a
  // cause's category) so the badges never drift out of sync with them.
  function refreshDmBadges(){
    Array.prototype.slice.call(svg.querySelectorAll(".dm-badge")).forEach(function(b){ b.remove(); });
    var designTexts = new Set(), mfgTexts = new Set();
    Array.prototype.slice.call(tableBody.querySelectorAll("tr")).forEach(function(row){
      var d = row.cells[21] && row.cells[21].textContent.trim();
      var m = row.cells[23] && row.cells[23].textContent.trim();
      if(d && d.toUpperCase() !== "TBD") designTexts.add(d);
      if(m && m.toUpperCase() !== "TBD") mfgTexts.add(m);
    });
    nodes.forEach(function(item){
      var isDesign = designTexts.has(item.title);
      var isMfg = mfgTexts.has(item.title);
      if(!isDesign && !isMfg) return;
      var rect = nodeBox(item);
      if(!rect || !item.el) return;
      var bx = Number(rect.getAttribute("x")), by = Number(rect.getAttribute("y"));
      var bw = Number(rect.getAttribute("width")), bh = Number(rect.getAttribute("height"));
      var cx = bx + bw - 12, cy = by + bh - 12;
      if(isDesign && isMfg) cx -= 14;
      [isDesign ? { letter: "D", fill: "#4338CA", tip: "Deepest cause on the Design side of this chain (from the client's Summary column)." } : null,
       isMfg ? { letter: "M", fill: "#B45309", tip: "Deepest cause on the Manufacturing side of this chain (from the client's Summary column)." } : null]
        .filter(Boolean).forEach(function(badge){
          var g = svgElement("g", { "class": "dm-badge", "data-tip": badge.tip });
          g.appendChild(svgElement("circle", { cx: cx, cy: cy, r: 7.5, fill: badge.fill, stroke: "#fff", "stroke-width": 1.3 }));
          var t = svgElement("text", { x: cx, y: cy + 2.8, "text-anchor": "middle", "font-size": "7.5", "font-weight": "700", fill: "#fff" });
          t.textContent = badge.letter;
          g.appendChild(t);
          item.el.appendChild(g);
          cx += 14;
        });
    });
  }
  localNodes.forEach(function(item){
    var parent=nodes.get(item.parentId);
    if(parent && renderLocalNode(item)){
      addWorksheetPath(item.id, item.ratings);
      if(item.category === "design" || item.category === "manufacturing"){
        var restoredRow = tableBody.querySelector('tr[data-node-id="' + item.id + '"]');
        var restoredCell = restoredRow && restoredRow.cells[item.category === "design" ? 21 : 23];
        if(restoredCell) restoredCell.textContent = item.title;
      }
    }
  });
  refreshDmBadges();
  localLinks.forEach(drawLink);
  buildChildrenMap();
  mapRowsToNodes();
  applyAllRiskColors();
  updateUndoButton();
  refreshPageData();
  if(window.wsFinishInitialLoad) window.wsFinishInitialLoad();
  if(localNodes.length || localLinks.length){
    var savedLabel=document.querySelector(".saved");
    if(savedLabel) savedLabel.textContent="All changes saved";
  }
  var addCauseButton=document.querySelector('.xps .xp[data-tip="Add a new cause node under the one you have selected."]');
  activateControl(addCauseButton,function(){openEditor("failure-main",true);});
  var wsAddCauseButton=document.getElementById("wsAddCauseBtn");
  activateControl(wsAddCauseButton,function(){openEditor("failure-main",true);});
  var svgExportButton=document.querySelector('.xps .xp[data-tip="Download this diagram as a standalone SVG file."]');
  activateControl(svgExportButton,exportSvg);
  var excelButton=document.querySelector(".top .btn.acc");
  activateControl(excelButton,exportExcel);
  var saveButton=Array.prototype.slice.call(document.querySelectorAll(".top .btn")).find(function(button){
    return button.textContent.trim()==="Save";
  });
  activateControl(saveButton,persistState);
  // Share and the notification bell had no handler at all before -- a
  // labelled button that silently does nothing on click reads as broken,
  // not as a feature preview, so both get an honest toast instead.
  var shareButton=Array.prototype.slice.call(document.querySelectorAll(".top .btn")).find(function(button){
    return button.textContent.trim()==="Share";
  });
  activateControl(shareButton,function(){ showToast("Sharing isn't available in this preview yet."); });
  var notifButton=document.querySelector(".top .ibtn");
  activateControl(notifButton,function(){ showToast("No new notifications."); });
  var expandAllButton=document.querySelector('.xps .xp[data-tip^="Expand every collapsed branch"]');
  if(expandAllButton) expandAllButton.remove();

  // ---------------------------------------------------------------
  // Search inside the full diagram: every card whose text matches is
  // highlighted (the rest fade back), Enter / the arrows step through
  // the matches and scroll each one into view.
  // ---------------------------------------------------------------
  var treeSearch = document.getElementById("treeSearch");
  if(treeSearch){
    var hits = [], hitIndex = -1;
    var countEl = document.getElementById("treeSearchCount");
    var allCards = function(){ return Array.prototype.slice.call(svg.querySelectorAll("g.hitbox")); };
    var cardText = function(g){
      var t = g.querySelector(".ttl2");
      return t ? t.textContent.replace(/\s+/g, " ").trim().toLowerCase() : "";
    };
    var showHit = function(){
      allCards().forEach(function(g){ g.classList.remove("search-current"); });
      if(hitIndex < 0 || !hits[hitIndex]) return;
      var g = hits[hitIndex];
      g.classList.add("search-current");
      var wrap = document.getElementById("treeWrap");
      if(wrap){
        var box = g.getBoundingClientRect(), view = wrap.getBoundingClientRect();
        wrap.scrollLeft += box.left + box.width / 2 - (view.left + view.width / 2);
        wrap.scrollTop += box.top + box.height / 2 - (view.top + view.height / 2);
      }
      countEl.textContent = (hitIndex + 1) + " of " + hits.length;
    };
    var runSearch = function(){
      var q = treeSearch.value.trim().toLowerCase();
      hits = [];
      hitIndex = -1;
      svg.classList.toggle("searching", !!q);
      allCards().forEach(function(g){
        var hit = !!q && cardText(g).indexOf(q) !== -1;
        g.classList.toggle("search-hit", hit);
        g.classList.remove("search-current");
        if(hit) hits.push(g);
      });
      countEl.textContent = q ? (hits.length ? hits.length + " found" : "No match") : "";
      if(hits.length){ hitIndex = 0; showHit(); }
    };
    var step = function(d){
      if(!hits.length) return;
      hitIndex = (hitIndex + d + hits.length) % hits.length;
      showHit();
    };
    // Closing the full view clears the search and its highlights.
    var treeWrapEl = document.getElementById("treeWrap");
    if(treeWrapEl) new MutationObserver(function(){
      if(!treeWrapEl.classList.contains("open") && treeSearch.value){ treeSearch.value = ""; runSearch(); }
    }).observe(treeWrapEl, { attributes: true, attributeFilter: ["class"] });
    treeSearch.addEventListener("input", runSearch);
    treeSearch.addEventListener("keydown", function(event){
      if(event.key === "Enter"){ event.preventDefault(); step(event.shiftKey ? -1 : 1); }
      if(event.key === "Escape" && treeSearch.value){ event.stopPropagation(); treeSearch.value = ""; runSearch(); }
    });
    document.getElementById("treeSearchNext").addEventListener("click", function(){ step(1); });
    document.getElementById("treeSearchPrev").addEventListener("click", function(){ step(-1); });
  }
})();
