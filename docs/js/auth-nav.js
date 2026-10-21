(function(){
  "use strict";
  // Kept separate from the existing page scripts on purpose -- this only
  // wires up login/logout/navigation, so it can't interfere with anything
  // the dashboard's own scripts already do.
  var auth = null;
  try{ auth = JSON.parse(localStorage.getItem("dfmeaAuth") || "null"); }catch(error){ auth = null; }

  if(auth && auth.email){
    var sfoot = document.getElementById("sfootUser");
    var nameEl = sfoot && sfoot.querySelector(".un");
    var roleEl = sfoot && sfoot.querySelector(".ur");
    if(nameEl) nameEl.textContent = auth.email;
    if(roleEl) roleEl.textContent = "Signed in";
    if(sfoot) sfoot.setAttribute("data-tip", "Signed in as " + auth.email);
  }

  var logoutBtn = document.getElementById("logoutBtn");
  if(logoutBtn) logoutBtn.addEventListener("click", function(){
    try{ localStorage.removeItem("dfmeaAuth"); }catch(error){ /* nothing to clean up then */ }
    window.location.href = "login.html";
  });

  var uploadNav = document.getElementById("navUploadData");
  if(uploadNav) uploadNav.addEventListener("click", function(){
    window.location.href = "upload.html";
  });
  var reqSpecsNav = document.getElementById("navReqSpecs");
  if(reqSpecsNav) reqSpecsNav.addEventListener("click", function(){
    window.location.href = "requirement-specs.html";
  });

  // "Projects" (id="navDfmea" in the markup, named for the sidebar slot
  // it occupies) is the one real entry point into the Projects browsing
  // pages, wired here so it works the same on every page that loads it.
  var isDashboard = !!document.getElementById("treeWrap");
  var projectsNav = document.getElementById("navDfmea");
  if(projectsNav) projectsNav.addEventListener("click", function(){
    window.location.href = "projects.html";
  });

  // A DFMEA created through New DFMEA doesn't get its own separate dashboard -- there's only one
  // real, fully-wired worksheet/tree in this build. Instead it reuses THIS SAME page's live,
  // editable structure and just relabels the name/function/breadcrumb. Each created document
  // keeps its own override (keyed by the ?doc= id in the URL) in dfmeaDocOverrides, so visiting
  // index.html plainly (no ?doc=) always shows the real Crimp DFMEA.

  var urlParams = new URLSearchParams(window.location.search);
  var pageName = window.location.pathname.split("/").pop() || "index.html";
  var activeDocId = isDashboard ? urlParams.get("doc") : null;

  function readList(key){
    try{ return JSON.parse(localStorage.getItem(key) || "[]"); }catch(error){ return []; }
  }
  var BUILT_IN_PROJECT_NAMES = { "tak50": "TAK50" };
  function projectName(projectId){
    if(BUILT_IN_PROJECT_NAMES[projectId]) return BUILT_IN_PROJECT_NAMES[projectId];
    var custom = readList("dfmeaMyProjects").find(function(p){ return p.id === projectId; });
    return custom ? custom.name : "";
  }
  // The Crimp DFMEA belongs to TAK50; a document created through New DFMEA or Create project
  // records its own project. Anything else (a legacy worksheet preview) belongs to no project.
  function projectIdForDoc(docId){
    if(!docId) return "tak50";
    var record = readList("dfmeaMyDocuments").find(function(d){ return d.id === docId; });
    return record ? record.projectId : null;
  }

  // Whichever project the CURRENT page belongs to -- the open DFMEA's
  // project on the dashboard, the project itself on its own page -- is
  // marked in the sidebar's project list, so the sidebar and the page
  // never disagree however the visitor got here.
  var currentProjectId = null;
  if(isDashboard) currentProjectId = projectIdForDoc(activeDocId);
  else if(pageName === "project.html") currentProjectId = urlParams.get("id");
  if(currentProjectId){
    var currentProjectLink = Array.prototype.slice.call(document.querySelectorAll(".project-link")).find(function(link){
      return link.getAttribute("data-id") === currentProjectId;
    });
    if(currentProjectLink){
      currentProjectLink.classList.add("on");
      currentProjectLink.setAttribute("aria-current", "page");
    }
  }

  // Back goes one level up from wherever this page sits: a DFMEA (or the
  // New DFMEA form) returns to its project's document list, a project (or
  // the new-project form) returns to the Projects list. The sidebar-less
  // viewer pages carry their own back link, so they're skipped here.
  var backTarget = null;
  if(document.querySelector(".side")){
    if(isDashboard || pageName === "new-dfmea.html"){
      var parentProjectId = isDashboard ? currentProjectId : urlParams.get("project");
      var parentProjectName = parentProjectId ? projectName(parentProjectId) : "";
      backTarget = parentProjectName
        ? { href: "project.html?id=" + encodeURIComponent(parentProjectId), label: "Back to " + parentProjectName }
        : { href: "projects.html", label: "Back to Projects" };
    }else if(pageName === "project.html" || pageName === "new-project.html"){
      backTarget = { href: "projects.html", label: "Back to Projects" };
    }
  }
  var titleBlock = document.querySelector(".top > div:first-child");
  if(backTarget && titleBlock){
    var backBtn = document.createElement("a");
    backBtn.className = "backbtn";
    backBtn.href = backTarget.href;
    backBtn.setAttribute("aria-label", backTarget.label);
    backBtn.setAttribute("data-tip", backTarget.label);
    backBtn.innerHTML = '<svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg><span>Back</span>';
    titleBlock.classList.add("has-back");
    titleBlock.insertBefore(backBtn, titleBlock.firstChild);
  }

  // "New DFMEA" defaults to whichever project this page is already
  // showing, so creating one doesn't force picking the project again when
  // it's already obvious from context.
  var newDfmeaSuffix = currentProjectId ? "?project=" + encodeURIComponent(currentProjectId) : "";
  var newDfmeaBtn = document.getElementById("tabNewDfmeaAi");
  if(newDfmeaBtn) newDfmeaBtn.addEventListener("click", function(){
    window.location.href = "new-dfmea.html" + newDfmeaSuffix;
  });

  var override = null;
  if(activeDocId){
    try{
      override = JSON.parse(localStorage.getItem("dfmeaDocOverrides") || "{}")[activeDocId] || null;
    }catch(error){ override = null; }
  }
  if(override && override.name){
    var titleEl = document.querySelector(".ttl");
    if(titleEl && titleEl.firstChild) titleEl.firstChild.textContent = (override.function || override.name) + " ";
    var crumbEl = document.querySelector(".crumb");
    if(crumbEl){
      var crumbProjectName = currentProjectId ? projectName(currentProjectId) : "";
      crumbEl.textContent = "";
      if(crumbProjectName) crumbEl.appendChild(document.createTextNode(crumbProjectName + " › "));
      crumbEl.appendChild(document.createTextNode(override.name + " › "));
      var crumbLeaf = document.createElement("b");
      crumbLeaf.textContent = "Risk Analysis";
      crumbEl.appendChild(crumbLeaf);
    }
    var wsn = document.querySelector(".wsn");
    if(wsn) wsn.textContent = override.name;

    // The worksheet and risk tree below are the one real dataset in this
    // build, reused under every renamed document -- without this, a
    // document named "Harness Design DFMEA" would still show "Crimp
    // Contact Resistance" as its function throughout the worksheet and
    // diagram, which reads as broken, not as a starting template. This
    // brings the function/failure-mode text that's actually shown
    // everywhere in line with what was typed when the document was made.
    if(override.function){
      // Severity belongs to the failure mode/effect, same for every cause
      // path under it (see the readonly note on the worksheet's own
      // Severity field) -- so one value from the creation form applies to
      // every row here too, exactly like Crimp DFMEA's own severity does.
      var sevValue = Number(override.severity);
      var sevValid = Number.isInteger(sevValue) && sevValue >= 1 && sevValue <= 10;
      var sevTier = sevValue >= 9 ? "s-crit" : (sevValue >= 6 ? "s-high" : "s-low");
      Array.prototype.slice.call(document.querySelectorAll("#wsBody tr")).forEach(function(row){
        if(!row.cells || row.cells.length < 5) return;
        // The Crimp DFMEA has several functions; a renamed copy relabels the first one only.
        if(row.dataset.fm && row.dataset.fm !== "1") return;
        var fnEl = row.cells[2].querySelector(".t1") || row.cells[2];
        fnEl.textContent = override.function;
        row.cells[4].textContent = override.failureMode || override.function;
        if(sevValid){
          var sevChip = row.cells[6].querySelector(".chip");
          if(sevChip){
            sevChip.textContent = sevValue;
            sevChip.className = "chip " + sevTier;
          }
        }
      });
      var fnNode = Array.prototype.slice.call(document.querySelectorAll("#treeZoom .hitbox")).find(function(g){
        var tag = g.querySelector(".ttag");
        return tag && tag.textContent.trim() === "FUNCTION";
      });
      if(fnNode){
        var fnTitle = fnNode.querySelector(".ttl2");
        // Re-wraps to fit the card (same logic page-setup.js uses for
        // every other title) instead of dumping unwrapped text into one
        // line -- a plain textContent assignment here was why renamed
        // function/failure titles longer than the original spilled past
        // the card's right edge.
        if(fnTitle && window.fitSvgCardTitle) window.fitSvgCardTitle(fnTitle, override.function);
        var fnTip = fnNode.getAttribute("data-tip");
        if(fnTip) fnNode.setAttribute("data-tip", fnTip.replace("Crimp Contact Resistance", override.function));
      }
      var fmNode = Array.prototype.slice.call(document.querySelectorAll("#treeZoom .hitbox")).find(function(g){
        var tag = g.querySelector(".ttag");
        return tag && tag.textContent.trim() === "FAILURE MODE";
      });
      if(fmNode){
        var fmTitle = fmNode.querySelector(".ttl2");
        var fmText = override.failureMode || override.function;
        if(fmTitle && window.fitSvgCardTitle) window.fitSvgCardTitle(fmTitle, fmText);
        var fmTip = fmNode.getAttribute("data-tip");
        if(fmTip) fmNode.setAttribute("data-tip", fmTip.replace("Missing or Degraded Function", fmText));
        if(sevValid){
          var fmSub = fmNode.querySelector(".tsub");
          if(fmSub) fmSub.textContent = "Severity " + sevValue;
          var fmTip2 = fmNode.getAttribute("data-tip");
          if(fmTip2) fmNode.setAttribute("data-tip", fmTip2.replace(/Severity \d+/, "Severity " + sevValue));
        }
      }
      if(window.refreshDfmeaMetrics) window.refreshDfmeaMetrics();
    }
  }

  // Surface the project's design requirement specification from right
  // inside the DFMEA itself -- not just a link out, the full table is
  // shown in-page -- so an engineer reading the document can see every
  // requirement it's meant to satisfy without leaving the page.
  if(isDashboard && currentProjectId && window.DfmeaReqDocs){
    var reqDoc = window.DfmeaReqDocs.readAll().find(function(r){ return r.projectId === currentProjectId; });
    var topEl = document.querySelector(".top");
    var contentEl = document.querySelector(".content");
    if(reqDoc && topEl && contentEl){
      var reqLink = document.createElement("a");
      reqLink.id = "viewReqSpecLink";
      reqLink.className = "req-link";
      reqLink.href = "requirement-view.html?id=" + encodeURIComponent(reqDoc.id);
      reqLink.target = "_blank";
      reqLink.textContent = "Open full requirement spec ›";
      topEl.appendChild(reqLink);

      var panel = document.createElement("details");
      panel.id = "reqSpecPanel";
      panel.className = "req-panel";
      var summary = document.createElement("summary");
      summary.appendChild(document.createTextNode("Design requirement specification: " + (reqDoc.specs || []).length + " requirements"));
      var standardChip = document.createElement("span");
      standardChip.className = "req-standard";
      standardChip.textContent = reqDoc.standard === "None" ? "No specific standard" : reqDoc.standard;
      summary.appendChild(standardChip);
      panel.appendChild(summary);
      var panelBody = document.createElement("div");
      panelBody.className = "req-panel-body";
      panelBody.innerHTML = window.DfmeaReqDocs.specTableHtml(reqDoc.specs, reqDoc);
      window.DfmeaReqDocs.enhanceSpecTable(panelBody);
      panel.appendChild(panelBody);
      contentEl.insertBefore(panel, contentEl.firstChild);
    }
  }

  // The legacy DFMEAs this document was built from, so it's clear where
  // its starting structure came from -- including the ones shared with the
  // project, which are listed first and marked External. A legacy
  // worksheet preview is itself a legacy file, so it has none.
  if(isDashboard && window.DfmeaRefs){
    var legacyNames = null;
    if(!activeDocId) legacyNames = window.DfmeaRefs.seedDocRefs("");
    else if(override && override.mode !== "sample") legacyNames = override.generatedFrom || [];
    var contentHost = document.querySelector(".content");
    if(legacyNames && legacyNames.length && contentHost){
      var externalCount = legacyNames.filter(function(n){ var i = window.DfmeaRefs.legacyInfo(n); return i && i.source === "client"; }).length;
      var legacyPanel = document.createElement("details");
      legacyPanel.id = "legacyRefPanel";
      legacyPanel.className = "req-panel";
      var legacySummary = document.createElement("summary");
      legacySummary.appendChild(document.createTextNode("Legacy DFMEA references: " + legacyNames.length));
      if(externalCount){
        var extChip = document.createElement("span");
        extChip.className = "req-standard";
        extChip.textContent = externalCount + " external";
        legacySummary.appendChild(extChip);
      }
      legacyPanel.appendChild(legacySummary);
      var legacyBody = document.createElement("div");
      legacyBody.className = "req-panel-body";
      legacyBody.innerHTML = window.DfmeaRefs.legacyTableHtml(legacyNames);
      legacyPanel.appendChild(legacyBody);
      var specPanelEl = document.getElementById("reqSpecPanel");
      if(specPanelEl) specPanelEl.after(legacyPanel); else contentHost.insertBefore(legacyPanel, contentHost.firstChild);
    }
  }

  // it1_app.js (dashboard only) defines a richer showToast -- this is a
  // minimal fallback so every other page can show the same honest
  // "not available yet" feedback instead of a nav item just doing nothing.
  if(!window.showToast){
    var toastTimer = null;
    window.showToast = function(message){
      var toast = document.getElementById("dfmeaToast");
      if(!toast){
        toast = document.createElement("div");
        toast.id = "dfmeaToast";
        document.body.appendChild(toast);
      }
      toast.textContent = message;
      toast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function(){ toast.classList.remove("show"); }, 2600);
    };
  }

  // Every other sidebar module (Requirements, DVP&R, Reports, Settings...)
  // exists to make this look like a real product, but isn't built out --
  // a nav item with a pointer cursor that silently does nothing on click
  // reads as broken. Giving it the same honest toast as Import Excel and
  // the create-DFMEA stub buttons use is cheap and closes that gap
  // everywhere at once, without having to fake a whole module per click.
  Array.prototype.slice.call(document.querySelectorAll(".side .nav")).forEach(function(item){
    if(item === projectsNav || item.id === "navUploadData" || item.id === "navReqSpecs") return;
    item.addEventListener("click", function(){
      window.showToast(item.textContent.trim() + " isn't available in this preview yet.");
    });
  });
})();
