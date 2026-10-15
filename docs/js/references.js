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

  // The legacy DFMEA worksheets already on file: ones shared from outside
  // this workspace ("client" source key, shown as External, kept first) and
  // this workspace's own library. Legacy DFMEA lists them; a DFMEA lists
  // the ones it was built from.
  var LEGACY = [
    { name: "OEM_Connector_Interface_DFMEA.xlsx", size: "224 KB", when: "Jul 18, 2025, 2:45 PM", rows: 64, source: "client" },
    { name: "Customer_Battery_Terminal_DFMEA.xlsx", size: "196 KB", when: "Aug 5, 2025, 10:12 AM", rows: 52, source: "client" },
    { name: "Tier1_Harness_Routing_DFMEA.xlsx", size: "178 KB", when: "Sep 12, 2025, 3:30 PM", rows: 47, source: "client" },
    { name: "Sensor_Bracket_DFMEA.xlsx", size: "142 KB", when: "Mar 28, 2024, 10:33 AM", rows: 33, source: "library" },
    { name: "Busbar_Joint_DFMEA.xlsx", size: "198 KB", when: "Jun 5, 2024, 2:10 PM", rows: 55, source: "library" },
    { name: "Wire_Harness_DFMEA_2023.xlsx", size: "156 KB", when: "Aug 19, 2024, 11:20 AM", rows: 39, source: "library" },
    { name: "Connector_Housing_DFMEA.xlsx", size: "211 KB", when: "Nov 2, 2024, 3:45 PM", rows: 61, source: "library" },
    { name: "Terminal_Retention_DFMEA_Rev3.xlsx", size: "184 KB", when: "Jan 14, 2025, 9:02 AM", rows: 48, source: "library" },
    { name: "Battery_Tray_Mounting_DFMEA.xlsx", size: "167 KB", when: "Feb 7, 2025, 1:18 PM", rows: 42, source: "library" },
    { name: "Coolant_Hose_Fitting_DFMEA.xlsx", size: "129 KB", when: "Mar 3, 2025, 9:54 AM", rows: 27, source: "library" },
    { name: "PCB_Connector_Interface_DFMEA.xlsx", size: "203 KB", when: "Mar 21, 2025, 4:02 PM", rows: 58, source: "library" },
    { name: "Door_Latch_Actuator_DFMEA.xlsx", size: "176 KB", when: "Apr 9, 2025, 10:47 AM", rows: 45, source: "library" },
    { name: "Seat_Belt_Buckle_DFMEA.xlsx", size: "151 KB", when: "Apr 30, 2025, 2:36 PM", rows: 36, source: "library" },
    { name: "Headlamp_Housing_Seal_DFMEA.xlsx", size: "188 KB", when: "May 16, 2025, 11:09 AM", rows: 50, source: "library" },
    { name: "Charging_Port_Cover_DFMEA.xlsx", size: "160 KB", when: "Jun 2, 2025, 3:27 PM", rows: 38, source: "library" }
  ];
  function legacyInfo(name){
    return LEGACY.filter(function(f){ return f.name === name; })[0] || null;
  }

  // Which legacy DFMEAs each built-in Aster document was built from
  // ("" is the Crimp DFMEA, which has no ?doc= id).
  var SEED_DOC_REFS = {
    "": ["OEM_Connector_Interface_DFMEA.xlsx", "Tier1_Harness_Routing_DFMEA.xlsx", "Customer_Battery_Terminal_DFMEA.xlsx", "Terminal_Retention_DFMEA_Rev3.xlsx"],
    "seed-terminal-durability": ["Customer_Battery_Terminal_DFMEA.xlsx", "Terminal_Retention_DFMEA_Rev3.xlsx", "Crimp Contact Resistance", "Wire_Harness_DFMEA_2023.xlsx"],
    "seed-housing-seal": ["OEM_Connector_Interface_DFMEA.xlsx", "Connector_Housing_DFMEA.xlsx", "Headlamp_Housing_Seal_DFMEA.xlsx"],
    "seed-mating-cycle": ["Tier1_Harness_Routing_DFMEA.xlsx", "Connector_Housing_DFMEA.xlsx", "Door_Latch_Actuator_DFMEA.xlsx", "Crimp Contact Resistance"],
    "seed-lock-retention": ["OEM_Connector_Interface_DFMEA.xlsx", "Seat_Belt_Buckle_DFMEA.xlsx", "Door_Latch_Actuator_DFMEA.xlsx", "Terminal_Retention_DFMEA_Rev3.xlsx"]
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
