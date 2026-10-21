(function(){
  "use strict";

  // page-setup.js overwrites .crumb/.ttl with the dashboard's own title --
  // this page sets its own right after, same pattern as new-dfmea.js.
  var crumbEl = document.querySelector(".crumb");
  if(crumbEl) crumbEl.innerHTML = 'DFMEA &rsaquo; <a href="projects.html" style="color:inherit">Projects</a> &rsaquo; <b>New Project</b>';
  var pageTitle = document.querySelector(".ttl");
  if(pageTitle) pageTitle.textContent = "Create a new project";

  var nameInput = document.getElementById("npName");
  var descInput = document.getElementById("npDesc");
  var standardInput = document.getElementById("npStandard");

  // Every standard already in use across the Design Requirement
  // Specification library, not a fixed short list -- one added there
  // (or via an uploaded spec document) shows up as a choice here too,
  // instead of staying out of sync with what the library actually has.
  (function populateStandards(){
    var fromLibrary = [];
    try{
      fromLibrary = window.DfmeaReqDocs.readAll()
        .map(function(d){ return d.standard; })
        .filter(function(s){ return s && s !== "None"; });
    }catch(error){ /* falls back to the defaults below */ }
    var standards = Array.from(new Set(fromLibrary.concat(["LV214", "USCAR-2"]))).sort();
    standardInput.innerHTML = standards.map(function(s){
      return '<option value="' + escapeHtml(s) + '">' + escapeHtml(s) + '</option>';
    }).join("");
    standardInput.value = "LV214";
  })();

  // Every design requirement specification on file: the project gets a copy of the one picked
  // here (TAK50's own by default), with the same columns and rows.
  var specInput = document.getElementById("npSpec");
  (function populateSpecs(){
    var docs = [];
    try{ docs = window.DfmeaReqDocs.readAll(); }catch(error){ /* nothing to pick from */ }
    specInput.innerHTML = docs.map(function(d){
      var label = d.standard === "None" ? d.productName : d.standard + " · " + d.productName;
      return '<option value="' + escapeHtml(d.id) + '">' + escapeHtml(label) + '</option>';
    }).join("");
    var own = docs.filter(function(d){ return d.projectId === "tak50"; })[0] || docs[0];
    if(own) specInput.value = own.id;
    // Choosing a spec also sets the standard it was written to.
    specInput.addEventListener("change", function(){
      var picked = specInput.value && window.DfmeaReqDocs.getById(specInput.value);
      if(picked && Array.prototype.some.call(standardInput.options, function(o){ return o.value === picked.standard; })){
        standardInput.value = picked.standard;
      }
    });
    specInput.dispatchEvent(new Event("change"));
  })();
  var step1 = document.getElementById("npStep1");
  var step2 = document.getElementById("npStep2");
  var step3 = document.getElementById("npStep3");
  function showStep(step){
    [step1, step2, step3].forEach(function(s){ s.classList.remove("on"); });
    step.classList.add("on");
  }

  document.getElementById("npCancel").addEventListener("click", function(){
    window.location.href = "projects.html";
  });

  // Same built-in project list projects.js uses, kept in sync, so the
  // duplicate-name check here means the same thing it does there.
  var BUILT_IN_PROJECT_NAMES = [];
  function readMyProjects(){
    try{ return JSON.parse(localStorage.getItem("dfmeaMyProjects") || "[]"); }catch(error){ return []; }
  }
  function existingProjectNames(){
    return BUILT_IN_PROJECT_NAMES.concat(readMyProjects().map(function(p){ return p.name; }));
  }

  function escapeHtml(value){
    var div = document.createElement("div");
    div.textContent = String(value);
    return div.innerHTML;
  }
  function wordsOf(text){
    return (text || "").toLowerCase().match(/[a-z0-9]+/g) || [];
  }
  function sharesWord(a, b){
    var setB = new Set(wordsOf(b));
    return wordsOf(a).some(function(w){ return w.length > 3 && setB.has(w); });
  }

  // The customer's own files matching draws on to find which ones fit the
  // product description: exactly the worksheets listed on the Legacy DFMEA
  // page, nothing else. Shown as References on the results screen.
  var REFERENCE_DOCS = window.DfmeaRefs.LEGACY;
  function severityChip(severity){
    if(!severity) return "";
    var tier = severity >= 9 ? "s-crit" : (severity >= 6 ? "s-high" : "s-low");
    return '<span class="chip ' + tier + '">' + severity + '</span>';
  }

  function validateStep1(){
    var ok = true;
    var name = nameInput.value.trim();
    var nameField = document.getElementById("npNameField");
    var nameErr = document.getElementById("npNameErr");
    var duplicate = !!name && existingProjectNames().some(function(n){ return n.toLowerCase() === name.toLowerCase(); });
    var nameOk = !!name && !duplicate;
    nameErr.textContent = !name ? "Give this project a name." : "A project named “" + name + "” already exists.";
    nameField.classList.toggle("has-err", !nameOk);
    nameInput.classList.toggle("err", !nameOk);
    if(!nameOk) ok = false;

    var descField = document.getElementById("npDescField");
    var descOk = descInput.value.trim().length > 0;
    descField.classList.toggle("has-err", !descOk);
    descInput.classList.toggle("err", !descOk);
    if(!descOk) ok = false;

    return ok;
  }
  [nameInput, descInput].forEach(function(input){
    input.addEventListener("input", function(){
      var field = input.closest(".nd-field");
      field.classList.remove("has-err");
      input.classList.remove("err");
    });
  });

  function makeDocId(){ return "doc-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function saveDocRecord(record){
    try{
      var list = JSON.parse(localStorage.getItem("dfmeaMyDocuments") || "[]");
      list.push(record);
      localStorage.setItem("dfmeaMyDocuments", JSON.stringify(list));
    }catch(error){ /* storage unavailable -- the flow still works, just won't be listed anywhere */ }
  }
  function saveOverride(id, override){
    try{
      var map = JSON.parse(localStorage.getItem("dfmeaDocOverrides") || "{}");
      map[id] = override;
      localStorage.setItem("dfmeaDocOverrides", JSON.stringify(map));
    }catch(error){ /* override just won't persist -- navigation still works */ }
  }
  function saveRequirementDoc(doc){
    try{
      window.DfmeaReqDocs.add(doc);
    }catch(error){ /* storage unavailable -- the project still works, just has no spec card */ }
  }
  function saveProject(project){
    try{
      var list = readMyProjects();
      list.push(project);
      localStorage.setItem("dfmeaMyProjects", JSON.stringify(list));
      sessionStorage.setItem("dfmeaJustCreatedProjectId", project.id);
    }catch(error){ /* storage unavailable -- the flow still works, just won't be listed */ }
  }

  document.getElementById("npStep1Next").addEventListener("click", function(){
    if(!validateStep1()){
      document.querySelector(".nd-field.has-err input, .nd-field.has-err textarea").focus();
      return;
    }
    showStep(step2);
    runGenerate();
  });

  function runGenerate(){
    var fill = document.getElementById("npProgressFill");
    var label = document.getElementById("npProgressLabel");
    var steps = [
      [20, "Analysing product description..."],
      [45, "Matching related DFMEAs in this workspace..."],
      [70, "Generating design requirement specification..."],
      [95, "Building DFMEA structures for each function..."],
      [100, "Finishing up..."]
    ];
    var i = 0;
    fill.style.width = "0%";
    (function tick(){
      if(i >= steps.length){
        setTimeout(finish, 350);
        return;
      }
      fill.style.width = steps[i][0] + "%";
      label.textContent = steps[i][1];
      i++;
      setTimeout(tick, 420);
    })();
  }

  function finish(){
    var name = nameInput.value.trim();
    var description = descInput.value.trim();
    var standard = standardInput.value;
    var projectId = "custom-" + Date.now().toString(36);

    // --- requirement specification: a copy of the chosen one, column for column ---
    var chosen = window.DfmeaReqDocs.getById(specInput.value);
    var reqDocRecord = { id: "req-" + Date.now().toString(36), projectId: projectId, productName: name, standard: standard,
      createdAt: new Date().toLocaleString(), sourceFile: chosen.sourceFile, title: chosen.title, note: chosen.note,
      columns: chosen.columns.slice(), rows: chosen.rows.map(function(r){ return r.slice(); }) };
    if(chosen.notes){ reqDocRecord.notesTitle = chosen.notesTitle; reqDocRecord.notes = chosen.notes.map(function(r){ return r.slice(); }); }

    // --- the customer's files that match the description -- shown as the
    // result's References, so it's explainable, not a black box.
    var matched = REFERENCE_DOCS.filter(function(doc){ return sharesWord(description, doc.name); });
    // The client's own file is the only source there is, so a project always cites it.
    if(!matched.length) matched = REFERENCE_DOCS.slice();

    // --- project ---
    var projectRecord = { id: projectId, name: name, description: description, createdAt: new Date().toLocaleString() };
    saveProject(projectRecord);
    // Updates this page's own sidebar immediately instead of only taking
    // effect on the next full page load -- creating a project used to
    // look like it needed a manual refresh to show up.
    if(window.addProjectToSidebar) window.blinkSidebarEl(window.addProjectToSidebar(projectRecord));

    // --- requirement doc ---
    saveRequirementDoc(reqDocRecord);

    // --- the project's DFMEAs: one per area of the requirements, each built from the legacy
    // Crimp DFMEA and opening as a real, editable document ---
    var generatedRows = window.DfmeaRefs.TAK50_DFMEAS.map(function(d){
      var docId = makeDocId();
      var docName = name + " " + d.suffix + " DFMEA";
      var from = matched.map(function(m){ return m.name; });
      saveDocRecord({ id: docId, name: docName, function: d.fn, severity: "", projectId: projectId, mode: "ai",
        generatedFrom: from, createdAt: new Date().toLocaleString() });
      saveOverride(docId, { name: docName, function: d.fn, failureMode: "Missing or Degraded Function", mode: "ai",
        projectId: projectId, generatedFrom: from, generatedAt: new Date().toISOString() });
      return { docId: docId, name: docName, fn: d.fn, severity: "" };
    });

    // --- render results ---
    document.getElementById("npDoneTitle").textContent = "“" + name + "” created";
    document.getElementById("npReqProduct").textContent = name;
    document.getElementById("npReqStandard").textContent = standard === "None" ? "No specific standard" : standard;
    document.getElementById("npReqSpecs").innerHTML = window.DfmeaReqDocs.specTableHtml(reqDocRecord);
    window.DfmeaReqDocs.enhanceSpecTable(document.getElementById("npReqSpecs"), reqDocRecord);

    // A quick at-a-glance summary of what just got built, right in the
    // success banner.
    var refCount = matched.length;
    document.getElementById("npStats").innerHTML = [
      [reqDocRecord.rows.length, reqDocRecord.rows.length === 1 ? "requirement" : "requirements"],
      [generatedRows.length, generatedRows.length === 1 ? "DFMEA" : "DFMEAs"],
      [refCount, refCount === 1 ? "reference used" : "references used"]
    ].map(function(s){ return '<span class="np-stat"><b>' + s[0] + '</b>' + s[1] + '</span>'; }).join("");

    // Each reference (an existing DFMEA or spec that fed this result) is a
    // small chip -- its own name, opens that exact source in a new tab on
    // click -- shown right where it was used: a "Built from" column on
    // each generated DFMEA row.
    // Every generated DFMEA was built from the same matched set, so the
    // same chips repeat down the column -- capped, with a "+N" chip (its
    // own tooltip listing the rest) so a long match list never turns the
    // cell into another list to read.
    var chipRowHtml = window.DfmeaRefs.chipRowHtml;
    var dfmeaRefChips = chipRowHtml(matched, 2, function(m){ return window.DfmeaRefs.dfmeaUrl(m.name); });

    var dfmeaBody = document.getElementById("npDfmeaTable");
    dfmeaBody.innerHTML = generatedRows.map(function(r){
      return '<tr data-doc-id="' + r.docId + '" data-tip="Open this DFMEA"><td>' + escapeHtml(r.name) + '</td><td>' + escapeHtml(r.fn) + '</td><td>' + severityChip(r.severity) + '</td>'
        + '<td><div class="np-chiprow-mini">' + dfmeaRefChips + '</div></td></tr>';
    }).join("");
    Array.prototype.slice.call(dfmeaBody.querySelectorAll("tr")).forEach(function(row){
      row.addEventListener("click", function(){
        window.location.href = "index.html?doc=" + encodeURIComponent(row.dataset.docId);
      });
    });

    // The spec card says which Excel file the specification came from.
    if(reqDocRecord.sourceFile){
      var reqBuilt = document.getElementById("npReqBuilt");
      reqBuilt.hidden = false;
      reqBuilt.innerHTML = '<span class="np-built-label">File name</span><span class="np-chip-mini">' + escapeHtml(reqDocRecord.sourceFile) + '</span>';
    }

    var actions = document.getElementById("npDoneActions");
    var openBtn = document.createElement("button");
    openBtn.type = "button"; openBtn.className = "nd-btn primary";
    openBtn.innerHTML = "Open project"
      + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-left:3px"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    openBtn.addEventListener("click", function(){ window.location.href = "project.html?id=" + encodeURIComponent(projectId); });
    var homeBtn = document.createElement("button");
    homeBtn.type = "button"; homeBtn.className = "nd-btn"; homeBtn.textContent = "Back to Projects";
    homeBtn.addEventListener("click", function(){ window.location.href = "projects.html"; });
    actions.innerHTML = "";
    actions.appendChild(homeBtn);
    actions.appendChild(openBtn);

    showStep(step3);
  }
})();
