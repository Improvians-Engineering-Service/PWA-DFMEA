(function(){
  "use strict";
  var params = new URLSearchParams(window.location.search);
  var projectId = params.get("id") || "";

  // TAK50's own DFMEAs, each starting from the Crimp DFMEA reference.
  var KNOWN_PROJECTS = {
    "tak50": {
      name: "TAK50",
      docs: window.DfmeaRefs.TAK50_DFMEAS.map(function(d){
        return { name: "TAK50 " + d.suffix + " DFMEA", docId: d.id, fn: d.fn, severity: 9, updated: "Today" };
      })
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
  // Documents created through New DFMEA or Create project for this project belong on this list
  // too, not just the built-in one -- each one really does open (it reuses the one live worksheet).
  var docs = project.docs.concat(readMyDocuments().filter(function(d){ return d.projectId === projectId; }).map(function(d){
    return {
      name: d.name, docId: d.id, fn: d.function, severity: d.severity,
      refs: (d.generatedFrom || []).filter(function(n){ return window.DfmeaRefs.legacyInfo(n); }),
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
  tableBody.innerHTML = docs.map(function(doc, index){
    return '<tr data-doc-id="' + escapeHtml(doc.docId || "") + '" data-tip="Open this DFMEA">'
      + '<td>' + (index + 1) + '</td>'
      + '<td><div class="data-name"><span class="data-icon">' + DOC_ICON + '</span>' + escapeHtml(doc.name) + '</div></td>'
      + '<td>' + escapeHtml(doc.fn || "") + '</td>'
      + '<td>' + severityChip(doc.severity) + '</td>'
      + '<td class="data-muted">Starting structure</td>'
      + '<td><div class="ref-cell">' + window.DfmeaRefs.chipRowHtml((doc.refs || window.DfmeaRefs.seedDocRefs(doc.docId) || []).map(function(n){ return { name: n }; }), 1, function(item){ return window.DfmeaRefs.dfmeaUrl(item.name); }) + '</div></td>'
      + '<td><a class="ai-sum" href="' + aiSummaryUrl(doc) + '" target="_blank" onclick="event.stopPropagation()" data-tip="' + escapeHtml(aiSummary(doc)) + '">'
      + window.DfmeaAI.spark + '<span>' + escapeHtml(aiSummary(doc)) + '</span></a></td>'
      + '<td class="data-muted">' + escapeHtml(doc.updated) + '</td>'
      + '</tr>';
  }).join("");
  if(docs.length && window.TableTools){
    window.TableTools.attach(document.getElementById("docTable"), { noun: "DFMEAs", placeholder: "Search DFMEAs",
      filters: [{ col: 3, label: "All severities" }], pageSize: 10 });
  }
  Array.prototype.slice.call(tableBody.querySelectorAll("tr")).forEach(function(row){
    row.addEventListener("click", function(){
      var docId = row.dataset.docId;
      window.location.href = "index.html" + (docId ? "?doc=" + encodeURIComponent(docId) : "");
    });
  });

  // A project's design requirement specification, shown as the same table every other page
  // renders a spec with.
  document.getElementById("docSecN").textContent = "1";
  var reqDoc = window.DfmeaReqDocs.readAll().find(function(r){ return r.projectId === projectId; });
  if(reqDoc){
    document.getElementById("reqSection").hidden = false;
    document.getElementById("docSecN").textContent = "2";
    document.getElementById("reqProduct").textContent = reqDoc.productName;
    document.getElementById("reqStandard").textContent = reqDoc.standard === "None" ? "No specific standard" : reqDoc.standard;
    document.getElementById("reqOpen").href = "requirement-view.html?id=" + encodeURIComponent(reqDoc.id);
    var fileName = window.DfmeaReqDocs.sourceFileFor(reqDoc);
    if(fileName){
      var builtEl = document.getElementById("reqBuilt");
      builtEl.hidden = false;
      builtEl.innerHTML = '<span class="req-built-label">File name</span><span class="np-chip-mini">' + escapeHtml(fileName) + '</span>';
    }
    document.getElementById("reqSpecs").innerHTML = window.DfmeaReqDocs.specTableHtml(reqDoc);
    window.DfmeaReqDocs.enhanceSpecTable(document.getElementById("reqSpecs"), reqDoc);
  }
})();
