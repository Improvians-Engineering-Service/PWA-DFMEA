(function(){
  "use strict";
  // Shared storage for every design requirement specification: the three that come from the
  // Excel files on record (js/req-defaults.js, copied column for column and row for row), plus
  // every one created through "Create project" or uploaded. Kept in one place so editing a spec
  // on the viewer page, listing it on the Design Requirements page and showing it on a project's
  // page all agree.
  //
  // A spec is a table: { id, projectId, productName, standard, createdAt, sourceFile,
  //   title, columns: [header, ...], rows: [[cell, ...], ...], notes: [[a, b], ...] }.
  var KEY = "dfmeaRequirementDocs";
  var DEFAULTS_VERSION_KEY = "dfmeaRequirementDocsDefaultsVersion";
  var DEFAULTS_VERSION = "11";

  function clone(value){ return JSON.parse(JSON.stringify(value)); }
  function defaults(){ return clone(window.DfmeaReqDefaults || []); }
  function isDefaultId(id){ return /^default-\d+$/.test(id); }

  function escapeHtml(value){
    var div = document.createElement("div");
    div.textContent = String(value);
    return div.innerHTML;
  }
  // A requirement typed in as one line, "Category — requirement text" (an older stored spec, or
  // one extracted from an uploaded document), becomes a two-column Category / Requirement table.
  function splitSpec(spec){
    var match = /^([A-Za-z][A-Za-z &\/-]{1,24}) — ([\s\S]+)$/.exec(String(spec));
    return match ? [match[1], match[2]] : ["General", String(spec)];
  }
  function normalize(doc){
    if(!doc.columns){
      doc.columns = ["Category", "Requirement"];
      doc.rows = (doc.specs || []).map(splitSpec);
    }
    delete doc.specs;
    return doc;
  }

  function save(list){
    try{ localStorage.setItem(KEY, JSON.stringify(list)); }catch(error){ /* storage unavailable */ }
  }
  function readAll(){
    var list;
    try{ list = JSON.parse(localStorage.getItem(KEY) || "null"); }catch(error){ list = null; }
    var fresh = defaults();
    if(!list){
      list = fresh;
      save(list);
      try{ localStorage.setItem(DEFAULTS_VERSION_KEY, DEFAULTS_VERSION); }catch(error){ /* storage unavailable */ }
    }else{
      var storedVersion = null;
      try{ storedVersion = localStorage.getItem(DEFAULTS_VERSION_KEY); }catch(error){ storedVersion = null; }
      if(storedVersion !== DEFAULTS_VERSION){
        // The built-in specs are replaced by the current ones; anything a person created or
        // uploaded stays.
        list = fresh.concat(list.filter(function(d){ return !isDefaultId(d.id); }));
        save(list);
        try{ localStorage.setItem(DEFAULTS_VERSION_KEY, DEFAULTS_VERSION); }catch(error){ /* storage unavailable */ }
      }
    }
    return list.map(normalize);
  }
  function getById(id){
    return readAll().find(function(d){ return d.id === id; }) || null;
  }
  function update(id, patch){
    var list = readAll();
    var doc = list.find(function(d){ return d.id === id; });
    if(!doc) return false;
    Object.keys(patch).forEach(function(key){ doc[key] = patch[key]; });
    save(list);
    return true;
  }
  function add(doc){
    var list = readAll();
    list.push(doc);
    save(list);
  }

  // ---------------------------------------------------------------- reading a spec
  function categoryIndex(doc){
    var i = doc.columns.findIndex(function(c){ return /^category$/i.test(c.trim()); });
    return i < 0 ? 0 : i;
  }
  // The distinct categories a spec covers, in the order they first appear.
  function categoriesOf(doc){
    var col = categoryIndex(doc), out = [];
    doc.rows.forEach(function(r){
      var c = r[col];
      if(c && out.indexOf(c) === -1) out.push(c);
    });
    return out;
  }
  function rowsText(doc){
    return doc.rows.map(function(r){ return r.join(" ").toLowerCase(); }).join(" ");
  }
  function sourceFileFor(doc){ return doc.sourceFile || ""; }
  // The value in the first column whose header matches, for one row.
  function field(doc, row, re){
    var i = doc.columns.findIndex(function(c){ return re.test(c); });
    return i < 0 ? "" : (row[i] || "");
  }

  // ---------------------------------------------------------------- rendering
  var SPARK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M19.967 17.484A4 4 0 0 1 18 18"/></svg>';

  // The one way a specification is rendered everywhere it appears: every column of the table,
  // exactly as written, plus a small AI-summary icon at the end of each row.
  // The Crimp DFMEA covers the crimped joint: crimping, wire pull-out and strain relief, terminal
  // retention and contact resistance. A requirement about any of these cites it.
  var CRIMP_TOPICS = /crimp|contact resistance|resistance after conditioning|terminal retention|wire pull|strain relief|seal.?wire|pull.?force/i;
  function usesCrimp(doc, row){
    var name = field(doc, row, /^(test|requirement)/i);
    var category = row[categoryIndex(doc)] || "";
    return CRIMP_TOPICS.test(name + " " + category);
  }
  // Where the Reference DFMEA column goes: the position just after "Reference / source".
  function refColumn(doc){
    var i = doc.columns.findIndex(function(c){ return /reference\s*\/\s*source/i.test(c); });
    return i < 0 ? 1 : i + 1;
  }
  function specTableHtml(doc){
    var cat = categoryIndex(doc);
    // The legacy DFMEA this specification was generated with.
    var refName = window.DfmeaRefs && window.DfmeaRefs.LEGACY[0] ? window.DfmeaRefs.LEGACY[0].name : "";
    var chip = refName ? window.DfmeaRefs.chipRowHtml([{ name: refName }], 1, function(item){ return window.DfmeaRefs.dfmeaUrl(item.name); }) : "";
    // The reference DFMEA sits beside the "Reference / source" column when the sheet has one,
    // otherwise beside the first column.
    var refPos = refColumn(doc);
    var head = doc.columns.map(function(c, i){
      return (i === refPos && refName ? '<th class="spec-ref-cell">Reference DFMEA</th>' : "")
        + '<th' + (i === cat ? ' class="spec-cat-cell"' : "") + '>' + escapeHtml(c) + '</th>';
    }).join("") + '<th class="spec-ai-cell" data-nosort>AI summary</th>';
    if(refName && doc.columns.length === 1) head = head.replace('<th class="spec-ai-cell"', '<th class="spec-ref-cell">Reference DFMEA</th><th class="spec-ai-cell"');
    var body = doc.rows.map(function(r, index){
      // Only a requirement the Crimp DFMEA actually speaks to cites it; the rest show a dash.
      var refCell = refName ? '<td class="spec-ref-cell">' + (usesCrimp(doc, r) ? chip : '<span class="spec-none">-</span>') + '</td>' : "";
      return '<tr>' + r.map(function(v, i){
        var cell = i === cat
          ? '<td class="spec-cat-cell"><span class="spec-cat" data-cat="' + escapeHtml(String(v).toLowerCase()) + '">' + escapeHtml(v) + '</span></td>'
          : '<td>' + escapeHtml(v) + '</td>';
        return (i === refPos ? refCell : "") + cell;
      }).join("") + (doc.columns.length === 1 ? refCell : "")
        + '<td class="spec-ai-cell"><a class="ai-link" href="ai-summary.html?type=spec&id=' + encodeURIComponent(doc.id) + '&row=' + (index + 1)
        + '" target="_blank" aria-label="AI summary" data-tip="Open the AI summary for this requirement">' + SPARK + '</a></td></tr>';
    }).join("");
    return '<div class="spec-scroll"><table class="spec-table spec-wide" data-cols="' + doc.columns.length + '"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }
  // A second table of notes (the Sources & Notes sheet), if the spec has one.
  function notesHtml(doc){
    if(!doc.notes || !doc.notes.length) return "";
    var linkify = function(text){
      return escapeHtml(text).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    };
    return '<table class="spec-table spec-notes"><thead><tr>' + doc.notes[0].map(function(c){ return '<th>' + escapeHtml(c) + '</th>'; }).join("") + '</tr></thead><tbody>'
      + doc.notes.slice(1).map(function(r){ return '<tr>' + r.map(function(v){ return '<td>' + linkify(v) + '</td>'; }).join("") + '</tr>'; }).join("")
      + '</tbody></table>';
  }

  // Adds search, a category filter, sorting and paging to a spec table rendered inside
  // `container` (a no-op if TableTools isn't on the page).
  function enhanceSpecTable(container, doc){
    var table = container && container.querySelector("table.spec-wide");
    if(!table || !window.TableTools) return;
    window.TableTools.attach(table, { noun: "requirements", placeholder: "Search requirements",
      filters: [{ col: categoryIndex(doc) + (categoryIndex(doc) >= refColumn(doc) && window.DfmeaRefs ? 1 : 0), label: "All categories" }], pageSize: 10 });
  }

  // ---------------------------------------------------------------- download
  function csv(doc){
    var cell = function(v){ var s = String(v == null ? "" : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return [doc.columns].concat(doc.rows).map(function(r){ return r.map(cell).join(","); }).join("\r\n");
  }

  window.DfmeaReqDocs = { readAll: readAll, getById: getById, update: update, add: add, specTableHtml: specTableHtml,
    notesHtml: notesHtml, enhanceSpecTable: enhanceSpecTable, categoriesOf: categoriesOf, categoryIndex: categoryIndex,
    rowsText: rowsText, sourceFileFor: sourceFileFor, field: field, csv: csv, splitSpec: splitSpec, spark: SPARK };
})();
