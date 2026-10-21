(function(){
  "use strict";
  var params = new URLSearchParams(window.location.search);

  // Every DFMEA belongs to a project -- this list is the same set the
  // Projects pages use (the one real project plus the two placeholders),
  // extended with whatever custom projects were created on the Projects
  // page. Arriving here from a project's own "+ New DFMEA" button
  // (project.html passes ?project=<id>) pre-selects that project instead
  // of defaulting to TAK50 every time.
  var KNOWN_PROJECTS = [
    { id: "tak50", name: "TAK50" }
  ];
  function readCustomProjects(){
    try{ return JSON.parse(localStorage.getItem("dfmeaMyProjects") || "[]"); }catch(error){ return []; }
  }
  // Same document names project.html already shows for each built-in
  // project -- kept in sync with KNOWN_PROJECTS in project-detail.js.
  var KNOWN_PROJECT_DOCS = {
    "tak50": ["Crimp DFMEA"]
  };
  function existingDocNames(projectId){
    var names = (KNOWN_PROJECT_DOCS[projectId] || []).slice();
    try{
      JSON.parse(localStorage.getItem("dfmeaMyDocuments") || "[]").forEach(function(d){
        if(d.projectId === projectId) names.push(d.name);
      });
    }catch(error){ /* no custom documents to add */ }
    return names;
  }
  var projectSelect = document.getElementById("ndProject");
  var allProjects = KNOWN_PROJECTS.concat(readCustomProjects());
  projectSelect.innerHTML = allProjects.map(function(p){
    return '<option value="' + p.id + '">' + escapeHtml(p.name) + '</option>';
  }).join("");
  var requestedProject = params.get("project");
  if(requestedProject && allProjects.some(function(p){ return p.id === requestedProject; })){
    projectSelect.value = requestedProject;
  }

  // The design requirement specification this DFMEA answers to: the chosen
  // project's own spec by default, any other one on file if preferred.
  var specSelect = document.getElementById("ndSpec");
  var allSpecs = [];
  try{ allSpecs = window.DfmeaReqDocs.readAll(); }catch(error){ /* no specs to choose from */ }
  specSelect.innerHTML = '<option value="">No specification</option>' + allSpecs.map(function(d){
    var label = d.standard === "None" ? d.productName : d.standard + " · " + d.productName;
    return '<option value="' + escapeHtml(d.id) + '">' + escapeHtml(label) + '</option>';
  }).join("");
  function selectProjectSpec(){
    var own = allSpecs.filter(function(d){ return d.projectId === projectSelect.value; })[0];
    specSelect.value = own ? own.id : "";
  }
  selectProjectSpec();
  projectSelect.addEventListener("change", selectProjectSpec);

  // page-setup.js (loaded here too, purely for a consistent sidebar)
  // overwrites the whole .crumb element's innerHTML for its own
  // breadcrumb -- so this rebuilds it fresh rather than trusting the
  // #ndCrumb child it originally shipped with to still be there.
  var pageTitle = document.getElementById("ndPageTitle");
  var crumbEl = document.querySelector(".crumb");
  if(crumbEl) crumbEl.innerHTML = 'DFMEA &rsaquo; <b>New DFMEA</b>';
  if(pageTitle) pageTitle.textContent = "Create a new DFMEA";

  document.getElementById("ndCancel").addEventListener("click", function(){
    window.location.href = requestedProject ? "project.html?id=" + encodeURIComponent(projectSelect.value) : "projects.html";
  });

  var nameInput = document.getElementById("ndName");
  var functionInput = document.getElementById("ndFunction");
  var failureInput = document.getElementById("ndFailure");
  var severityInput = document.getElementById("ndSeverity");
  var step1 = document.getElementById("ndStep1");
  var step2 = document.getElementById("ndStep2");
  var step3 = document.getElementById("ndStep3");
  var step4 = document.getElementById("ndStep4");

  function showStep(step){
    [step1, step2, step3, step4].forEach(function(s){ s.classList.remove("on"); });
    step.classList.add("on");
  }

  function validateStep1(){
    var ok = true;
    [["ndFunctionField", functionInput], ["ndFailureField", failureInput]].forEach(function(pair){
      var field = document.getElementById(pair[0]);
      var input = pair[1];
      var filled = input.value.trim().length > 0;
      field.classList.toggle("has-err", !filled);
      input.classList.toggle("err", !filled);
      if(!filled) ok = false;
    });
    // A second DFMEA with the same name as one that already exists in
    // this project is exactly the kind of mix-up that's confusing later
    // (which one is which in the project's document table), so it's
    // blocked here the same way an empty name is.
    var nameField = document.getElementById("ndNameField");
    var nameErr = document.getElementById("ndNameErr");
    var typedName = nameInput.value.trim();
    var duplicateName = !!typedName && existingDocNames(projectSelect.value).some(function(n){
      return n.toLowerCase() === typedName.toLowerCase();
    });
    var nameOk = !!typedName && !duplicateName;
    nameErr.textContent = !typedName ? "Give this DFMEA a name."
      : "A DFMEA named “" + typedName + "” already exists in this project.";
    nameField.classList.toggle("has-err", !nameOk);
    nameInput.classList.toggle("err", !nameOk);
    if(!nameOk) ok = false;
    var severityField = document.getElementById("ndSeverityField");
    var severityValue = Number(severityInput.value);
    var severityOk = severityInput.value.trim().length > 0 && severityValue >= 1 && severityValue <= 10 && Number.isInteger(severityValue);
    severityField.classList.toggle("has-err", !severityOk);
    severityInput.classList.toggle("err", !severityOk);
    if(!severityOk) ok = false;
    return ok;
  }
  [nameInput, functionInput, failureInput, severityInput].forEach(function(input){
    input.addEventListener("input", function(){
      var field = input.closest(".nd-field");
      field.classList.remove("has-err");
      input.classList.remove("err");
    });
  });

  function readUploadHistory(){
    try{ return JSON.parse(localStorage.getItem("dfmeaUploadHistory") || "[]"); }catch(error){ return []; }
  }
  function saveDocRecord(record){
    try{
      var list = JSON.parse(localStorage.getItem("dfmeaMyDocuments") || "[]");
      list.push(record);
      localStorage.setItem("dfmeaMyDocuments", JSON.stringify(list));
    }catch(error){ /* storage unavailable -- the flow still works, just won't be listed anywhere */ }
  }
  // There's only one real, fully-populated worksheet in this build (the
  // Crimp DFMEA), so every DFMEA created here "opens" by reusing that
  // same live structure under its own name -- stored per document id so
  // several created DFMEAs don't stomp on each other's labelling, and so
  // visiting index.html directly (no ?doc=) always shows the real one.
  function saveOverride(id, override){
    try{
      var map = JSON.parse(localStorage.getItem("dfmeaDocOverrides") || "{}");
      map[id] = override;
      localStorage.setItem("dfmeaDocOverrides", JSON.stringify(map));
    }catch(error){ /* override just won't persist -- navigation still works */ }
  }
  function makeDocId(){ return "doc-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  // Very simple "AI" stand-in: does the candidate's own name/filename
  // share a whole word with what the user typed? No real matching model
  // here -- this is a static front-end, so this is an honest, visible
  // substitute rather than a hidden fake "AI" that secretly does nothing.
  function wordsOf(text){
    return (text || "").toLowerCase().match(/[a-z0-9]+/g) || [];
  }
  function sharesWord(a, b){
    var setB = new Set(wordsOf(b));
    return wordsOf(a).some(function(w){ return w.length > 3 && setB.has(w); });
  }

  var candidates = [];
  document.getElementById("ndStep1Next").addEventListener("click", function(){
    if(!validateStep1()){
      document.querySelector(".nd-field.has-err input, .nd-field.has-err textarea").focus();
      return;
    }
    buildCandidates();
    showStep(step2);
  });

  // The legacy worksheets Legacy DFMEA lists -- a DFMEA this workspace
  // already has on file is exactly the kind of thing matching should be
  // drawing candidates from, not just the one reference document and
  // whatever the visitor personally uploaded.

  function buildCandidates(){
    var queryText = functionInput.value + " " + failureInput.value;
    candidates = [];
    window.DfmeaRefs.LEGACY.forEach(function(file, index){
      candidates.push({
        id: "library-" + index,
        name: file.name,
        meta: "Customer file · uploaded " + file.when + " · " + file.size,
        isReference: false
      });
    });
    readUploadHistory().forEach(function(file, index){
      candidates.push({
        id: "upload-" + index,
        name: file.name,
        meta: "Uploaded " + file.when + " · " + file.size,
        isReference: false
      });
    });
    var box = document.getElementById("ndCandidates");
    box.innerHTML = "";
    candidates.forEach(function(c){
      var matched = c.isReference || sharesWord(queryText, c.name);
      var row = document.createElement("tr");
      row.className = "ndc-row";
      row.innerHTML = '<td class="ndc-check"><input type="checkbox" data-id="' + c.id + '"' + (matched ? " checked" : "") + '></td>'
        + '<td><div class="ndc-name">' + escapeHtml(c.name) + '</div><div class="ndc-meta">' + escapeHtml(c.meta) + '</div></td>'
        + '<td>' + (matched ? '<span class="ndc-badge">Matched</span>' : "") + '</td>';
      // Clicking anywhere in the row toggles it, not just the checkbox
      // itself -- same click-to-select pattern as every other table here.
      row.addEventListener("click", function(event){
        if(event.target.tagName === "INPUT") return;
        var input = row.querySelector("input");
        input.checked = !input.checked;
      });
      box.appendChild(row);
    });
  }
  if(window.TableTools) window.TableTools.attach(document.getElementById("ndCandidates").closest("table"), { noun: "files", placeholder: "Search files", sortable: false });
  function escapeHtml(value){
    var div = document.createElement("div");
    div.textContent = String(value);
    return div.innerHTML;
  }

  document.getElementById("ndStep2Back").addEventListener("click", function(){ showStep(step1); });
  document.getElementById("ndStep2Next").addEventListener("click", function(){
    var checked = Array.prototype.slice.call(document.querySelectorAll("#ndCandidates input:checked"))
      .map(function(input){ return candidates.find(function(c){ return c.id === input.dataset.id; }); })
      .filter(Boolean);
    showStep(step3);
    runGenerate(checked);
  });

  function runGenerate(selected){
    var fill = document.getElementById("ndProgressFill");
    var label = document.getElementById("ndProgressLabel");
    var steps = [
      [20, "Analysing related DFMEAs..."],
      [55, "Mapping causes from the reference structure..."],
      [85, "Building worksheet rows..."],
      [100, "Finishing up..."]
    ];
    var i = 0;
    fill.style.width = "0%";
    (function tick(){
      if(i >= steps.length){
        setTimeout(function(){ finish(selected); }, 350);
        return;
      }
      fill.style.width = steps[i][0] + "%";
      label.textContent = steps[i][1];
      i++;
      setTimeout(tick, 480);
    })();
  }

  function finish(selected){
    var name = nameInput.value.trim();
    var fn = functionInput.value.trim();
    var failure = failureInput.value.trim();
    var severity = Number(severityInput.value);
    var projectId = projectSelect.value;
    var docId = makeDocId();
    var fromNames = selected.map(function(c){ return c.name; });
    var relatedUploadNames = selected.filter(function(c){ return !c.isReference; }).map(function(c){ return c.name; });
    saveDocRecord({ id: docId, name: name, function: fn, severity: severity, projectId: projectId, mode: "ai", generatedFrom: fromNames, relatedUploads: relatedUploadNames, createdAt: new Date().toLocaleString() });
    saveOverride(docId, {
      name: name, function: fn, failureMode: failure, severity: severity, mode: "ai", projectId: projectId, generatedFrom: relatedUploadNames, generatedAt: new Date().toISOString()
    });

    document.getElementById("ndDoneTitle").textContent = "“" + name + "” generated";
    document.getElementById("ndDoneBody").textContent = "A starting cause structure was based on the reference DFMEAs below. Everything is editable.";
    var summary = document.getElementById("ndSummaryBox");
    summary.hidden = false;
    // Same severity tiers as every other table in the app.
    var severityTier = severity >= 9 ? "s-crit" : (severity >= 6 ? "s-high" : "s-low");
    summary.innerHTML = "<table>" + [
      ["Function", escapeHtml(fn)],
      ["Failure mode", escapeHtml(failure)],
      ["Severity", '<span class="chip ' + severityTier + '">' + severity + "</span>"],
      ["Specification", specSelect.value ? escapeHtml(window.DfmeaReqDocs.getById(specSelect.value).productName) : "None selected"],
      ["References", fromNames.length ? escapeHtml(fromNames.join(", ")) : "None selected"],
      ["Structure", window.DfmeaRefs.CRIMP_STRUCTURE.charAt(0).toUpperCase() + window.DfmeaRefs.CRIMP_STRUCTURE.slice(1)]
    ].map(function(row){ return "<tr><th>" + row[0] + "</th><td>" + row[1] + "</td></tr>"; }).join("") + "</table>";

    var actions = document.getElementById("ndDoneActions");
    actions.innerHTML = "";
    var openBtn = document.createElement("button");
    openBtn.type = "button"; openBtn.className = "nd-btn primary"; openBtn.textContent = "Open and edit";
    openBtn.addEventListener("click", function(){
      window.location.href = "index.html?doc=" + encodeURIComponent(docId);
    });
    var homeBtn = document.createElement("button");
    homeBtn.type = "button"; homeBtn.className = "nd-btn"; homeBtn.textContent = "Back to project";
    homeBtn.addEventListener("click", function(){ window.location.href = "project.html?id=" + encodeURIComponent(projectId); });
    actions.appendChild(homeBtn);
    actions.appendChild(openBtn);
    showStep(step4);
  }
})();
