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
    "tak50": {
      name: "TAK50",
      docs: [
        { name: "Crimp DFMEA", fn: "Crimp Contact Resistance", severity: 9, updated: "Today" },
        { name: "Terminal Durability DFMEA", docId: "seed-terminal-durability", fn: "Terminal Contact Resistance After Cycling", severity: 9, updated: "3 days ago" },
        { name: "Housing Seal Integrity DFMEA", docId: "seed-housing-seal", fn: "Housing Seal Integrity", severity: 7, updated: "6 days ago" },
        { name: "Mating Cycle Durability DFMEA", docId: "seed-mating-cycle", fn: "Mating Cycle Durability", severity: 7, updated: "9 days ago" },
        { name: "Connector Lock Retention DFMEA", docId: "seed-lock-retention", fn: "Connector Lock Retention", severity: 8, updated: "2 weeks ago" }
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
  // The short AI summary of a document, and the link to its detailed one.
  function aiSummary(doc){ return window.DfmeaAI.dfmeaShort(doc.fn, doc.severity); }
  function aiSummaryUrl(doc){
    return "ai-summary.html?type=dfmea&project=" + encodeURIComponent(projectId) + "&doc=" + encodeURIComponent(doc.docId || "")
      + "&name=" + encodeURIComponent(doc.name) + "&fn=" + encodeURIComponent(doc.fn || "") + "&sev=" + encodeURIComponent(doc.severity || "");
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
      + '<td><div class="ref-cell">' + window.DfmeaRefs.chipRowHtml((doc.refs || window.DfmeaRefs.seedDocRefs(doc.docId) || []).map(function(n){ return { name: n }; }), 1, function(item){ return window.DfmeaRefs.dfmeaUrl(item.name); }) + '</div></td>'
      + '<td><a class="ai-sum" href="' + aiSummaryUrl(doc) + '" target="_blank" onclick="event.stopPropagation()" data-tip="' + escapeHtml(aiSummary(doc)) + '">'
      + window.DfmeaAI.spark + '<span>' + escapeHtml(aiSummary(doc)) + '</span></a></td>'
      + '<td class="data-muted">' + escapeHtml(doc.updated) + '</td>'
      + '</tr>';
  }).join("");
  if(docs.length && window.TableTools){
    window.TableTools.attach(document.getElementById("docTable"), { noun: "DFMEAs", placeholder: "Search DFMEAs",
      filters: [{ col: 2, label: "All severities" }], pageSize: 10 });
  }
  Array.prototype.slice.call(tableBody.querySelectorAll("tr")).forEach(function(row){
    row.addEventListener("click", function(){
      var docId = row.dataset.docId;
      window.location.href = "index.html" + (docId ? "?doc=" + encodeURIComponent(docId) : "");
    });
  });

  // A project created through "Create project with AI" has a generated
  // design requirement specification attached to it -- shown below its
  // documents as the same table every other page renders a spec with.
  document.getElementById("docSecN").textContent = "1";
  var reqDoc = window.DfmeaReqDocs.readAll().find(function(r){ return r.projectId === projectId; });
  if(reqDoc){
    document.getElementById("reqSection").hidden = false;
    document.getElementById("docSecN").textContent = "2";
    document.getElementById("reqProduct").textContent = reqDoc.productName;
    document.getElementById("reqStandard").textContent = reqDoc.standard === "None" ? "No specific standard" : reqDoc.standard;
    document.getElementById("reqOpen").href = "requirement-view.html?id=" + encodeURIComponent(reqDoc.id);
    var specRefs = window.DfmeaReqDocs.dfmeaRefsFor(reqDoc).map(function(n){ return { name: n }; });
    if(specRefs.length){
      var builtEl = document.getElementById("reqBuilt");
      builtEl.hidden = false;
      builtEl.innerHTML = '<span class="req-built-label">References</span>' + window.DfmeaRefs.chipRowHtml(specRefs, 3, function(item){ return window.DfmeaRefs.dfmeaUrl(item.name); });
    }
    document.getElementById("reqSpecs").innerHTML = window.DfmeaReqDocs.specTableHtml(reqDoc.specs, reqDoc);
    window.DfmeaReqDocs.enhanceSpecTable(document.getElementById("reqSpecs"));
  }
})();
