(function(){
  "use strict";
  // TAK50's DFMEAs are generated starting structures (js/dfmea-slices.js), each a compact cut of
  // the client's Crimp DFMEA, not the whole thing. When one is opened (?doc=<id>), its tree and
  // worksheet replace the full Crimp ones before any other script reads the page.
  var doc = new URLSearchParams(window.location.search).get("doc");
  if(!doc || !window.DfmeaSlices) return;
  var slice = window.DfmeaSlices.filter(function(s){ return s.id === doc; })[0];
  if(!slice){
    try{
      var override = JSON.parse(localStorage.getItem("dfmeaDocOverrides") || "{}")[doc];
      if(override && typeof override.slice === "number") slice = window.DfmeaSlices[override.slice];
    }catch(error){ /* no override -- the full document shows */ }
  }
  if(!slice) return;
  document.getElementById("treeZoom").innerHTML = slice.svg;
  document.getElementById("wsBody").innerHTML = slice.rows;
  // The depth chips are rebuilt from the rows by page-setup.js.
  Array.prototype.slice.call(document.querySelectorAll("#wsLevelChips .lvlchip")).forEach(function(chip){
    if(chip.getAttribute("data-depth") !== "all") chip.remove();
  });
})();
