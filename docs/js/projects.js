(function(){
  "use strict";
  // page-setup.js overwrites .ttl/.crumb with the dashboard's own title --
  // put this page's real title back afterward.
  var pageTitle = document.querySelector(".ttl");
  if(pageTitle) pageTitle.textContent = "Projects";
  var crumbEl = document.querySelector(".crumb");
  if(crumbEl) crumbEl.innerHTML = 'DFMEA &rsaquo; <b>Projects</b>';

  // Built-in projects with their built-in document counts (kept in sync
  // with KNOWN_PROJECTS in project-detail.js) and a normal lifecycle
  // status, like a real workspace would show.
  var BUILT_IN_PROJECTS = [
    { id: "tak50", name: "TAK50", baseDocs: 4, status: "active",
      description: "Sealed high-current crimped terminal and connector interface for an EV battery system" }
  ];
  var STATUS_LABELS = { active: "Active", draft: "Draft", empty: "No DFMEA yet" };

  function readMyProjects(){
    try{ return JSON.parse(localStorage.getItem("dfmeaMyProjects") || "[]"); }catch(error){ return []; }
  }
  function readMyDocuments(){
    try{ return JSON.parse(localStorage.getItem("dfmeaMyDocuments") || "[]"); }catch(error){ return []; }
  }
  // Older custom projects stored the count text itself as their
  // description -- that's not a real description, so don't show it twice.
  function realDescription(project){
    var d = (project.description != null ? project.description : project.desc) || "";
    return /^\d+ DFMEA documents?$/.test(d) ? "" : d;
  }
  function escapeHtml(value){
    var div = document.createElement("div");
    div.textContent = String(value);
    return div.innerHTML;
  }

  // Every project row is clickable -- nothing in this app is a dead end.
  // A project with no DFMEA yet says so, same as a real tool would right
  // after creating one.
  function rowHtml(project, status, docCount, description){
    var spec = window.DfmeaReqDocs.readAll().filter(function(d){ return d.projectId === project.id; })[0];
    var icon = status === "empty"
      ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>'
      : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>';
    return '<tr data-id="' + escapeHtml(project.id) + '" data-tip="'
      + (status === "empty" ? "Open this project, then use + New DFMEA to add one." : "Open this project") + '">'
      + '<td><div class="data-name"><span class="data-icon' + (status === "empty" ? " empty" : "") + '">' + icon + '</span>'
      + escapeHtml(project.name) + '</div></td>'
      + '<td class="data-muted">' + (description ? escapeHtml(description) : "") + '</td>'
      + '<td>' + (spec ? '<span class="req-standard">' + escapeHtml(spec.standard) + '</span>' : '<span class="spec-none">-</span>') + '</td>'
      + '<td>' + (spec ? '<span class="data-count">' + spec.rows.length + '</span>' : '<span class="spec-none">-</span>') + '</td>'
      + '<td><span class="data-count">' + docCount + '</span></td>'
      + '<td><span class="data-badge ' + status + '">' + STATUS_LABELS[status] + '</span></td>'
      + '</tr>';
  }

  function render(){
    var body = document.getElementById("projTableBody");
    var myDocs = readMyDocuments();
    function createdCount(id){
      return myDocs.filter(function(d){ return d.projectId === id; }).length;
    }
    var html = "";
    BUILT_IN_PROJECTS.forEach(function(p){
      html += rowHtml(p, p.status, p.baseDocs + createdCount(p.id), p.description);
    });
    readMyProjects().forEach(function(p){
      var count = createdCount(p.id);
      html += rowHtml(p, count ? "draft" : "empty", count, realDescription(p));
    });
    body.innerHTML = html;

    Array.prototype.slice.call(body.querySelectorAll("tr")).forEach(function(row){
      row.addEventListener("click", function(){
        window.location.href = "project.html?id=" + encodeURIComponent(row.dataset.id);
      });
    });
  }
  render();
  if(window.TableTools) window.TableTools.attach(document.getElementById("projTableBody").closest("table"), { noun: "projects", placeholder: "Search projects",
    filters: [{ col: 5, label: "All statuses" }] });
  // A project or DFMEA created in another open tab shows up in this table
  // straight away too, the same way it does in the sidebar's project list.
  window.addEventListener("storage", function(event){
    if(event.key === "dfmeaMyProjects" || event.key === "dfmeaMyDocuments") render();
  });
})();
