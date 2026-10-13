
(function(){
  // The sidebar's "Projects" label/icon and which nav item is highlighted
  // are baked directly into each page's HTML now (used to be rewritten
  // here after the page had already painted, which is exactly what
  // caused a visible flash/shift in the sidebar on every page load).
  document.querySelectorAll(".sh").forEach(function(section){
    if(section.textContent.trim() === "ENGINEERING") section.remove();
  });
  var breadcrumb = document.querySelector(".crumb");
  if(breadcrumb){
    breadcrumb.innerHTML = "Aster EV Connector &rsaquo; Crimp DFMEA &rsaquo; Conductor Crimp &rsaquo; Carry electrical current";
  }
  var pageTitle = document.querySelector(".ttl");
  if(pageTitle && pageTitle.firstChild){
    pageTitle.firstChild.textContent = "Contact resistance too high ";
  }
  var treeSvg = document.querySelector("#treeZoom svg");
  if(treeSvg && !treeSvg.querySelector("#treeContent")){
    var documentNode = Array.prototype.slice.call(treeSvg.querySelectorAll("g.hitbox")).find(function(node){
      var tag = node.querySelector(".ttag");
      return tag && tag.textContent.trim() === "DFMEA DOCUMENT";
    });
    if(documentNode){
      var documentPlus = documentNode.nextElementSibling;
      documentNode.remove();
      if(documentPlus && documentPlus.classList.contains("pl")) documentPlus.remove();
    }
    Array.prototype.slice.call(treeSvg.querySelectorAll("text.lane")).forEach(function(lane){
      if(lane.textContent.trim() === "DFMEA DOCUMENT") lane.remove();
    });
    Array.prototype.slice.call(treeSvg.children).forEach(function(child){
      var path = child.getAttribute("d") || "";
      if(child.tagName.toLowerCase() === "path" && /^M176,/.test(path) && /200,/.test(path)) child.remove();
    });
    var treeContent = document.createElementNS("http://www.w3.org/2000/svg", "g");
    treeContent.setAttribute("id", "treeContent");
    Array.prototype.slice.call(treeSvg.children).forEach(function(child){
      if(child.tagName.toLowerCase() === "defs" || child.tagName.toLowerCase() === "style") return;
      treeContent.appendChild(child);
    });
    // The static cards were laid out with barely any gap between their
    // top edge and the tag text, and between the tag and the title --
    // both got tighter once the fonts and overall scale were bumped up.
    // A first attempt grew every card's height uniformly, but most
    // stacked siblings only had ~16px of gap between them to begin
    // with, so that growth ate straight into it and made cards touch.
    // This version keeps the total growth small enough to stay inside
    // that gap (rect grows by PAD_GROW, split evenly top/bottom so the
    // centre -- and every connector/plus-button anchored to it -- never
    // moves), and gets the rest of the improvement by REDISTRIBUTING
    // internal space rather than adding more of it: the tag-to-title
    // gap (the tightest one) borrows a few px from the title-to-subtitle
    // gap (which had slack to spare), so nothing grows outside the card.
    var PAD_GROW = 6;
    var TAG_SHIFT = PAD_GROW / 2;
    var TITLE_SHIFT = TAG_SHIFT + 5;
    var TSUB_SHIFT = TAG_SHIFT;
    Array.prototype.slice.call(treeContent.querySelectorAll("g.hitbox")).forEach(function(g){
      if(g.classList.contains("local-cause")) return;
      var rects = g.querySelectorAll("rect");
      if(rects.length < 2) return;
      rects.forEach(function(r){
        var y = Number(r.getAttribute("y"));
        var h = Number(r.getAttribute("height"));
        if(!Number.isFinite(y) || !Number.isFinite(h)) return;
        r.setAttribute("y", y - PAD_GROW / 2);
        r.setAttribute("height", h + PAD_GROW);
      });
      var tag = g.querySelector(".ttag");
      var tid = g.querySelector(".tid");
      var title = g.querySelector(".ttl2");
      var tsub = g.querySelector(".tsub");
      [tag, tid].forEach(function(t){
        if(!t) return;
        t.setAttribute("y", Number(t.getAttribute("y")) + TAG_SHIFT);
      });
      if(title) title.setAttribute("y", Number(title.getAttribute("y")) + TITLE_SHIFT);
      if(tsub) tsub.setAttribute("y", Number(tsub.getAttribute("y")) + TSUB_SHIFT);
    });
    var treeScale = 1.3;
    treeContent.setAttribute("transform", "matrix(" + treeScale + " 0 0 " + treeScale + " " + (-192 * treeScale) + " " + (16 * treeScale) + ")");
    treeSvg.appendChild(treeContent);

    // The generator pre-computed where to break each title into lines,
    // and some titles (like "Excessive conductor back chamfer angle")
    // break wrong and spill text past the card's right edge into the
    // next card. Re-wrap every title here using its ACTUAL rendered
    // width (getComputedTextLength, against the real Inter font this
    // renders with) instead of trusting that estimate -- cards keep
    // their fixed height/width (unlike titles, nothing else was shown
    // to overflow, and growing cards individually previously desynced
    // aligned siblings, per the note above), so a title that still can't
    // fit in the two lines a card budgets for is truncated with an
    // ellipsis as a last resort.
    // Exposed globally (not just run once here) because auth-nav.js needs
    // the exact same wrapping when it relabels a FUNCTION/FAILURE MODE
    // card's title for an overridden document -- a naive textContent
    // assignment there was the actual bug behind cards overflowing their
    // right edge for any override text longer than the original.
    window.fitSvgCardTitle = function(titleEl, newText){
      // RIGHT_PAD is larger than the card's actual right padding on
      // purpose: getComputedTextLength() (geometric glyph advances) and
      // the text's real rendered/anti-aliased bounding box differ by a
      // couple of px in practice, so the safety margin has to absorb that
      // gap too, not just the card's own padding.
      var MAX_LINES = 2, LINE_HEIGHT = 11, RIGHT_PAD = 16;
      var tspans = Array.prototype.slice.call(titleEl.querySelectorAll("tspan"));
      var fullText = newText != null ? String(newText)
        : tspans.map(function(t){ return t.textContent; }).join(" ").replace(/\s+/g, " ").trim();
      if(!fullText) return;
      var x = (tspans[0] && tspans[0].getAttribute("x")) || titleEl.getAttribute("x");
      var g = titleEl.closest("g.hitbox");
      var innerRect = g ? g.querySelectorAll("rect")[1] : null;
      if(!innerRect || !x) return;
      var maxWidth = (Number(innerRect.getAttribute("x")) + Number(innerRect.getAttribute("width"))) - Number(x) - RIGHT_PAD;
      if(!Number.isFinite(maxWidth) || maxWidth <= 0) return;
      var svgRoot = titleEl.ownerSVGElement;
      if(!svgRoot) return;

      var measurer = document.createElementNS("http://www.w3.org/2000/svg", "text");
      measurer.setAttribute("class", "ttl2");
      measurer.style.visibility = "hidden";
      svgRoot.appendChild(measurer);
      function measure(str){
        measurer.textContent = str;
        return measurer.getComputedTextLength();
      }
      function wrapAll(text){
        var words = text.split(" ");
        var lines = [];
        var current = "";
        words.forEach(function(word){
          var test = current ? current + " " + word : word;
          if(current && measure(test) > maxWidth){
            lines.push(current);
            current = word;
          }else{
            current = test;
          }
        });
        if(current) lines.push(current);
        return lines;
      }

      var lines = wrapAll(fullText);
      if(lines.length > MAX_LINES){
        lines = lines.slice(0, MAX_LINES - 1);
        var remainder = fullText.split(" ").slice(lines.join(" ").split(" ").length).join(" ");
        while(remainder.length > 1 && measure(remainder + "…") > maxWidth){
          remainder = remainder.slice(0, -1).trim();
        }
        lines.push(remainder + "…");
      }
      measurer.remove();

      titleEl.textContent = "";
      lines.forEach(function(line, i){
        var tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
        tspan.setAttribute("x", x);
        tspan.setAttribute("dy", i === 0 ? "0" : LINE_HEIGHT);
        tspan.textContent = line;
        titleEl.appendChild(tspan);
      });

      // Only for an override (newText given) -- a renamed FUNCTION/FAILURE
      // MODE can need a second line where the card's own original text
      // never did, and that card was sized for the original, usually
      // one-line, text. Without this, the subtitle below it ("Severity N")
      // stays wherever it already was and ends up overlapping the new
      // second line instead of sitting under it. Grown mostly downward
      // (a little upward too, kept small) rather than centred, since
      // centred growth here would push the box's top edge into the column
      // header text sitting just a few units above it.
      if(newText != null){
        var sub = g.querySelector(".tsub");
        var outerRect = g.querySelectorAll("rect")[0];
        var accentRect = g.querySelectorAll("rect")[2];
        var titleY = Number(titleEl.getAttribute("y"));
        if(sub && outerRect && Number.isFinite(titleY)){
          var SUB_GAP = 14, SUB_CLEARANCE = 6, UP_SHARE = 0.25;
          var lastLineY = titleY + (lines.length - 1) * LINE_HEIGHT;
          var desiredSubY = lastLineY + SUB_GAP;
          var innerBottom = Number(innerRect.getAttribute("y")) + Number(innerRect.getAttribute("height"));
          var shortfall = (desiredSubY + SUB_CLEARANCE) - innerBottom;
          if(shortfall > 0){
            var growUp = shortfall * UP_SHARE;
            [outerRect, innerRect, accentRect].forEach(function(r){
              if(!r) return;
              r.setAttribute("y", Number(r.getAttribute("y")) - growUp);
              r.setAttribute("height", Number(r.getAttribute("height")) + shortfall);
            });
          }
          sub.setAttribute("y", desiredSubY);
        }
      }
    };

    // Must run after treeContent is actually attached above --
    // getComputedTextLength on a detached node returns 0, silently
    // measuring nothing.
    Array.prototype.slice.call(treeContent.querySelectorAll(".ttl2")).forEach(function(titleEl){
      window.fitSvgCardTitle(titleEl);
    });
    var originalViewBox = treeSvg.viewBox.baseVal;
    var originalTreeHeight = originalViewBox.height;
    var treeWidth = Math.max(800, (originalViewBox.width - 192) * treeScale) + 60;
    var treeHeight = originalTreeHeight * treeScale + 60;
    treeSvg.setAttribute("viewBox", "0 0 " + treeWidth + " " + treeHeight);
    treeSvg.setAttribute("width", treeWidth);
    treeSvg.setAttribute("height", treeHeight);
    Array.prototype.slice.call(treeSvg.querySelectorAll("g.pl")).forEach(function(plus){
      var owner = plus.previousElementSibling;
      var tag = owner && owner.querySelector(".ttag");
      if(!tag || /^(FUNCTION|ITEM)$/.test(tag.textContent.trim())) plus.remove();
    });
  }
  // One definition of what the diagram's colours mean, shown above the
  // inline preview and again in the full view's toolbar -- each swatch is
  // drawn like the node it stands for (pale fill, coloured outline, solid
  // left bar), so it can be matched to the diagram at a glance.
  var legendHosts = Array.prototype.slice.call(document.querySelectorAll("[data-node-legend]"));
  if(legendHosts.length){
    var legendNode = function(fill, stroke, accent, label){
      return '<span><i class="nl-node" style="background:' + fill + ';border-color:' + stroke + ';border-left-color:' + accent + '"></i>' + label + '</span>';
    };
    var legendBar = function(color, label){
      return '<span><i class="nl-bar" style="background:' + color + '"></i>' + label + '</span>';
    };
    var legendBadge = function(color, letter, label){
      return '<span><i class="nl-badge" style="background:' + color + '">' + letter + '</i>' + label + '</span>';
    };
    // Each group wraps as one unit, so a heading never ends up on a
    // different line from the swatches it introduces.
    var legendGroup = function(heading, items){
      return '<div class="nl-group"><b>' + heading + '</b>' + items.join("") + '</div>';
    };
    var legendHtml = legendGroup("Node colours", [
        legendNode("#F8FAFC", "#CBD5E1", "#475569", "Function"),
        legendNode("#FFFFFF", "#FBBF24", "#D97706", "Failure mode"),
        legendNode("#FFFAEB", "#FCD34D", "#B45309", "Cause levels 1&ndash;3"),
        legendNode("#FFF7ED", "#FDBA74", "#C2410C", "Levels 4&ndash;6"),
        legendNode("#F5F3FF", "#C4B5FD", "#6D28D9", "Levels 7&ndash;9"),
        legendNode("#FFF1F2", "#FDA4AF", "#BE123C", "Levels 10&ndash;11"),
        legendNode("#FEF2F2", "#FCA5A5", "#EF4444", "TBD: cause not identified yet")
      ])
      + legendGroup("Left bar on a final cause", [
        legendBar("#DC2626", "RPN 100+"),
        legendBar("#D97706", "RPN 40&ndash;99"),
        legendBar("#16A34A", "RPN under 40")
      ])
      + legendGroup("Badges", [
        legendBadge("#4338CA", "D", "Deepest design cause"),
        legendBadge("#B45309", "M", "Deepest manufacturing cause")
      ]);
    legendHosts.forEach(function(host){ host.innerHTML = legendHtml; });
  }
  var searchShell = document.querySelector(".top .srch");
  if(searchShell){
    searchShell.innerHTML = '<svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg><input id="globalSearch" type="search" aria-label="Search failure modes, causes, and controls" placeholder="Search failure modes, causes, controls" autocomplete="off">';
  }
  var topBar = document.querySelector(".top");
  if(topBar){
    var updateTopBarHeight = function(){
      document.documentElement.style.setProperty("--topbar-height", topBar.offsetHeight + "px");
    };
    updateTopBarHeight();
    if(window.ResizeObserver) new ResizeObserver(updateTopBarHeight).observe(topBar);
    else window.addEventListener("resize", updateTopBarHeight);
  }
  var documentLink = document.querySelector(".subnav.on");
  if(documentLink){
    // The sidebar lists projects only. A project's DFMEA documents are
    // opened from that project's own page, not nested underneath it here.
    var readCustomProjects = function(){
      try{ return JSON.parse(localStorage.getItem("dfmeaMyProjects") || "[]"); }catch(error){ return []; }
    };
    var projectFilter = document.createElement("div");
    projectFilter.className = "project-filter";
    projectFilter.innerHTML = '<label class="project-search">'
      + '<svg class="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>'
      + '<input id="projectSearch" type="search" aria-label="Search projects" placeholder="Find a project" autocomplete="off">'
      + '</label>'
      + '<nav class="project-list" aria-label="Projects">'
      + '<div class="project-empty" aria-live="polite" hidden>No matching projects</div>'
      + '</nav>';
    documentLink.replaceWith(projectFilter);
    var projectNav = projectFilter.querySelector(".project-list");
    var emptyState = projectNav.querySelector(".project-empty");
    var projectLinks = function(){
      return Array.prototype.slice.call(projectNav.querySelectorAll(".project-link"));
    };
    var findProjectLink = function(projectId){
      return projectLinks().find(function(link){ return link.getAttribute("data-id") === projectId; }) || null;
    };

    // Exposed so a page that just created a project (Create project with
    // AI) can add it here live, right away, instead of it only showing up
    // on the next full page load.
    window.addProjectToSidebar = function(project){
      var existing = findProjectLink(project.id);
      if(existing) return existing;
      var link = document.createElement("a");
      link.className = "project-link";
      link.setAttribute("data-id", project.id);
      link.href = "project.html?id=" + encodeURIComponent(project.id);
      link.innerHTML = '<svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg><span></span>';
      link.querySelector("span").textContent = project.name;
      projectNav.insertBefore(link, emptyState);
      return link;
    };
    window.blinkSidebarEl = function(el){
      if(!el) return;
      el.classList.add("project-blink");
      setTimeout(function(){ el.classList.remove("project-blink"); }, 3000);
    };
    [{ id: "aster-ev-connector", name: "Aster EV Connector" }].concat(readCustomProjects()).forEach(function(project){
      window.addProjectToSidebar(project);
    });

    // A project that was just created gets a brief highlight pulse where
    // it landed in this list -- one-time, cleared from sessionStorage
    // immediately so it only fires on the page load right after creation.
    try{
      var justProjectId = sessionStorage.getItem("dfmeaJustCreatedProjectId");
      if(justProjectId){
        sessionStorage.removeItem("dfmeaJustCreatedProjectId");
        window.blinkSidebarEl(findProjectLink(justProjectId));
      }
    }catch(error){ /* sessionStorage unavailable -- nothing to blink */ }

    // Creating a project in ANOTHER already-open tab doesn't touch this
    // tab's DOM at all -- the browser's own "storage" event fires here
    // whenever localStorage changes in another tab of this app, which is
    // what adds it to this list live instead of leaving it stale until a
    // manual refresh.
    window.addEventListener("storage", function(event){
      if(event.key !== "dfmeaMyProjects" || !event.newValue) return;
      try{
        JSON.parse(event.newValue).forEach(function(project){
          if(!findProjectLink(project.id)) window.blinkSidebarEl(window.addProjectToSidebar(project));
        });
      }catch(error){ /* malformed storage value -- ignore */ }
    });

    var projectSearch = projectFilter.querySelector("#projectSearch");
    projectSearch.addEventListener("input", function(){
      var query = projectSearch.value.trim().toLowerCase();
      var visible = 0;
      projectLinks().forEach(function(link){
        var matches = !query || link.textContent.toLowerCase().indexOf(query) !== -1;
        link.hidden = !matches;
        if(matches) visible++;
      });
      emptyState.hidden = visible > 0;
    });
  }
  function refreshDfmeaMetrics(){
  var analysisRows = Array.prototype.slice.call(document.querySelectorAll("#wsBody tr"));
  var summaryRow = analysisRows[0];
  if(summaryRow){
    document.getElementById("summaryFunction").textContent = summaryRow.cells[2].textContent.trim();
    document.getElementById("summaryCriteria").textContent = summaryRow.cells[3].textContent.trim();
    document.getElementById("summaryFailure").textContent = summaryRow.cells[4].textContent.trim();
    document.getElementById("summaryEffect").textContent = summaryRow.cells[5].textContent.trim();
  }
  var svgCauseNodes = Array.prototype.slice.call(document.querySelectorAll("#treeZoom .hitbox")).filter(function(node){
    var tag = node.querySelector(".ttag");
    return tag && tag.textContent.trim().indexOf("CAUSE") === 0;
  });
  function uniqueCellValues(index){
    return Array.from(new Set(analysisRows.map(function(row){ return row.cells[index].textContent.trim(); }).filter(Boolean)));
  }
  function setKpi(previousLabel, label, value, tip){
    var card = Array.prototype.slice.call(document.querySelectorAll(".kp")).find(function(item){
      return item.dataset.kpiKey === previousLabel || item.querySelector(".kpt").textContent.trim().toLowerCase() === previousLabel;
    });
    if(!card) return;
    card.dataset.kpiKey = previousLabel;
    card.querySelector(".kpt").textContent = label;
    card.querySelector(".kpv").textContent = value;
    card.setAttribute("data-tip", tip);
  }
  var stageValues = uniqueCellValues(1);
  var stage = stageValues.length === 1 ? stageValues[0] : "Multiple";
  var stageNumber = stage.match(/^([0-9]+(?:\.[0-9]+)?)/);
  var lifeCycleValue = stageNumber ? stageNumber[1] : stage;
  var tbdPathCount = 0;
  var depthCounts = Object.create(null);
  var controlValues = [];
  analysisRows.forEach(function(row){
    var levelCells = Array.prototype.slice.call(row.cells, 7, 21);
    var deepestLevel = 0;
    var hasTbd = false;
    levelCells.forEach(function(cell, index){
      var value = cell.textContent.trim();
      if(value){
        deepestLevel = index + 1;
        if(value.toUpperCase() === "TBD") hasTbd = true;
      }
    });
    row.setAttribute("data-tbd", hasTbd ? "1" : "0");
    row.setAttribute("data-depth", String(deepestLevel));
    if(hasTbd) tbdPathCount++;
    if(deepestLevel) depthCounts[deepestLevel] = (depthCounts[deepestLevel] || 0) + 1;

    var severity = Number(row.cells[6].textContent.trim());
    [[25, 27, 28], [29, 31, 32]].forEach(function(columns){
      var occurrence = Number(row.cells[columns[0]].textContent.trim());
      var detection = Number(row.cells[columns[1]].textContent.trim());
      if(!Number.isFinite(severity) || !Number.isFinite(occurrence) || !Number.isFinite(detection)) return;
      var result = severity * occurrence * detection;
      var resultCell = row.cells[columns[2]];
      resultCell.textContent = String(result);
      var formula = document.createElement("div");
      formula.className = "dep";
      formula.textContent = severity + " × " + occurrence + " × " + detection;
      resultCell.appendChild(formula);
    });
    [26, 30].forEach(function(index){
      var control = row.cells[index].textContent.trim();
      if(control) controlValues.push(control);
    });
  });
  controlValues = Array.from(new Set(controlValues));
  var severities = uniqueCellValues(6);
  var deepestUsedLevel = Math.max.apply(null, Object.keys(depthCounts).map(Number).concat([0]));
  var tbdNodes = Array.prototype.slice.call(document.querySelectorAll("#treeZoom .hitbox")).filter(function(node){
    var title = node.querySelector(".ttl2");
    return title && title.textContent.trim().toUpperCase() === "TBD";
  });
  tbdNodes.forEach(function(node){
    node.classList.add("is-tbd");
    node.setAttribute("data-tip", "TBD: this cause has not been identified. No countermeasure is documented on this path.");
    var subtitle = node.querySelector(".tsub");
    if(subtitle) subtitle.textContent = "Cause not identified";
  });
  var treeTbdSummary = document.getElementById("treeTbdSummary");
  if(treeTbdSummary) treeTbdSummary.textContent = tbdPathCount + " paths end in TBD";
  var treeControlSummary = document.getElementById("treeControlSummary");
  if(treeControlSummary){
    treeControlSummary.textContent = controlValues.length
      ? controlValues.length + " current controls are recorded."
      : "No current controls are recorded in this DFMEA.";
  }
  var treeSummary = document.getElementById("treeSummary");
  if(treeSummary) treeSummary.textContent = svgCauseNodes.length + " causes across " + analysisRows.length + " paths";
  var kpiPathCount = document.getElementById("kpiPathCount");
  if(kpiPathCount) kpiPathCount.textContent = analysisRows.length;
  var tbdCountLabel = document.getElementById("wsTbdCount");
  if(tbdCountLabel) tbdCountLabel.textContent = tbdPathCount;
  var levelChipContainer = document.getElementById("wsLevelChips");
  if(levelChipContainer){
    Object.keys(depthCounts).map(Number).sort(function(a,b){return a-b;}).forEach(function(depth){
      var existing = levelChipContainer.querySelector('.lvlchip[data-depth="' + depth + '"]');
      if(existing) return;
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "lvlchip";
      chip.setAttribute("data-depth", String(depth));
      chip.setAttribute("data-dynamic-depth", "true");
      chip.setAttribute("data-tip", "Show " + depthCounts[depth] + " paths ending at Level " + depth + ".");
      chip.innerHTML = "L" + depth + " <b>" + depthCounts[depth] + "</b>";
      levelChipContainer.appendChild(chip);
    });
  }
  document.querySelectorAll(".lvlchip").forEach(function(chip){
    var depth = chip.getAttribute("data-depth");
    var count = depth === "all" ? analysisRows.length : (depthCounts[depth] || 0);
    var number = chip.querySelector("b");
    if(number) number.textContent = count;
    if(depth !== "all") chip.setAttribute("data-tip", "Show " + count + " paths ending at Level " + depth + ".");
  });
  setKpi("functions analysed", "Functions analysed", uniqueCellValues(2).length,
    "Number of distinct functions in this DFMEA.");
  setKpi("failure modes", "Failure modes", uniqueCellValues(4).length,
    "Number of distinct failure modes in this DFMEA.");
  setKpi("life cycle stage", "Product life-cycle stage", lifeCycleValue,
    stage + " is the product life-cycle category recorded in this DFMEA; it is not calculated from risk scores.");
  setKpi("causes mapped", "Causes mapped", svgCauseNodes.length,
    "Count of cause nodes shown in the risk tree.");
  setKpi("still marked tbd", "Paths ending in TBD", tbdPathCount,
    "Cause paths whose deepest identified cause is still marked TBD.");
  setKpi("current controls", "Recorded controls", controlValues.length,
    controlValues.length ? controlValues.length + " distinct current controls are recorded." : "No current controls are recorded in this DFMEA.");
  setKpi("severity", "Severity (S)", severities.length === 1 ? severities[0] : "Mixed",
    "Severity rating recorded in the worksheet; it is based on the effect.");
  setKpi("deepest used level", "Deepest cause level", deepestUsedLevel,
    "Deepest identified cause level among the worksheet paths.");

  var failureNode = Array.prototype.slice.call(document.querySelectorAll("#treeZoom .hitbox")).find(function(node){
    var tag = node.querySelector(".ttag");
    return tag && tag.textContent.trim().indexOf("FAILURE MODE") === 0;
  });
  if(failureNode && analysisRows.length){
    var selectedRow = analysisRows[0];
    var selectedSeverity = Number(selectedRow.cells[6].textContent.trim());
    var selectedOccurrence = Number(selectedRow.cells[29].textContent.trim());
    var selectedDetection = Number(selectedRow.cells[31].textContent.trim());
    failureNode.setAttribute("data-tip", "Failure mode: " + selectedRow.cells[4].textContent.trim() +
      ". Severity " + selectedSeverity + ", Occurrence " + selectedOccurrence +
      ", Detection " + selectedDetection + ", RPN " + (selectedSeverity * selectedOccurrence * selectedDetection) + ".");
  }
  document.querySelectorAll("[data-tip]").forEach(function(element){
    var tip = element.getAttribute("data-tip");
    if(/client/i.test(tip)) element.setAttribute("data-tip", tip.replace(/\bclient\b/gi, "DFMEA"));
  });
  }
  window.refreshDfmeaMetrics = refreshDfmeaMetrics;
  refreshDfmeaMetrics();

  var sectionHeads = Array.prototype.slice.call(document.querySelectorAll(".content > .seclab"));
  var tabContainer = document.querySelector(".tabs");
  var sectionLabels = ["Risk Tree", "Worksheet"];
  var sectionIds = ["dfmea-risk-tree", "dfmea-worksheet"];
  if(tabContainer && sectionHeads.length >= sectionIds.length){
    sectionHeads = sectionHeads.slice(0, sectionIds.length);
    sectionHeads.forEach(function(section, index){ section.id = sectionIds[index]; });
    tabContainer.outerHTML = '<nav class="tabs" aria-label="DFMEA page sections"></nav>';
    tabContainer = document.querySelector(".tabs");
    tabContainer.innerHTML = sectionLabels.map(function(label, index){
      return '<a class="tab" href="#' + sectionIds[index] + '">' + label + '</a>';
    }).join("") + '<div class="tabs-actions">'
      + '<button type="button" class="tab-add" disabled data-tip="Not available in this preview yet -- causes can already be added from the Risk Tree and Worksheet tabs.">+ Function</button>'
      + '<button type="button" class="tab-add" disabled data-tip="Not available in this preview yet -- causes can already be added from the Risk Tree and Worksheet tabs.">+ Failure mode</button>'
      + '<button type="button" class="tab-add" id="tabImportExcel" data-tip="Import an existing DFMEA from an Excel workbook."><svg class="ic" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/></svg>Import Excel</button>'
      + '<input type="file" id="tabImportExcelInput" accept=".xlsx,.xls" hidden>'
      + '<button type="button" class="tab-add acc" id="tabNewDfmeaAi" data-tip="Describe the issue to find related past DFMEAs and build a starting structure from them."><svg class="ic" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px"><path d="M12 5v14M5 12h14"/></svg>New DFMEA</button>'
      + '</div>';
    var sectionTabs = Array.prototype.slice.call(tabContainer.querySelectorAll(".tab"));
    function setActiveTab(id){
      sectionTabs.forEach(function(tab){
        var active = tab.getAttribute("href") === "#" + id;
        tab.classList.toggle("on", active);
        if(active) tab.setAttribute("aria-current", "location");
        else tab.removeAttribute("aria-current");
      });
    }
    function syncActiveTab(){
      var current = sectionHeads[0];
      sectionHeads.forEach(function(section){
        if(section.getBoundingClientRect().top <= 150) current = section;
      });
      // Near the bottom of the page there may not be enough scrollable
      // room left for the last section's top to ever cross the 150px
      // threshold above (its own content is all that's left to scroll
      // through) -- "can't scroll any further" should still count as
      // "the last section is the one being viewed".
      var atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if(atBottom) current = sectionHeads[sectionHeads.length - 1];
      setActiveTab(current.id);
    }
    sectionTabs.forEach(function(tab){
      tab.addEventListener("click", function(){
        setActiveTab(tab.getAttribute("href").slice(1));
      });
    });
    window.addEventListener("scroll", syncActiveTab, {passive:true});
    window.addEventListener("hashchange", syncActiveTab);
    syncActiveTab();
    var importBtn = document.getElementById("tabImportExcel");
    var importInput = document.getElementById("tabImportExcelInput");
    if(importBtn && importInput){
      importBtn.addEventListener("click", function(){ importInput.click(); });
      importInput.addEventListener("change", function(){
        var file = importInput.files && importInput.files[0];
        importInput.value = "";
        if(!file) return;
        if(window.showToast) window.showToast('"' + file.name + '" received. Full Excel import is coming soon.');
      });
    }
  }
})();
