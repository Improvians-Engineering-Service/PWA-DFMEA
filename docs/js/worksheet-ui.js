
(function(){
  "use strict";

  /* ---- shared hover tooltip: works for plain HTML controls and for the
     SVG nodes in the diagram alike, since both carry a data-tip attribute
     and DOM events behave the same way on both. ---- */
  var tip = document.getElementById("qTooltip");
  function showTip(el){
    var text = el.getAttribute("data-tip");
    if(!text || !tip) return;
    tip.textContent = text;
    tip.classList.remove("below");
    var r = el.getBoundingClientRect();
    var x = r.left + r.width / 2;
    x = Math.max(90, Math.min(window.innerWidth - 90, x));
    tip.style.left = x + "px";
    tip.style.top = r.top + "px";
    tip.classList.add("show");
    // Elements near the very top of the page (like the "+Function" tab
    // row buttons) don't leave room for the default above-the-element
    // placement, clipping the tooltip off the top of the viewport.
    // Flip to below once it has real dimensions to check against.
    var tipRect = tip.getBoundingClientRect();
    if(tipRect.top < 4){
      tip.classList.add("below");
      tip.style.top = r.bottom + "px";
    }
  }
  function hideTip(){ if(tip) tip.classList.remove("show"); }
  document.addEventListener("mouseover", function(e){
    var el = e.target.closest ? e.target.closest("[data-tip]") : null;
    if(el) showTip(el);
  });
  document.addEventListener("mouseout", function(e){
    var el = e.target.closest ? e.target.closest("[data-tip]") : null;
    if(el) hideTip();
  });
  document.addEventListener("scroll", hideTip, true);

  /* ---- tree: compact fit-to-box preview, full-screen zoomable modal ---- */
  var wrap = document.getElementById("treeWrap");
  if(wrap){
    var zoomEl = document.getElementById("treeZoom");
    var svg = zoomEl.querySelector("svg");
    var overlay = document.getElementById("treeOverlay");
    var backdrop = document.getElementById("treeBackdrop");
    var openBtn = document.getElementById("treeOpenBtn");
    var closeBtn = document.getElementById("treeCloseBtn");
    var zoomLabel = document.getElementById("tZoomLabel");
    var zIn = document.getElementById("tZoomIn");
    var zOut = document.getElementById("tZoomOut");
    var zReset = document.getElementById("tZoomReset");
    var vb = svg.viewBox.baseVal;
    var z = 1;

    // The Python-generated nodes only carry plain coloured text for their
    // "CAUSE · L4" / "FAILURE MODE" tags, which reads as flat and dated.
    // Rather than re-running the whole layout pipeline to change that,
    // inject a soft rounded pill behind each tag at runtime: same data,
    // same layout, just dressed the way a modern dashboard actually
    // renders a status chip. Runs once per node (guarded so re-running it
    // after a locally-added cause never double-stacks pills).
    // The generated cards all use ONE fixed box height sized for a
    // two-line title, with the caption ("1 sub-cause" / "Severity 9")
    // pinned at a fixed distance from the top regardless of how many
    // title lines actually rendered. Most titles are one line, so most
    // cards carry a big dead gap between the title and the caption.
    //
    // The box itself must NOT move or resize: every node in a straight
    // chain shares one row, and the connector lines plus the "+" button
    // circles are pre-drawn to each box's existing centre. Shrinking
    // boxes individually (tried first) desynced 1-line and 2-line boxes
    // in the same row from each other, breaking the row's top-alignment.
    // So only the caption moves, up toward the title, inside the
    // untouched box -- same fix for the dead gap, zero geometry risk.
    function tightenNode(g){
      if(g.dataset.tightened) return;
      g.dataset.tightened = "true";
      var title = g.querySelector(".ttl2");
      var sub = g.querySelector(".tsub");
      if(!title || !sub) return;
      var lineCount = Math.max(1, title.querySelectorAll("tspan").length || 1);
      var titleY = Number(title.getAttribute("y"));
      var lastLineY = titleY + (lineCount - 1) * 11;
      var newSubY = lastLineY + 20;
      if(newSubY >= Number(sub.getAttribute("y"))) return;
      sub.setAttribute("y", newSubY);
    }
    function tightenAllTreeNodes(){
      Array.prototype.slice.call(svg.querySelectorAll(".hitbox")).forEach(tightenNode);
    }
    window.tightenNode = tightenNode;
    tightenAllTreeNodes();

    function polishTreeNode(g){
      if(g.dataset.polished) return;
      var tag = g.querySelector(".ttag");
      if(!tag) return;
      try{
        var accent = getComputedStyle(tag).fill;
        var bbox = tag.getBBox();
        var padX = 5, padY = 3;
        var pill = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        pill.setAttribute("x", bbox.x - padX);
        pill.setAttribute("y", bbox.y - padY);
        pill.setAttribute("width", bbox.width + padX * 2);
        pill.setAttribute("height", bbox.height + padY * 2);
        pill.setAttribute("rx", (bbox.height + padY * 2) / 2);
        pill.setAttribute("fill", accent);
        pill.setAttribute("opacity", "0.13");
        pill.setAttribute("class", "tag-pill");
        g.insertBefore(pill, tag);
        g.dataset.polished = "true";
      }catch(error){ /* getBBox needs layout; harmless to skip if unavailable */ }
    }
    function polishAllTreeNodes(){
      Array.prototype.slice.call(svg.querySelectorAll(".hitbox")).forEach(polishTreeNode);
    }
    window.polishTreeNode = polishTreeNode;
    polishAllTreeNodes();

    function apply(){
      // CSS transform:scale() never changes an element's own layout box, so
      // a scrolling ancestor's scrollWidth/scrollHeight stay pinned to the
      // UNSCALED size no matter the zoom, which breaks both "zoom out to
      // see more without scrolling" and any attempt to centre the scroll
      // position. Sizing the wrapper explicitly to the scaled footprint
      // (while the SVG inside it still renders at native size, then gets
      // visually scaled down to fit that box) fixes both at once.
      wrap.style.setProperty("--z", z);
      zoomEl.style.width = (vb.width * z) + "px";
      zoomEl.style.height = (vb.height * z) + "px";
      if(zoomLabel) zoomLabel.textContent = Math.round(z * 100) + "%";
      // The minimap's viewport rectangle is sized/positioned from the
      // current zoom level (--z) and scroll position; it only listened
      // for scroll before, so zooming without also scrolling left it
      // stuck at its old (wrong) size until the next scroll happened.
      if(window.updateMinimapViewport) window.updateMinimapViewport();
    }
    window.refreshTreeZoom = apply;
    // The closed preview is a fixed, legible scale, not a "shrink the whole
    // 3500px diagram to fit a 460px box" thumbnail: at that ratio the text
    // is unreadable, which just looks broken rather than inviting. A fixed
    // ~42% keeps the top of the diagram (the failure mode and the first
    // couple of cause levels) genuinely readable; the rest is cropped by
    // the box on purpose, with the gradient + badge signalling there is
    // more, waiting behind a click.
    var CLOSED_ZOOM = 0.706;
    function fitClosed(){
      z = CLOSED_ZOOM;
      apply();
      wrap.scrollLeft = 0;
      wrap.scrollTop = 0;
    }
    var minZoom = 0.15;
    var fitZoom = 0.15;
    var modalBar = wrap.querySelector(".treemodalbar");
    // fitZoom is the true "whole diagram fits the window" scale, used by
    // the Fit button. minZoom is a separate, lower floor for manual
    // zoom-out -- it used to equal fitZoom exactly, which could strand
    // nodes just out of reach if the fit calculation was ever slightly
    // off, and gave no way to zoom out past "fit" even when that would
    // help. Keeping it well below fitZoom means there's always more room
    // to zoom out. The toolbar's real height is measured (it wraps onto a
    // second row for the colour legend) rather than assumed.
    function measureFit(){
      var cw = wrap.clientWidth - 60;
      var ch = wrap.clientHeight - (modalBar ? modalBar.offsetHeight : 0) - 41;
      if(cw <= 0 || ch <= 0) return false;
      fitZoom = Math.max(0.08, Math.min(1, Math.min(cw / vb.width, ch / vb.height)));
      minZoom = Math.max(0.05, fitZoom * 0.6);
      return true;
    }
    function fitOpen(){
      if(!measureFit()) return;
      z = fitZoom;
      apply();
    }
    // Fit shows the whole diagram, so it centres it in the window.
    function centerScroll(){
      requestAnimationFrame(function(){
        wrap.scrollLeft = Math.max(0, (wrap.scrollWidth - wrap.clientWidth) / 2);
        wrap.scrollTop = Math.max(0, (wrap.scrollHeight - wrap.clientHeight) / 2);
      });
    }
    // The full view opens at a readable 80%, pinned to the diagram's
    // top-left corner -- where the chain starts (function, failure mode,
    // first cause levels) -- instead of shrinking everything to fit, which
    // left the text too small to read until the user zoomed in by hand.
    var OPEN_ZOOM = 0.8;
    function openTree(){
      wrap.classList.add("open");
      backdrop.classList.add("show");
      document.body.style.overflow = "hidden";
      measureFit();
      z = OPEN_ZOOM;
      apply();
      wrap.scrollLeft = 0;
      wrap.scrollTop = 0;
      window.dispatchEvent(new Event("treeModalOpened"));
    }
    function closeTree(){
      wrap.classList.remove("open");
      backdrop.classList.remove("show");
      document.body.style.overflow = "";
      hideTip();
      fitClosed();
    }
    if(overlay) overlay.addEventListener("click", openTree);
    if(openBtn) openBtn.addEventListener("click", openTree);
    if(closeBtn) closeBtn.addEventListener("click", closeTree);
    if(backdrop) backdrop.addEventListener("click", closeTree);
    window.openTreeModal = openTree;
    window.isTreeModalOpen = function(){ return wrap.classList.contains("open"); };
    // Zooming toward a fixed point (the mouse cursor for wheel zoom, the
    // wrap's own centre for the +/-/keyboard controls, which have no
    // cursor position to anchor to) instead of always the top-left
    // corner: work out which SVG-space point currently sits under that
    // anchor, change the zoom, then re-derive the scroll position so
    // that same point still sits under the anchor afterwards.
    // Cursor-anchored zoom (keep the SVG point under the mouse fixed
    // while zooming, instead of always anchoring to the top-left) was
    // attempted here and reverted: it produced scroll positions that
    // occasionally landed on empty canvas well outside the diagram.
    // This is the simpler, safer version of that idea: instead of
    // anchoring to the mouse, anchor to the centre of whatever is
    // currently visible, and clamp the result to valid scroll range.
    // Without this, zooming out while scrolled deep into the diagram
    // could leave the viewport pointing at space past the now-smaller
    // content -- zoomed out, but showing nothing, with no way back in
    // except manually scrolling blind.
    function zoomTo(newZoom){
      newZoom = Math.max(minZoom, Math.min(2.5, newZoom));
      var oldZ = z;
      var centerX = (wrap.scrollLeft + wrap.clientWidth / 2) / oldZ;
      var centerY = (wrap.scrollTop + wrap.clientHeight / 2) / oldZ;
      z = newZoom;
      apply();
      var maxLeft = Math.max(0, zoomEl.scrollWidth - wrap.clientWidth);
      var maxTop = Math.max(0, zoomEl.scrollHeight - wrap.clientHeight);
      wrap.scrollLeft = Math.max(0, Math.min(maxLeft, centerX * z - wrap.clientWidth / 2));
      wrap.scrollTop = Math.max(0, Math.min(maxTop, centerY * z - wrap.clientHeight / 2));
    }
    function zoomIn(){ zoomTo(z + 0.15); }
    function zoomOut(){ zoomTo(z - 0.15); }
    document.addEventListener("keydown", function(e){
      if(e.key === "Escape" && wrap.classList.contains("open")){ closeTree(); return; }
      // While the diagram modal is open, Ctrl/Cmd +/-/0 should zoom the
      // DIAGRAM, not the whole browser page -- matching what "+/-/Fit"
      // already do with the mouse, just from the keyboard too.
      if(wrap.classList.contains("open") && (e.ctrlKey || e.metaKey)){
        if(e.key === "+" || e.key === "=" || e.key === "Add"){ e.preventDefault(); zoomIn(); }
        else if(e.key === "-" || e.key === "_" || e.key === "Subtract"){ e.preventDefault(); zoomOut(); }
        else if(e.key === "0"){ e.preventDefault(); fitOpen(); centerScroll(); }
      }
    });
    wrap.addEventListener("wheel", function(e){
      if(!wrap.classList.contains("open") || !(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      if(e.deltaY < 0) zoomIn(); else zoomOut();
    }, { passive: false });
    if(zIn) zIn.addEventListener("click", zoomIn);
    if(zOut) zOut.addEventListener("click", zoomOut);
    if(zReset) zReset.addEventListener("click", function(){
      if(wrap.classList.contains("open")){ fitOpen(); centerScroll(); }
      else { fitClosed(); }
    });
    window.addEventListener("resize", function(){
      // Resizing the window re-measures what "fit" means but keeps the
      // zoom the user is currently at (zoomTo only clamps it), rather than
      // snapping the full view back to fit-to-window.
      if(wrap.classList.contains("open")){ measureFit(); zoomTo(z); }
      else fitClosed();
    });
    fitClosed();
  }

  // Dropdowns: every <select> is replaced by the custom one in js/custom-select.js (loaded first).
  var enhanceSelect = window.enhanceSelect;

  /* ---- worksheet: live search, unresolved-only toggle, deepest-level
     chips (all combined with AND logic, moved into a single Filters
     modal so the toolbar stays compact), column-header sorting, a real
     paginated view, and CSV / Excel export. No page reload. ---- */
  var body = document.getElementById("wsBody");
  if(body){
    var rows = Array.prototype.slice.call(body.querySelectorAll("tr"));
    var searchBox = document.getElementById("wsSearch");
    var headerSearch = document.getElementById("globalSearch");
    var tbdBox = document.getElementById("wsTbdOnly");
    var chipContainer = document.getElementById("wsLevelChips");
    var resetBtn = document.getElementById("wsReset");
    var countEl = document.getElementById("wsCount");
    var activeDepth = "all";
    var lastRowCount = rows.length;
    var initialLoadComplete = false;
    var colFilterSelect = document.getElementById("wsColFilterCol");
    var colFilterInput = document.getElementById("wsColFilterValue");
    function rebuildColFilterOptions(){
      var previousValue = colFilterSelect.value;
      colFilterSelect.innerHTML = "";
      var headThs = Array.prototype.slice.call(document.querySelectorAll("#wsHeadRow th[data-col]"));
      var anyOption = document.createElement("option");
      anyOption.value = "";
      anyOption.textContent = "Any column";
      colFilterSelect.appendChild(anyOption);
      headThs.forEach(function(th){
        var option = document.createElement("option");
        option.value = th.getAttribute("data-col");
        option.textContent = th.textContent.replace(/[▲▼]/g, "").trim();
        colFilterSelect.appendChild(option);
      });
      colFilterSelect.value = previousValue;
      if(colFilterSelect.refreshCustomSelect) colFilterSelect.refreshCustomSelect();
    }
    window.dfmeaRebuildColFilterOptions = rebuildColFilterOptions;
    if(colFilterSelect && !colFilterSelect.options.length){
      rebuildColFilterOptions();
    }
    // numeric columns get a numeric comparison (leading number in the
    // cell, so the RPN cells' "45 / 9 x 1 x 5" formula footnote text
    // doesn't get compared as a string); everything else compares as text.
    var NUMERIC_COLS = { 0:1, 6:1, 25:1, 27:1, 28:1, 29:1, 31:1, 32:1 };
    window.dfmeaNumericCols = NUMERIC_COLS;
    var sortCol = null, sortDir = 1;
    var headRow = document.getElementById("wsHeadRow");

    function cellSortValue(tr, col){
      var cell = tr.cells[col];
      if(!cell) return "";
      if(NUMERIC_COLS[col]){
        // RPN cells append a "9 x 1 x 5" footnote via a nested .dep div
        // with no separating whitespace in textContent (e.g. "459 x 1 x 5"),
        // which would make a naive leading-number regex read "459" instead
        // of "45". Strip that footnote out before reading the number.
        var dep = cell.querySelector(".dep");
        var text = dep ? cell.textContent.slice(0, cell.textContent.length - dep.textContent.length) : cell.textContent;
        var match = /-?\d+(\.\d+)?/.exec(text.trim());
        return match ? Number(match[0]) : -Infinity;
      }
      return cell.textContent.trim().toLowerCase();
    }

    function applySort(){
      if(sortCol === null) return;
      rows = Array.prototype.slice.call(body.querySelectorAll("tr"));
      rows.sort(function(a, b){
        var va = cellSortValue(a, sortCol), vb = cellSortValue(b, sortCol);
        if(va < vb) return -1 * sortDir;
        if(va > vb) return 1 * sortDir;
        return 0;
      });
      rows.forEach(function(tr){ body.appendChild(tr); });
    }

    // pagination operates on the rows that already passed the filters,
    // in whatever order sorting left them in.
    var pageSize = 10, currentPage = 1;
    var pageSizeSelect = document.getElementById("wsPageSize");
    var pagePrev = document.getElementById("wsPagePrev");
    var pageNext = document.getElementById("wsPageNext");
    var pageLabel = document.getElementById("wsPageLabel");

    function paginate(visibleRows){
      var size = pageSize === "all" ? visibleRows.length || 1 : pageSize;
      var totalPages = Math.max(1, Math.ceil(visibleRows.length / size));
      currentPage = Math.max(1, Math.min(currentPage, totalPages));
      var start = (currentPage - 1) * size;
      var end = pageSize === "all" ? visibleRows.length : start + size;
      visibleRows.forEach(function(tr, index){
        tr.classList.toggle("pg-hide", index < start || index >= end);
      });
      if(pageLabel) pageLabel.textContent = "Page " + currentPage + " of " + totalPages;
      if(pagePrev) pagePrev.disabled = currentPage <= 1;
      if(pageNext) pageNext.disabled = currentPage >= totalPages;
      return Math.max(0, Math.min(end, visibleRows.length) - start);
    }

    function updateFilterBadge(q, tbdOnly, colFilterActive){
      var badge = document.getElementById("wsFilterBadge");
      if(!badge) return;
      var active = (tbdOnly ? 1 : 0) + (activeDepth !== "all" ? 1 : 0) + (colFilterActive ? 1 : 0);
      badge.textContent = String(active);
      badge.hidden = active === 0;
    }

    function updateSortIndicators(){
      if(!headRow) return;
      Array.prototype.slice.call(headRow.querySelectorAll("th[data-col]")).forEach(function(th){
        var col = Number(th.getAttribute("data-col"));
        th.classList.toggle("sort-asc", col === sortCol && sortDir === 1);
        th.classList.toggle("sort-desc", col === sortCol && sortDir === -1);
      });
    }

    function runFilterPass(){
      var q = ((searchBox && searchBox.value) || (headerSearch && headerSearch.value) || "").trim().toLowerCase();
      var tbdOnly = !!(tbdBox && tbdBox.checked);
      var colFilterCol = colFilterSelect ? colFilterSelect.value : "";
      var colFilterValue = ((colFilterInput && colFilterInput.value) || "").trim().toLowerCase();
      var colFilterActive = colFilterCol !== "" && colFilterValue !== "";
      var visible = [];
      rows.forEach(function(tr){
        var searchable = ((tr.getAttribute("data-search") || "") + " " + tr.textContent).toLowerCase();
        var okSearch = !q || searchable.indexOf(q) !== -1;
        var okTbd = !tbdOnly || tr.getAttribute("data-tbd") === "1";
        var okDepth = activeDepth === "all" || tr.getAttribute("data-depth") === activeDepth;
        var okCol = !colFilterActive || (tr.cells[Number(colFilterCol)] &&
          tr.cells[Number(colFilterCol)].textContent.trim().toLowerCase().indexOf(colFilterValue) !== -1);
        var ok = okSearch && okTbd && okDepth && okCol;
        tr.classList.toggle("hide", !ok);
        if(ok) visible.push(tr);
      });
      return { visible: visible, q: q, tbdOnly: tbdOnly, colFilterActive: colFilterActive };
    }

    function applyFilters(){
      applySort();
      rows = Array.prototype.slice.call(body.querySelectorAll("tr"));
      // If a new row appeared since the last render (a cause was just
      // added or linked from the tree editor), jump to the page that
      // contains it so the edit is immediately visible, not just saved.
      // A jump to whatever page holds the new row only makes sense once
      // the table has actually finished its first render -- otherwise
      // restoring saved local causes on page load looks identical to
      // "a row just got added" and incorrectly dumps the user on the
      // last page instead of starting on page 1.
      var grew = initialLoadComplete && rows.length > lastRowCount;
      var newRow = grew ? rows[rows.length - 1] : null;
      lastRowCount = rows.length;
      var result = runFilterPass();
      // A newly added cause must never silently vanish because a filter
      // set earlier (a level chip, TBD-only, a column filter) happens to
      // exclude it -- that reads as "the table isn't syncing" even though
      // the row is really there. If the fresh row didn't survive the
      // filters, clear whatever is excluding it and filter again.
      if(newRow && result.visible.indexOf(newRow) === -1){
        if(searchBox) searchBox.value = "";
        if(headerSearch) headerSearch.value = "";
        if(tbdBox) tbdBox.checked = false;
        if(colFilterSelect) colFilterSelect.value = "";
        if(colFilterInput) colFilterInput.value = "";
        activeDepth = "all";
        document.querySelectorAll(".lvlchip").forEach(function(c){ c.classList.toggle("on", c.getAttribute("data-depth") === "all"); });
        result = runFilterPass();
      }
      var visible = result.visible;
      if(grew && pageSize !== "all") currentPage = Math.ceil(visible.length / pageSize);
      var shown = paginate(visible);
      if(newRow && visible.indexOf(newRow) !== -1){
        newRow.classList.add("just-added");
        setTimeout(function(){ newRow.classList.remove("just-added"); }, 2600);
      }
      updateFilterBadge(result.q, result.tbdOnly, result.colFilterActive);
      updateSortIndicators();
      if(countEl){
        // "Showing <on this page> of <matching the current filter>", plus
        // the grand total only when a filter is actually narrowing things
        // down -- otherwise that third number would just repeat the
        // second one and add noise instead of information.
        var label = "Showing <b>" + shown + "</b> of <b>" + visible.length + "</b> complete cause path" + (visible.length === 1 ? "" : "s");
        if(visible.length !== rows.length) label += " (<b>" + rows.length + "</b> total)";
        countEl.innerHTML = label;
      }
    }
    if(searchBox) searchBox.addEventListener("input", function(){
      if(headerSearch) headerSearch.value = searchBox.value;
      currentPage = 1;
      applyFilters();
    });
    if(headerSearch){
      headerSearch.addEventListener("input", function(){
        if(searchBox) searchBox.value = headerSearch.value;
        currentPage = 1;
        applyFilters();
      });
      headerSearch.addEventListener("keydown", function(event){
        if(event.key === "Enter"){
          event.preventDefault();
          var worksheetTab = document.querySelector('.tabs .tab[href="#dfmea-worksheet"]');
          if(worksheetTab) worksheetTab.click();
        }
      });
    }
    if(tbdBox) tbdBox.addEventListener("change", function(){ currentPage = 1; applyFilters(); });
    if(chipContainer) chipContainer.addEventListener("click", function(event){
      var chip = event.target.closest(".lvlchip");
      if(chip){
        activeDepth = chip.getAttribute("data-depth");
        document.querySelectorAll(".lvlchip").forEach(function(c){ c.classList.toggle("on", c === chip); });
        currentPage = 1;
        applyFilters();
      }
    });
    if(colFilterSelect) colFilterSelect.addEventListener("change", function(){ currentPage = 1; applyFilters(); });
    if(colFilterInput) colFilterInput.addEventListener("input", function(){ currentPage = 1; applyFilters(); });
    if(resetBtn) resetBtn.addEventListener("click", function(){
      if(searchBox) searchBox.value = "";
      if(headerSearch) headerSearch.value = "";
      if(tbdBox) tbdBox.checked = false;
      if(colFilterSelect) colFilterSelect.value = "";
      if(colFilterInput) colFilterInput.value = "";
      activeDepth = "all";
      document.querySelectorAll(".lvlchip").forEach(function(c){ c.classList.toggle("on", c.getAttribute("data-depth") === "all"); });
      currentPage = 1;
      applyFilters();
    });

    // ---- sortable column headers ----
    if(headRow) headRow.addEventListener("click", function(event){
      var th = event.target.closest("th[data-col]");
      if(!th) return;
      var col = Number(th.getAttribute("data-col"));
      if(sortCol === col) sortDir = -sortDir;
      else { sortCol = col; sortDir = 1; }
      applyFilters();
    });

    // ---- filters modal ----
    var filterModal = document.getElementById("wsFilterModal");
    var filterBtn = document.getElementById("wsFilterBtn");
    var filterClose = document.getElementById("wsFilterClose");
    var filterApply = document.getElementById("wsFilterApply");
    if(filterBtn && filterModal) filterBtn.addEventListener("click", function(){ filterModal.showModal(); });
    if(filterClose && filterModal) filterClose.addEventListener("click", function(){ filterModal.close(); });
    if(filterApply && filterModal) filterApply.addEventListener("click", function(){ filterModal.close(); });
    if(filterModal) filterModal.addEventListener("click", function(event){
      if(event.target === filterModal) filterModal.close();
    });

    // ---- pagination controls ----
    if(pageSizeSelect) pageSizeSelect.addEventListener("change", function(){
      pageSize = pageSizeSelect.value === "all" ? "all" : Number(pageSizeSelect.value);
      currentPage = 1;
      applyFilters();
    });
    if(pagePrev) pagePrev.addEventListener("click", function(){ currentPage--; applyFilters(); });
    if(pageNext) pageNext.addEventListener("click", function(){ currentPage++; applyFilters(); });

    // ---- export dropdown: CSV (current filter + sort) and the full
    // Excel workbook (reuses the same exporter as the top "Export" button
    // so both stay in sync with the worksheet, tree and any local edits) ----
    var exportDD = document.getElementById("wsExportDD");
    var exportBtn = document.getElementById("wsExportBtn");
    var exportMenu = document.getElementById("wsExportMenu");
    var exportCsvBtn = document.getElementById("wsExportCsv");
    var exportXlsxBtn = document.getElementById("wsExportXlsx");
    if(exportBtn && exportMenu) exportBtn.addEventListener("click", function(event){
      event.stopPropagation();
      exportMenu.hidden = !exportMenu.hidden;
    });
    document.addEventListener("click", function(event){
      if(exportMenu && !exportMenu.hidden && exportDD && !exportDD.contains(event.target)) exportMenu.hidden = true;
    });
    function csvCell(text){
      var value = String(text == null ? "" : text).replace(/\s+/g, " ").trim();
      return /[",\n]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value;
    }
    function exportCsv(){
      var headers = Array.prototype.slice.call(headRow.querySelectorAll("th:not(.locate-col)")).map(function(th){
        return th.textContent.replace(/[▲▼]/g, "").trim();
      });
      var visibleRows = Array.prototype.slice.call(body.querySelectorAll("tr")).filter(function(tr){
        return !tr.classList.contains("hide");
      });
      var lines = [headers.map(csvCell).join(",")];
      visibleRows.forEach(function(tr){
        var cells = Array.prototype.slice.call(tr.cells).filter(function(cell){
          return !cell.classList.contains("locate-col");
        }).map(function(cell){
          var clone = cell.cloneNode(true);
          var dep = clone.querySelector(".dep");
          if(dep) dep.remove();
          return clone.textContent;
        });
        lines.push(cells.map(csvCell).join(","));
      });
      var blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "Crimp-DFMEA-Worksheet.csv";
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
    }
    if(exportCsvBtn) exportCsvBtn.addEventListener("click", function(){
      exportCsv();
      exportMenu.hidden = true;
    });
    if(exportXlsxBtn) exportXlsxBtn.addEventListener("click", function(){
      exportMenu.hidden = true;
      var topExportBtn = document.querySelector(".top .btn.acc");
      if(topExportBtn) topExportBtn.click();
    });

    window.refreshDfmeaWorksheet = applyFilters;
    // Restoring previously-saved local causes happens in it1_app.js, which
    // runs after this script and appends rows then calls applyFilters()
    // again on its own -- that second call must not be mistaken for an
    // interactive add either, so the last-page jump stays off until
    // it1_app.js explicitly says its initial restore is done.
    window.wsFinishInitialLoad = function(){ initialLoadComplete = true; };
    applyFilters();
    enhanceSelect(pageSizeSelect);
    enhanceSelect(colFilterSelect);

    // ---------------------------------------------------------------
    // Product variants (TPX50-50, TPX120, ...): each owns its own
    // Occurrence / Current Design Controls / Detection / RPN group of
    // four columns. This is real structural data, not just a header
    // label, so adding one has to touch the colgroup, both header
    // rows, every existing worksheet row, the numeric-sort column set,
    // the column-filter dropdown, risk colouring, and the cause
    // dialog's rating cards -- all driven from one shared list so nothing
    // drifts out of sync with the others.
    // ---------------------------------------------------------------
    function excelColLetter(index){
      var n = index + 1, s = "";
      while(n > 0){ var r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
      return s;
    }
    window.dfmeaColLetter = excelColLetter;
    window.dfmeaVariants = [
      { name: "TPX50-50", occCol: 25, ctrlCol: 26, detCol: 27, rpnCol: 28 },
      { name: "TPX120", occCol: 29, ctrlCol: 30, detCol: 31, rpnCol: 32 }
    ];

    function addVariant(name){
      name = (name || "").trim();
      if(!name) return;
      if(window.dfmeaVariants.some(function(v){ return v.name.toLowerCase() === name.toLowerCase(); })){
        window.alert('A variant named "' + name + '" already exists.');
        return;
      }
      var table = document.querySelector(".source-sheet");
      var colgroup = table.querySelector("colgroup");
      var groupRow = table.querySelector("thead tr.grp");
      var locateGroupTh = groupRow.querySelector(".locate-col");
      var locateHeadTh = headRow.querySelector(".locate-col");
      var startIndex = headRow.cells.length - 1; // insert right before the Locate column

      var cols = colgroup.querySelectorAll("col");
      var lastCol = cols[cols.length - 1];
      [54, 190, 54, 62].forEach(function(width){
        var col = document.createElement("col");
        col.style.width = width + "px";
        colgroup.insertBefore(col, lastCol);
      });

      var groupTh = document.createElement("th");
      groupTh.className = startIndex % 2 ? "g3" : "g4";
      groupTh.colSpan = 4;
      groupTh.setAttribute("data-tip", "Occurrence, current design controls, detection and RPN, rated specifically for the " + name + " terminal variant.");
      groupTh.textContent = name;
      groupRow.insertBefore(groupTh, locateGroupTh);

      var labels = [
        { text: "Occ.", cls: "c", tip: "Sort by occurrence (" + name + ")" },
        { text: "Current Design Controls", cls: "", tip: "Sort by design controls (" + name + ")" },
        { text: "Det.", cls: "c", tip: "Sort by detection (" + name + ")" },
        { text: "RPN", cls: "c", tip: "Sort by RPN (" + name + ")" }
      ];
      var newCols = [];
      labels.forEach(function(l, i){
        var th = document.createElement("th");
        if(l.cls) th.className = l.cls;
        var col = startIndex + i;
        th.setAttribute("data-col", String(col));
        th.setAttribute("data-tip", l.tip);
        th.innerHTML = l.text + '<span class="sortarrow">&#9650;</span>';
        headRow.insertBefore(th, locateHeadTh);
        newCols.push(col);
      });

      Array.prototype.slice.call(document.querySelectorAll("#wsBody tr")).forEach(function(row){
        var locateTd = row.querySelector(".locate-col");
        var sev = Number(row.cells[6].textContent.trim()) || 0;
        var occ = 1, det = 5;
        var rpn = sev * occ * det;
        var occTd = document.createElement("td"); occTd.className = "n"; occTd.textContent = String(occ);
        var ctrlTd = document.createElement("td");
        var detTd = document.createElement("td"); detTd.className = "n"; detTd.textContent = String(det);
        var rpnTd = document.createElement("td"); rpnTd.className = "n rpnc";
        rpnTd.innerHTML = String(rpn) + '<div class="dep">' + sev + ' &times; ' + occ + ' &times; ' + det + '</div>';
        row.insertBefore(occTd, locateTd);
        row.insertBefore(ctrlTd, locateTd);
        row.insertBefore(detTd, locateTd);
        row.insertBefore(rpnTd, locateTd);
      });

      window.dfmeaVariants.push({ name: name, occCol: newCols[0], ctrlCol: newCols[1], detCol: newCols[2], rpnCol: newCols[3] });
      window.dfmeaNumericCols[newCols[0]] = 1;
      window.dfmeaNumericCols[newCols[2]] = 1;
      window.dfmeaNumericCols[newCols[3]] = 1;
      rebuildColFilterOptions();
      if(window.dfmeaRebuildRatingCards) window.dfmeaRebuildRatingCards();
      if(window.refreshDfmeaMetrics) window.refreshDfmeaMetrics();
      applyFilters();
    }
    window.dfmeaAddVariant = addVariant;

    // Small custom dialog instead of the browser's own prompt() box, to
    // stay visually consistent with the rest of the app.
    var variantDialog = document.createElement("dialog");
    variantDialog.className = "cause-editor variant-dialog";
    variantDialog.innerHTML = '<form id="variantForm"><header><h2>Add a product variant</h2>'
      + '<p>Adds its own Occurrence, Detection and RPN columns to the worksheet.</p></header>'
      + '<div class="ce-body"><label class="ce-field">Variant name<input id="variantNameInput" maxlength="40" required placeholder="e.g. TPX200"></label></div>'
      + '<footer><button type="button" id="variantCancel">Cancel</button><button type="submit" class="primary">Add variant</button></footer></form>';
    document.body.appendChild(variantDialog);
    var variantForm = document.getElementById("variantForm");
    var variantNameInput = document.getElementById("variantNameInput");
    document.getElementById("variantCancel").addEventListener("click", function(){ variantDialog.close(); });
    variantDialog.addEventListener("click", function(event){ if(event.target === variantDialog) variantDialog.close(); });
    variantForm.addEventListener("submit", function(event){
      event.preventDefault();
      var name = variantNameInput.value.trim();
      if(!name) return;
      addVariant(name);
      variantDialog.close();
    });
    var addVariantBtn = document.getElementById("wsAddVariantBtn");
    if(addVariantBtn) addVariantBtn.addEventListener("click", function(){
      variantNameInput.value = "";
      variantDialog.showModal();
      variantNameInput.focus();
    });
  }
})();
