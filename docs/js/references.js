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
    return String(text).toLowerCase().replace(/\.(xlsx|xls)$/i, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
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
        var title = refName.replace(/\.(xlsx|xls)$/i, "").replace(/[_-]+/g, " ").replace(/\s+dfmea\s*$/i, "").trim();
        map[docId] = { name: title, function: title, failureMode: "Missing or Degraded Function", severity: 9, mode: "sample" };
        localStorage.setItem("dfmeaDocOverrides", JSON.stringify(map));
      }
    }catch(error){ /* override just won't persist -- the reference still opens, unlabeled */ }
    return "worksheet-view.html?doc=" + encodeURIComponent(docId);
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

  window.DfmeaRefs = { dfmeaUrl: dfmeaUrl, chipRowHtml: chipRowHtml };
})();
