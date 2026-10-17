(function(){
  "use strict";
  // Search, filters, sortable headers and paging for any table, so a long
  // list stays easy to work through. TableTools.attach(table, options) adds
  // a toolbar above the table and a footer below it. It reads the rows that
  // are in the table body, and re-reads them whenever that body is
  // re-rendered, so pages that rebuild their rows keep working unchanged.
  //
  // options:
  //   search      true to add a search box (default true)
  //   placeholder search box placeholder
  //   filters     [{ col: <column index>, label: "All categories" }] one
  //               dropdown per entry, built from the values in that column
  //   noun        what the rows are called in the footer ("requirements")
  //   pageSize    rows per page to start with (default 10)
  //   sortable    header click sorts (default true); a header with
  //               data-nosort is left alone
  function escapeHtml(value){
    var div = document.createElement("div");
    div.textContent = String(value);
    return div.innerHTML;
  }
  function cellText(row, col){
    var cell = row.cells[col];
    return cell ? (cell.getAttribute("data-sort") || cell.textContent).replace(/\s+/g, " ").trim() : "";
  }

  function attach(table, options){
    options = options || {};
    if(table.__tableTools) return table.__tableTools;
    var tbody = table.tBodies[0];
    var headers = Array.prototype.slice.call(table.tHead.rows[0].cells);
    var state = { query: "", filters: {}, sortCol: -1, sortDir: 1, page: 1, pageSize: options.pageSize || 10 };
    var noun = options.noun || "rows";
    var filters = options.filters || [];
    var busy = false;

    var bar = document.createElement("div");
    bar.className = "tt-bar";
    var searchHtml = options.search === false ? "" :
      '<label class="tt-search"><svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>'
      + '<input type="search" placeholder="' + escapeHtml(options.placeholder || "Search " + noun) + '" aria-label="Search ' + escapeHtml(noun) + '">'
      + '</label>';
    bar.innerHTML = searchHtml
      + filters.map(function(f, i){ return '<select class="tt-filter" data-i="' + i + '" aria-label="' + escapeHtml(f.label) + '"></select>'; }).join("")
      + '<button type="button" class="tt-reset" hidden>Clear filters</button><span class="tt-count"></span>';

    var foot = document.createElement("div");
    foot.className = "tt-foot";
    foot.innerHTML = '<span class="tt-range"></span><label class="tt-size">Rows per page <select class="tt-size-sel">'
      + [10, 25, 50, 100].map(function(n){ return '<option value="' + n + '"' + (n === state.pageSize ? " selected" : "") + '>' + n + '</option>'; }).join("")
      + '</select></label><div class="tt-pager"></div>';

    var empty = document.createElement("div");
    empty.className = "tt-empty";
    empty.hidden = true;
    empty.innerHTML = 'No ' + escapeHtml(noun) + ' match this search. <button type="button" class="tt-reset-link">Clear filters</button>';

    table.parentNode.insertBefore(bar, table);
    table.parentNode.insertBefore(empty, table.nextSibling);
    table.parentNode.insertBefore(foot, empty.nextSibling);

    if(options.search === false && !filters.length) bar.hidden = true;
    var searchInput = bar.querySelector(".tt-search input");
    var selects = Array.prototype.slice.call(bar.querySelectorAll(".tt-filter"));
    var resetBtn = bar.querySelector(".tt-reset");
    var countEl = bar.querySelector(".tt-count");
    var rangeEl = foot.querySelector(".tt-range");
    var pagerEl = foot.querySelector(".tt-pager");
    var sizeSel = foot.querySelector(".tt-size-sel");

    function rows(){ return Array.prototype.slice.call(tbody.rows); }

    function buildFilterOptions(){
      selects.forEach(function(sel, i){
        var f = filters[i];
        var seen = [];
        rows().forEach(function(r){
          var v = cellText(r, f.col);
          if(v && seen.indexOf(v) === -1) seen.push(v);
        });
        seen.sort(function(a, b){ return a.localeCompare(b, undefined, { numeric: true }); });
        var current = state.filters[f.col] || "";
        sel.innerHTML = '<option value="">' + escapeHtml(f.label) + '</option>' + seen.map(function(v){
          return '<option value="' + escapeHtml(v) + '"' + (v === current ? " selected" : "") + '>' + escapeHtml(v) + '</option>';
        }).join("");
        if(current && seen.indexOf(current) === -1){ delete state.filters[f.col]; }
      });
    }

    function matches(row){
      if(state.query && row.textContent.toLowerCase().indexOf(state.query) === -1) return false;
      for(var col in state.filters){
        if(state.filters[col] && cellText(row, Number(col)) !== state.filters[col]) return false;
      }
      return true;
    }

    function sortRows(){
      if(state.sortCol < 0) return;
      var all = rows();
      var col = state.sortCol;
      var numeric = all.every(function(r){ var t = cellText(r, col); return t === "" || /^-?\d+(\.\d+)?/.test(t); });
      all.sort(function(a, b){
        var x = cellText(a, col), y = cellText(b, col);
        var r = numeric ? (parseFloat(x) || 0) - (parseFloat(y) || 0) : x.localeCompare(y, undefined, { numeric: true, sensitivity: "base" });
        return r * state.sortDir;
      });
      busy = true;
      all.forEach(function(r){ tbody.appendChild(r); });
      busy = false;
    }

    function render(){
      var all = rows();
      var shown = all.filter(matches);
      var pages = Math.max(1, Math.ceil(shown.length / state.pageSize));
      if(state.page > pages) state.page = pages;
      var start = (state.page - 1) * state.pageSize;
      var pageRows = shown.slice(start, start + state.pageSize);
      all.forEach(function(r){ r.classList.add("tt-hide"); r.classList.remove("tt-last"); });
      pageRows.forEach(function(r){ r.classList.remove("tt-hide"); });
      if(pageRows.length) pageRows[pageRows.length - 1].classList.add("tt-last");

      var filtered = !!state.query || Object.keys(state.filters).some(function(k){ return state.filters[k]; });
      resetBtn.hidden = !filtered;
      countEl.textContent = filtered ? shown.length + " of " + all.length + " " + noun : all.length + " " + noun;
      empty.hidden = shown.length > 0 || all.length === 0;
      table.style.display = shown.length ? "" : "none";
      rangeEl.textContent = shown.length ? "Showing " + (start + 1) + "–" + (start + pageRows.length) + " of " + shown.length : "Showing 0 of " + all.length;
      foot.hidden = all.length <= 10;
      pagerEl.innerHTML = pages < 2 ? "" : pagerHtml(pages);
      headers.forEach(function(h, i){
        h.classList.toggle("tt-sorted", i === state.sortCol);
        h.setAttribute("aria-sort", i === state.sortCol ? (state.sortDir > 0 ? "ascending" : "descending") : "none");
        h.classList.toggle("tt-desc", i === state.sortCol && state.sortDir < 0);
      });
    }

    function pagerHtml(pages){
      var cur = state.page;
      var list = [];
      for(var p = 1; p <= pages; p++){
        if(p === 1 || p === pages || Math.abs(p - cur) <= 1) list.push(p);
        else if(list[list.length - 1] !== "…") list.push("…");
      }
      return '<button type="button" data-go="prev" aria-label="Previous page"' + (cur === 1 ? " disabled" : "") + '>‹</button>'
        + list.map(function(p){
            return p === "…" ? '<span class="tt-gap">…</span>'
              : '<button type="button" data-go="' + p + '"' + (p === cur ? ' class="on" aria-current="page"' : "") + '>' + p + '</button>';
          }).join("")
        + '<button type="button" data-go="next" aria-label="Next page"' + (cur === pages ? " disabled" : "") + '>›</button>';
    }

    function reset(){
      state.query = ""; state.filters = {}; state.page = 1;
      if(searchInput) searchInput.value = "";
      selects.forEach(function(s){ s.value = ""; });
      render();
    }

    if(searchInput) searchInput.addEventListener("input", function(){
      state.query = searchInput.value.trim().toLowerCase();
      state.page = 1;
      render();
    });
    selects.forEach(function(sel, i){
      sel.addEventListener("change", function(){
        state.filters[filters[i].col] = sel.value;
        state.page = 1;
        render();
      });
    });
    resetBtn.addEventListener("click", reset);
    empty.querySelector(".tt-reset-link").addEventListener("click", reset);
    sizeSel.addEventListener("change", function(){ state.pageSize = Number(sizeSel.value); state.page = 1; render(); });
    pagerEl.addEventListener("click", function(event){
      var b = event.target.closest("button[data-go]");
      if(!b || b.disabled) return;
      var go = b.getAttribute("data-go");
      state.page = go === "prev" ? state.page - 1 : go === "next" ? state.page + 1 : Number(go);
      render();
      table.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });

    if(options.sortable !== false){
      headers.forEach(function(h, i){
        if(h.hasAttribute("data-nosort") || !h.textContent.trim()) return;
        h.classList.add("tt-sortable");
        h.tabIndex = 0;
        function sort(){
          if(state.sortCol === i) state.sortDir = -state.sortDir; else { state.sortCol = i; state.sortDir = 1; }
          sortRows();
          render();
        }
        h.addEventListener("click", sort);
        h.addEventListener("keydown", function(event){ if(event.key === "Enter" || event.key === " "){ event.preventDefault(); sort(); } });
      });
    }

    function refresh(){
      buildFilterOptions();
      sortRows();
      render();
    }
    // The page re-renders the body (a search elsewhere, another tab saving
    // data, ...): pick the new rows up without losing the current view.
    new MutationObserver(function(){ if(!busy) refresh(); }).observe(tbody, { childList: true });

    var api = { refresh: refresh, reset: reset };
    table.__tableTools = api;
    refresh();
    return api;
  }

  window.TableTools = { attach: attach };
})();
