(function(){
  "use strict";
  var params = new URLSearchParams(window.location.search);
  var projectId = params.get("id") || "";

  // Every document here opens and works -- "Crimp DFMEA" is the one with
  // its own populated data, the rest reuse that same editable structure
  // under their own name/function (exactly like a DFMEA created through
  // New DFMEA does). Function and severity are kept in sync with
  // SEED_OVERRIDES in auth-nav.js, which is what relabels the opened page.
  var KNOWN_PROJECTS = {
    "aster-ev-connector": {
      name: "Aster EV Connector",
      docs: [
        { name: "Crimp DFMEA", refs: ["Tier1_Harness_Routing_DFMEA.xlsx", "Customer_Battery_Terminal_DFMEA.xlsx", "Terminal_Retention_DFMEA_Rev3.xlsx"], fn: "Crimp Contact Resistance", severity: 9, updated: "Today" },
        { name: "Terminal Durability DFMEA", refs: ["Terminal_Retention_DFMEA_Rev3.xlsx", "Crimp Contact Resistance", "Wire_Harness_DFMEA_2023.xlsx"], docId: "seed-terminal-durability", fn: "Terminal Contact Resistance After Cycling", severity: 9, updated: "3 days ago" },
        { name: "Housing Seal Integrity DFMEA", refs: ["Connector_Housing_DFMEA.xlsx", "Headlamp_Housing_Seal_DFMEA.xlsx", "OEM_Connector_Interface_DFMEA.xlsx"], docId: "seed-housing-seal", fn: "Housing Seal Integrity", severity: 7, updated: "6 days ago" },
        { name: "Mating Cycle Durability DFMEA", refs: ["Connector_Housing_DFMEA.xlsx", "Door_Latch_Actuator_DFMEA.xlsx", "Crimp Contact Resistance"], docId: "seed-mating-cycle", fn: "Mating Cycle Durability", severity: 7, updated: "9 days ago" },
        { name: "Connector Lock Retention DFMEA", refs: ["Seat_Belt_Buckle_DFMEA.xlsx", "Door_Latch_Actuator_DFMEA.xlsx", "Terminal_Retention_DFMEA_Rev3.xlsx"], docId: "seed-lock-retention", fn: "Connector Lock Retention", severity: 8, updated: "2 weeks ago" }
      ]
    }
  };

  function readMyProjects(){
    try{ return JSON.parse(localStorage.getItem("dfmeaMyProjects") || "[]"); }catch(error){ return []; }
  }
  function readMyDocuments(){
    try{ return JSON.parse(localStorage.getItem("dfmeaMyDocuments") || "[]"); }catch(error){ return []; }
  }
  function escapeHtml(value){
    var div = document.createElement("div");
    div.textContent = String(value);
    return div.innerHTML;
  }

  var project = KNOWN_PROJECTS[projectId];
  if(!project){
    var custom = readMyProjects().find(function(p){ return p.id === projectId; });
    project = { name: custom ? custom.name : "Unknown project", docs: [] };
  }
  // Documents created through New DFMEA (blank or AI) for this project
  // belong on this list too, not just the built-in ones -- each one
  // really does open (it reuses the one live worksheet, renamed).
  var docs = project.docs.concat(readMyDocuments().filter(function(d){ return d.projectId === projectId; }).map(function(d){
    return {
      name: d.name, docId: d.id, fn: d.function, severity: d.severity,
      refs: d.generatedFrom || [],
      updated: d.mode === "ai" ? "Generated · " + d.createdAt : "Created " + d.createdAt
    };
  }));

  var pageTitle = document.querySelector(".ttl");
  if(pageTitle) pageTitle.textContent = project.name;
  var crumbEl = document.querySelector(".crumb");
  if(crumbEl) crumbEl.innerHTML = 'DFMEA &rsaquo; <a href="projects.html" style="color:inherit">Projects</a> &rsaquo; <b>' + escapeHtml(project.name) + '</b>';

  // The sidebar only lists projects, so this table is where a project's
  // DFMEAs are opened from -- every row goes straight to that document.
  var DOC_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/></svg>';
  function severityChip(value){
    var severity = Number(value);
    if(!Number.isInteger(severity) || severity < 1 || severity > 10) return "";
    var tier = severity >= 9 ? "s-crit" : (severity >= 6 ? "s-high" : "s-low");
    return '<span class="chip ' + tier + '">' + severity + '</span>';
  }
  var tableBody = document.getElementById("docTableBody");
  document.getElementById("docTable").hidden = !docs.length;
  document.getElementById("docEmpty").hidden = docs.length > 0;
  tableBody.innerHTML = docs.map(function(doc){
    return '<tr data-doc-id="' + escapeHtml(doc.docId || "") + '" data-tip="Open this DFMEA">'
      + '<td><div class="data-name"><span class="data-icon">' + DOC_ICON + '</span>' + escapeHtml(doc.name) + '</div></td>'
      + '<td>' + escapeHtml(doc.fn || "") + '</td>'
      + '<td>' + severityChip(doc.severity) + '</td>'
      + '<td class="data-muted">64 causes &middot; 26 paths</td>'
      + '<td><div class="ref-cell">' + window.DfmeaRefs.chipRowHtml((doc.refs || []).map(function(n){ return { name: n }; }), 2, function(item){ return window.DfmeaRefs.dfmeaUrl(item.name); }) + '</div></td>'
      + '<td class="data-muted">' + escapeHtml(doc.updated) + '</td>'
      + '</tr>';
  }).join("");
  Array.prototype.slice.call(tableBody.querySelectorAll("tr")).forEach(function(row){
    row.addEventListener("click", function(){
      var docId = row.dataset.docId;
      window.location.href = "index.html" + (docId ? "?doc=" + encodeURIComponent(docId) : "");
    });
  });

  // A project created through "Create project with AI" has a generated
  // design requirement specification attached to it -- shown below its
  // documents as the same table every other page renders a spec with.
  var reqDoc = window.DfmeaReqDocs.readAll().find(function(r){ return r.projectId === projectId; });
  if(reqDoc){
    document.getElementById("reqSection").hidden = false;
    document.getElementById("reqProduct").textContent = reqDoc.productName;
    document.getElementById("reqStandard").textContent = reqDoc.standard === "None" ? "No specific standard" : reqDoc.standard;
    document.getElementById("reqOpen").href = "requirement-view.html?id=" + encodeURIComponent(reqDoc.id);
    var specRefs = window.DfmeaReqDocs.refsFor(reqDoc);
    if(specRefs.length){
      var builtEl = document.getElementById("reqBuilt");
      builtEl.hidden = false;
      builtEl.innerHTML = '<span class="req-built-label">Built from</span>' + window.DfmeaRefs.chipRowHtml(specRefs, 3, function(item){
        return "requirement-view.html?id=" + encodeURIComponent(item.id);
      });
    }
    document.getElementById("reqSpecs").innerHTML = window.DfmeaReqDocs.specTableHtml(reqDoc.specs, reqDoc);
  }
})();
