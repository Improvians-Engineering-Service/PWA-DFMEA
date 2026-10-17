(function(){
  "use strict";
  // Shared by every page that shows what a DFMEA or a requirement spec was
  // built from: a small chip per reference that opens that exact source.

  function escapeHtml(value){
    var div = document.createElement("div");
    div.textContent = String(value);
    return div.innerHTML;
  }
  function slugify(text){
    return String(text).toLowerCase().replace(/\.(xlsx|xls|pdf)$/i, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  // The real Crimp DFMEA opens directly -- every other reference name
  // matches a file in Legacy DFMEA's uploaded-worksheets table, which
  // opens the same way clicking that row there does: seeded once with the
  // same "upload-<slug>" override id data-warehouse.js uses, so the title
  // shown in the opened worksheet matches the reference's name.
  function dfmeaUrl(refName){
    if(refName === "Crimp Contact Resistance") return "index.html";
    var docId = "upload-" + slugify(refName);
    try{
      var map = JSON.parse(localStorage.getItem("dfmeaDocOverrides") || "{}");
      if(!map[docId]){
        // Same trailing-"DFMEA" trim data-warehouse.js uses, so the title
        // doesn't repeat the page's own DFMEA badge right next to it.
        var title = refName.replace(/\.(xlsx|xls|pdf)$/i, "").replace(/[_-]+/g, " ").replace(/\s+dfmea\s*$/i, "").trim();
        map[docId] = { name: title, function: title, failureMode: "Missing or Degraded Function", severity: 9, mode: "sample" };
        localStorage.setItem("dfmeaDocOverrides", JSON.stringify(map));
      }
    }catch(error){ /* override just won't persist -- the reference still opens, unlabeled */ }
    return "worksheet-view.html?doc=" + encodeURIComponent(docId);
  }

  // The legacy DFMEA worksheets shared with the project: the only legacy
  // files kept on file, so nothing else can be mistaken for them. Legacy
  // DFMEA lists them (plus anything uploaded); a DFMEA lists the ones it
  // was built from.
  var LEGACY = [
    { name: "Crimp DFMEA - Page 1.pdf", size: "121 KB", when: "Sep 22, 2026, 5:55 PM", rows: 12, source: "client" },
    { name: "Crimp DFMEA - Page 2.pdf", size: "96 KB", when: "Sep 22, 2026, 5:55 PM", rows: 9, source: "client" },
    { name: "Crimp DFMEA - Page 3.pdf", size: "132 KB", when: "Sep 22, 2026, 5:55 PM", rows: 14, source: "client" },
    { name: "Crimp DFMEA - Page 4.pdf", size: "71 KB", when: "Sep 22, 2026, 5:55 PM", rows: 7, source: "client" },
    { name: "Crimp DFMEA - Page 5.pdf", size: "73 KB", when: "Sep 22, 2026, 5:55 PM", rows: 8, source: "client" },
    { name: "Crimp DFMEA - Page 6.pdf", size: "71 KB", when: "Sep 22, 2026, 5:55 PM", rows: 7, source: "client" },
    { name: "Crimp DFMEA - Page 7.pdf", size: "132 KB", when: "Sep 22, 2026, 5:55 PM", rows: 14, source: "client" },
    { name: "Interface Contact Ressitance Cause & Effect Diagram.pdf", size: "147 KB", when: "Sep 22, 2026, 5:56 PM", rows: 11, source: "client" }
  ];
  function legacyInfo(name){
    return LEGACY.filter(function(f){ return f.name === name; })[0] || null;
  }

  // Which legacy DFMEAs each built-in Aster document was built from
  // ("" is the Crimp DFMEA, which has no ?doc= id).
  var SEED_DOC_REFS = {
    "": ["Crimp DFMEA - Page 1.pdf", "Crimp DFMEA - Page 2.pdf", "Crimp DFMEA - Page 3.pdf", "Crimp DFMEA - Page 4.pdf", "Crimp DFMEA - Page 5.pdf", "Crimp DFMEA - Page 6.pdf", "Crimp DFMEA - Page 7.pdf", "Interface Contact Ressitance Cause & Effect Diagram.pdf"],
    "seed-terminal-durability": ["Crimp DFMEA - Page 2.pdf", "Crimp DFMEA - Page 3.pdf", "Interface Contact Ressitance Cause & Effect Diagram.pdf"],
    "seed-housing-seal": ["Crimp DFMEA - Page 4.pdf", "Crimp DFMEA - Page 5.pdf"],
    "seed-mating-cycle": ["Crimp DFMEA - Page 6.pdf", "Crimp DFMEA - Page 7.pdf", "Interface Contact Ressitance Cause & Effect Diagram.pdf"],
    "seed-lock-retention": ["Crimp DFMEA - Page 5.pdf", "Crimp DFMEA - Page 6.pdf"]
  };
  function seedDocRefs(docId){ return SEED_DOC_REFS[docId || ""] || null; }

  // Table of the legacy DFMEAs a document was built from, external ones
  // first. Names with no uploaded file behind them (the workspace's own
  // reference DFMEA) are listed as that.
  function legacyTableHtml(names){
    var rows = names.map(function(n){
      return { name: n, info: legacyInfo(n) };
    }).sort(function(a, b){
      return (b.info && b.info.source === "client" ? 1 : 0) - (a.info && a.info.source === "client" ? 1 : 0);
    });
    return '<table class="data-table ref-legacy"><thead><tr><th>Legacy DFMEA</th><th>Source</th><th>Rows parsed</th><th>Uploaded</th></tr></thead><tbody>'
      + rows.map(function(r){
          var info = r.info;
          var label = !info ? "Workspace" : (info.source === "client" ? "External" : "Library");
          var cls = !info ? "" : (info.source === "client" ? " client" : "");
          return '<tr><td><a class="ref-legacy-name" href="' + dfmeaUrl(r.name) + '" target="_blank">' + escapeHtml(r.name) + '</a></td>'
            + '<td><span class="uh-source' + cls + '">' + label + '</span></td>'
            + '<td>' + (info ? info.rows + " rows" : "64 rows") + '</td>'
            + '<td class="data-muted">' + (info ? escapeHtml(info.when) : "Reference DFMEA") + '</td></tr>';
        }).join("")
      + '</tbody></table>';
  }

  function chip(label, url){
    return '<a class="np-chip-mini" href="' + url + '" target="_blank" data-tip="Open ' + escapeHtml(label) + '" onclick="event.stopPropagation()">' + escapeHtml(label) + '</a>';
  }
  // Capped, with a "+N" chip (its own tooltip listing the rest) so a long
  // match list never turns the cell into another list to read.
  function chipRowHtml(items, cap, toUrl){
    if(!items.length) return "";
    var shown = items.slice(0, cap).map(function(item){ return chip(item.name, toUrl(item)); }).join("");
    if(items.length > cap){
      var rest = items.slice(cap).map(function(item){ return item.name; }).join(", ");
      shown += '<span class="np-chip-mini" data-tip="' + escapeHtml(rest) + '">+' + (items.length - cap) + '</span>';
    }
    return shown;
  }

  window.DfmeaRefs = { dfmeaUrl: dfmeaUrl, chipRowHtml: chipRowHtml, LEGACY: LEGACY, legacyInfo: legacyInfo, seedDocRefs: seedDocRefs, legacyTableHtml: legacyTableHtml };
})();
