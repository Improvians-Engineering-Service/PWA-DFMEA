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

  // A legacy file opens in the worksheet viewer the same way clicking its row in Legacy DFMEA
  // does: seeded once with the same "upload-<slug>" override id data-warehouse.js uses, so the
  // title shown in the opened worksheet matches the file's name.
  function dfmeaUrl(refName){
    var docId = "upload-" + slugify(refName);
    try{
      var map = JSON.parse(localStorage.getItem("dfmeaDocOverrides") || "{}");
      if(!map[docId]){
        // Same trailing-"DFMEA" trim data-warehouse.js uses, so the title doesn't repeat the
        // page's own DFMEA badge right next to it.
        var title = refName.replace(/\.(xlsx|xls|pdf)$/i, "").replace(/[_-]+/g, " ").replace(/\s+dfmea\s*$/i, "").trim();
        map[docId] = { name: title, mode: "sample" };
        localStorage.setItem("dfmeaDocOverrides", JSON.stringify(map));
      }
    }catch(error){ /* override just won't persist -- the reference still opens, unlabeled */ }
    return "worksheet-view.html?doc=" + encodeURIComponent(docId);
  }

  // The legacy DFMEA the client shared: the six scanned pages of their Crimp DFMEA, merged into
  // one file. It is the only legacy file on record, so every reference in the app points at it.
  var LEGACY = [
    { name: "Crimp DFMEA.xlsx", size: "563 KB", when: "Sep 22, 2026, 5:55 PM", rows: 177, structure: "390 causes · 177 paths", source: "client" }
  ];
  function legacyInfo(name){
    return LEGACY.filter(function(f){ return f.name === name; })[0] || null;
  }

  // What the merged Crimp DFMEA contains (the numbers the diagram and worksheet show).
  var CRIMP = {
    causes: 390,
    paths: 177,
    depth: 12,
    functionLabel: "Crimp Contact Resistance +5 more"
  };
  var CRIMP_STRUCTURE = CRIMP.causes + " causes across " + CRIMP.paths + " paths, up to " + CRIMP.depth + " levels deep";

  // TAK50's own DFMEAs, one per area of its requirements. Each starts from the Crimp DFMEA
  // (the legacy file) as its reference. The id is what ?doc= carries.
  var TAK50_DFMEAS = [
    { id: "tak50-crimp", suffix: "Crimp", fn: "Crimp Dimensions and Pull Force" },
    { id: "tak50-contact-resistance", suffix: "Contact Resistance", fn: "Contact Resistance" },
    { id: "tak50-mating", suffix: "Mating and Insertion", fn: "Mating Durability and Insertion Force" },
    { id: "tak50-temperature", suffix: "Operating Temperature", fn: "Operating Temperature Range" }
  ];
  // The legacy files a built-in TAK50 DFMEA was built from.
  function seedDocRefs(docId){
    return TAK50_DFMEAS.some(function(d){ return d.id === docId; }) ? [LEGACY[0].name] : null;
  }

  // The legacy files a document was built from.
  function legacyTableHtml(names){
    return '<table class="data-table ref-legacy"><thead><tr><th>Legacy DFMEA</th><th>Rows parsed</th><th>Uploaded</th></tr></thead><tbody>'
      + names.map(function(n){
          var info = legacyInfo(n);
          return '<tr><td><a class="ref-legacy-name" href="' + dfmeaUrl(n) + '" target="_blank">' + escapeHtml(n) + '</a></td>'
            + '<td>' + (info ? info.rows + " rows" : "") + '</td>'
            + '<td class="data-muted">' + (info ? escapeHtml(info.when) : "") + '</td></tr>';
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

  window.DfmeaRefs = { dfmeaUrl: dfmeaUrl, chipRowHtml: chipRowHtml, LEGACY: LEGACY, legacyInfo: legacyInfo, seedDocRefs: seedDocRefs,
    legacyTableHtml: legacyTableHtml, TAK50_DFMEAS: TAK50_DFMEAS, CRIMP: CRIMP, CRIMP_STRUCTURE: CRIMP_STRUCTURE };
})();
