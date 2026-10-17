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
    }).join("") + '<option value="None">No specific standard</option>';
    standardInput.value = "LV214";
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
  var BUILT_IN_PROJECT_NAMES = ["Aster EV Connector"];
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

  // The DFMEAs matching draws on to find which existing ones fit the
  // product description: worksheets listed on the Legacy DFMEA page plus
  // this workspace's own reference DFMEA. Shown as "Built from" chips on
  // the results screen.
  var REFERENCE_DOCS = [
    { name: "OEM_Connector_Interface_DFMEA.xlsx" },
    { name: "Customer_Battery_Terminal_DFMEA.xlsx" },
    { name: "Tier1_Harness_Routing_DFMEA.xlsx" },
    { name: "Crimp Contact Resistance" }
  ];
  function severityChip(severity){
    var tier = severity >= 9 ? "s-crit" : (severity >= 6 ? "s-high" : "s-low");
    return '<span class="chip ' + tier + '">' + severity + '</span>';
  }

  // A lightweight "AI": keyword overlap against the product description,
  // same honest, visible substitute used everywhere else in this build --
  // no real model behind this, a static front-end can't run one.
  var SPEC_POOL = [
    { words: ["crimp", "terminal", "wire", "conductor"], spec: "Mechanical — Crimp pull-out force ≥ 80 N per terminal, verified per tensile test to the chosen reference standard" },
    { words: ["crimp", "terminal", "resistance", "contact", "current"], spec: "Electrical — Contact resistance ≤ 0.55 mΩ after crimping, measured by 4-wire Kelvin method" },
    { words: ["housing", "seal", "waterproof", "ip", "moisture"], spec: "Environmental — Housing sealing rated to IP67 (1m, 30 min submersion) at the connector mating face per IEC 60529" },
    { words: ["mating", "cycle", "connector", "durability"], spec: "Mechanical — Minimum 50 mating/unmating cycles without contact degradation or increased insertion force" },
    { words: ["retention", "lock", "latch", "housing"], spec: "Mechanical — Terminal retention force ≥ 60 N in the housing cavity; locking mechanism ≥ 80 N before primary lock release" },
    { words: ["vibration", "shock", "mount"], spec: "Environmental — Withstand random vibration per ISO 16750-3, 10-2000 Hz, with no electrical discontinuity greater than 1μs" },
    { words: ["temperature", "thermal", "heat", "battery", "power"], spec: "Environmental — Operating temperature range -40°C to +125°C; 100 thermal cycles with no cracking or deformation" },
    { words: ["current", "power", "busbar", "battery", "high"], spec: "Electrical — Continuous current rating meets design load with ≤ 20K temperature rise at rated current" },
    { words: ["corrosion", "salt", "humidity", "outdoor"], spec: "Environmental — Salt spray resistance per ISO 9227, 96h minimum, no red rust on base metal" },
    { words: ["connector", "plastic", "housing", "material"], spec: "Material — Housing material flammability rating UL94 V-0, verified by flame test" },
    { words: ["dimension", "tolerance", "fit", "housing", "mold"], spec: "Mechanical — Housing dimensional tolerance ±0.15mm on all mating interface features, verified by CMM inspection" },
    { words: ["humidity", "moisture", "outdoor", "environment"], spec: "Environmental — Humidity resistance: 10 cycles minimum, no corrosion or contact resistance drift greater than 20%" },
    { words: ["insulation", "voltage", "electrical", "power"], spec: "Electrical — Insulation resistance ≥ 100 MΩ at 500V DC between adjacent current-carrying paths" },
    { words: ["uv", "outdoor", "sun", "exposure"], spec: "Environmental — UV resistance: 500 hours per SAE J2527 with no significant color change or material degradation" },
    { words: ["shock", "drop", "impact"], spec: "Mechanical — Mechanical shock resistance: 50g half-sine pulse, 11ms duration, no functional degradation" },
    { words: ["assembly", "manufacture", "production", "quality"], spec: "Manufacturing — Process capability Cpk ≥ 1.33 on all critical-to-function dimensions at full production rate" },
    { words: ["wire", "conductor", "strain", "pull"], spec: "Mechanical — Wire strain relief must withstand 5 N axial pull for 1 minute with no conductor movement at the termination" },
    { words: ["plating", "corrosion", "contact", "material"], spec: "Material — Contact plating minimum 2μm thickness over base alloy, no exposed base metal after assembly" },
    { words: ["voltage", "dielectric", "power", "electrical"], spec: "Electrical — Dielectric withstand voltage 1500V AC for 60 seconds between adjacent conductive paths, no breakdown" },
    { words: ["fretting", "vibration", "micro", "contact"], spec: "Environmental — Fretting corrosion resistance under micro-vibration, no contact resistance increase greater than 10%" },
    { words: ["quality", "production", "inspection", "trace"], spec: "Quality — Lot traceability required for all critical raw material and plating batches used in production" },
    { words: ["mold", "manufacture", "production", "void"], spec: "Manufacturing — Mold flow analysis required to confirm no sink marks or voids on load-bearing wall sections" }
  ];
  var DEFAULT_SPECS = [0, 1, 2, 3, 4, 5, 6, 10, 12, 15].map(function(i){ return SPEC_POOL[i].spec; });

  // One DFMEA per major function a connector-style product needs covered
  // -- fixed, not derived from the description, so generation is always
  // predictable and every one opens as a real, editable document exactly
  // like New DFMEA (with AI) already produces for a single function.
  var FUNCTION_SET = [
    { suffix: "Crimp Contact Resistance", failure: "Contact resistance exceeds limit after crimping", severity: 9 },
    { suffix: "Terminal Retention Force", failure: "Terminal backs out of housing cavity under load", severity: 8 },
    { suffix: "Housing Seal Integrity", failure: "Seal fails to maintain IP rating after repeated mating", severity: 7 },
    { suffix: "Mating Cycle Durability", failure: "Contact performance degrades after repeated mating cycles", severity: 7 }
  ];

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

    // --- requirement specification: matched specs first, then defaults, deduped, capped ---
    var matchedSpecs = SPEC_POOL.filter(function(entry){
      return wordsOf(description).some(function(w){ return w.length > 3 && entry.words.indexOf(w) !== -1; });
    }).map(function(entry){ return entry.spec; });
    var specs = Array.from(new Set(matchedSpecs.concat(DEFAULT_SPECS))).slice(0, 18);

    // --- related DFMEAs and existing requirement specs that matched the
    // description -- shown together as one simple "what this was built
    // from" list, so the result is explainable, not a black box.
    var matched = REFERENCE_DOCS.filter(function(doc){ return sharesWord(description, doc.name); });
    var matchedReqDocs = window.DfmeaReqDocs.readAll().filter(function(d){ return sharesWord(description, d.productName); });

    // --- project ---
    var projectRecord = { id: projectId, name: name, description: description, createdAt: new Date().toLocaleString() };
    saveProject(projectRecord);
    // Updates this page's own sidebar immediately instead of only taking
    // effect on the next full page load -- creating a project used to
    // look like it needed a manual refresh to show up.
    if(window.addProjectToSidebar) window.blinkSidebarEl(window.addProjectToSidebar(projectRecord));

    // --- requirement doc ---
    saveRequirementDoc({ id: "req-" + Date.now().toString(36), projectId: projectId, productName: name,
      standard: standard, specs: specs, createdAt: new Date().toLocaleString(),
      builtFrom: matchedReqDocs.map(function(d){ return { id: d.id, name: d.productName }; }),
      builtFromDfmeas: matched.map(function(m){ return m.name; }) });

    // --- generated DFMEAs, each a real, editable document like New DFMEA (with AI) produces ---
    var generatedRows = FUNCTION_SET.map(function(f){
      var docId = makeDocId();
      var docName = name + " " + f.suffix + " DFMEA";
      saveDocRecord({ id: docId, name: docName, function: f.suffix, severity: f.severity, projectId: projectId,
        mode: "ai", generatedFrom: matched.map(function(m){ return m.name; }), createdAt: new Date().toLocaleString() });
      saveOverride(docId, { name: docName, function: f.suffix, failureMode: f.failure, severity: f.severity,
        mode: "ai", projectId: projectId, generatedFrom: matched.map(function(m){ return m.name; }), generatedAt: new Date().toISOString() });
      return { docId: docId, name: docName, fn: f.suffix, severity: f.severity };
    });

    // --- render results ---
    document.getElementById("npDoneTitle").textContent = "“" + name + "” created";
    document.getElementById("npReqProduct").textContent = name;
    document.getElementById("npReqStandard").textContent = standard === "None" ? "No specific standard" : standard;
    document.getElementById("npReqSpecs").innerHTML = window.DfmeaReqDocs.specTableHtml(specs, { builtFrom: matchedReqDocs.map(function(d){ return { id: d.id, name: d.productName }; }), builtFromDfmeas: matched.map(function(m){ return m.name; }) });

    // A quick at-a-glance summary of what just got built, right in the
    // success banner.
    var refCount = matched.length + matchedReqDocs.length;
    document.getElementById("npStats").innerHTML = [
      [specs.length, specs.length === 1 ? "requirement" : "requirements"],
      [FUNCTION_SET.length, "DFMEAs"],
      [refCount, refCount === 1 ? "reference used" : "references used"]
    ].map(function(s){ return '<span class="np-stat"><b>' + s[0] + '</b>' + s[1] + '</span>'; }).join("");

    // Each reference (an existing DFMEA or spec that fed this result) is a
    // small chip -- its own name, opens that exact source in a new tab on
    // click -- shown right where it was used: a "Built from" column on
    // each generated DFMEA row, and a "Built from" line on the spec card.
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

    if(matchedReqDocs.length){
      var reqBuilt = document.getElementById("npReqBuilt");
      reqBuilt.hidden = false;
      var specChips = chipRowHtml(matchedReqDocs.map(function(d){ return { name: d.productName, id: d.id }; }), 3, function(item){
        return "requirement-view.html?id=" + encodeURIComponent(item.id);
      });
      reqBuilt.innerHTML = '<span class="np-built-label">Built from</span><div class="np-chiprow-mini">' + specChips + '</div>';
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
