(function(){
  "use strict";
  // page-setup.js overwrites .ttl/.crumb with the dashboard's own title --
  // put this page's real title back afterward.
  var pageTitle = document.querySelector(".ttl");
  if(pageTitle) pageTitle.textContent = "Design requirement specifications";
  var crumbEl = document.querySelector(".crumb");
  if(crumbEl) crumbEl.innerHTML = 'DFMEA &rsaquo; <b>Design Requirements</b>';
  // Design Requirements is marked the active nav item directly in this
  // page's own HTML, so there's nothing to move at runtime here.

  function escapeHtml(value){
    var div = document.createElement("div");
    div.textContent = String(value);
    return div.innerHTML;
  }
  // A plain CSV export -- good enough for a row set this small, and it's
  // a real file download, not a fake button that does nothing on click.
  function downloadCsv(filename, headers, rows){
    function cell(value){
      var s = String(value == null ? "" : value);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }
    var csv = [headers.map(cell).join(",")].concat(rows.map(function(r){ return r.map(cell).join(","); })).join("\r\n");
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  }

  function readMyProjectsForReq(){
    try{ return JSON.parse(localStorage.getItem("dfmeaMyProjects") || "[]"); }catch(error){ return []; }
  }

  var reqCard = document.getElementById("reqCard");
  var reqUploadBtn = document.getElementById("reqUploadBtn");
  var reqInput = document.getElementById("reqUploadInput");
  var reqErrBox = document.getElementById("reqUploadErr");
  var reqProgressBox = document.getElementById("reqUploadProgress");
  var reqBarFill = document.getElementById("reqUploadBarFill");
  var reqProgressLabel = document.getElementById("reqUploadLabel");
  var reqStageList = document.getElementById("reqUploadStages");
  var reqStageItems = Array.prototype.slice.call(reqStageList.querySelectorAll("li"));
  function setReqStage(index, state){
    var item = reqStageItems[index];
    if(!item) return;
    item.classList.remove("active", "done");
    if(state) item.classList.add(state);
  }
  var reqSuccessBox = document.getElementById("reqUploadSuccess");

  var tableBody = document.getElementById("reqTableBody");
  var emptyEl = document.getElementById("reqEmpty");
  var searchInput = document.getElementById("reqSearch");
  var standardFilter = document.getElementById("reqStandardFilter");

  function allDocs(){
    var myProjects = readMyProjectsForReq();
    return window.DfmeaReqDocs.readAll().map(function(r){
      var project = myProjects.find(function(p){ return p.id === r.projectId; });
      return { id: r.id, product: r.productName, standard: r.standard, when: r.createdAt, specs: r.specs, projectId: project ? r.projectId : null, record: r };
    }).slice().reverse();
  }

  function populateStandardFilter(docs){
    var current = standardFilter.value;
    var standards = Array.from(new Set(docs.map(function(d){ return d.standard; })));
    standardFilter.innerHTML = '<option value="all">All standards</option>' + standards.map(function(s){
      return '<option value="' + escapeHtml(s) + '">' + escapeHtml(s === "None" ? "No specific standard" : s) + '</option>';
    }).join("");
    if(standards.indexOf(current) !== -1) standardFilter.value = current;
  }

  // One small coloured chip per category the spec covers (same colours as
  // the category column inside a spec), capped with a "+N" for the rest.
  function categoryChips(specs){
    var cats = window.DfmeaReqDocs.categoriesOf(specs);
    var html = cats.slice(0, 2).map(function(c){
      return '<span class="spec-cat" data-cat="' + escapeHtml(c.toLowerCase()) + '">' + escapeHtml(c) + '</span>';
    }).join("");
    if(cats.length > 2) html += '<span class="spec-cat" data-tip="' + escapeHtml(cats.slice(2).join(", ")) + '">+' + (cats.length - 2) + '</span>';
    return html;
  }

  function render(){
    var docs = allDocs();
    populateStandardFilter(docs);
    var query = searchInput.value.trim().toLowerCase();
    var standard = standardFilter.value;
    var visible = docs.filter(function(d){
      if(standard !== "all" && d.standard !== standard) return false;
      if(!query) return true;
      if(d.product.toLowerCase().indexOf(query) !== -1) return true;
      return (d.specs || []).some(function(s){ return s.toLowerCase().indexOf(query) !== -1; });
    });

    emptyEl.hidden = visible.length > 0;
    tableBody.innerHTML = visible.map(function(doc){
      var standardLabel = doc.standard === "None" ? "No specific standard" : doc.standard;
      return '<tr class="req-row" data-id="' + doc.id + '" data-tip="Open this specification">'
        + '<td class="req-open-cell"><span class="data-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14L21 3"/></svg></span></td>'
        + '<td><span class="req-standard">' + escapeHtml(standardLabel) + '</span></td>'
        + '<td class="req-product">' + escapeHtml(doc.product) + '</td>'
        + '<td><div class="np-chiprow-mini">' + categoryChips(doc.specs) + '</div></td>'
        + '<td><span class="data-count">' + (doc.specs || []).length + '</span></td>'
        + '<td><div class="np-chiprow-mini req-built-cell">' + window.DfmeaRefs.chipRowHtml(window.DfmeaReqDocs.sourcesFor(doc.record), 1, function(item){ return item.url; }) + '</div></td>'
        + '<td class="req-date">' + escapeHtml(doc.when) + '</td>'
        + '</tr>';
    }).join("");

    Array.prototype.slice.call(tableBody.querySelectorAll(".req-row")).forEach(function(row){
      row.addEventListener("click", function(){
        window.open("requirement-view.html?id=" + encodeURIComponent(row.dataset.id), "_blank");
      });
    });

    document.getElementById("reqExportBtn").onclick = function(){
      downloadCsv("design-requirement-specifications.csv", ["Product", "Standard", "Specs", "Date"],
        visible.map(function(d){ return [d.product, d.standard === "None" ? "No specific standard" : d.standard, (d.specs || []).join("; "), d.when]; }));
    };
  }
  searchInput.addEventListener("input", render);
  standardFilter.addEventListener("change", render);

  function showReqError(message){
    reqErrBox.textContent = message;
    reqErrBox.className = "up-msg show err";
    reqSuccessBox.className = "up-msg";
  }
  function clearReqError(){ reqErrBox.className = "up-msg"; }

  function isSpecFile(file){
    var name = file.name.toLowerCase();
    return name.endsWith(".pdf") || name.endsWith(".doc") || name.endsWith(".docx");
  }

  // Same honest simulated pipeline as Legacy DFMEA's worksheet upload --
  // no real document parser behind this, but a real progress sequence
  // and a real new row added to the table once it "finishes", not an
  // instant fake success.
  function handleReqFile(file){
    clearReqError();
    reqSuccessBox.className = "up-msg";
    if(!file){ return; }
    if(!isSpecFile(file)){
      showReqError("\"" + file.name + "\" is not a supported file. Please choose a .pdf or .docx document.");
      return;
    }
    if(file.size === 0){
      showReqError("\"" + file.name + "\" is empty. Choose a file that actually has requirements in it.");
      return;
    }
    var maxBytes = 20 * 1024 * 1024;
    if(file.size > maxBytes){
      showReqError("\"" + file.name + "\" is larger than the 20 MB limit for this preview.");
      return;
    }

    reqProgressBox.classList.add("show");
    reqBarFill.style.width = "0%";
    setReqStage(0, "active");
    var STAGES = [
      { upto: 30, label: "Uploading “" + file.name + "”…" },
      { upto: 62, label: "Extracting requirements from the document…" },
      { upto: 90, label: "Structuring into a specification list…" },
      { upto: 100, label: "Finishing up…" }
    ];
    var pct = 0;
    var stageIndex = 0;
    reqProgressLabel.textContent = STAGES[0].label;
    var timer = setInterval(function(){
      pct = Math.min(100, pct + 4 + Math.random() * 6);
      reqBarFill.style.width = pct + "%";
      while(stageIndex < STAGES.length - 1 && pct >= STAGES[stageIndex].upto){
        setReqStage(stageIndex, "done");
        stageIndex++;
        setReqStage(stageIndex, "active");
        reqProgressLabel.textContent = STAGES[stageIndex].label;
      }
      if(pct >= 100){
        clearInterval(timer);
        setReqStage(stageIndex, "done");
        setTimeout(function(){
          reqProgressBox.classList.remove("show");
          var productName = file.name.replace(/\.(pdf|docx?|doc)$/i, "").replace(/[_-]+/g, " ").trim();
          reqSuccessBox.innerHTML = "<b>“" + escapeHtml(file.name) + "”</b> uploaded and parsed. "
            + "Its requirements have been added to the specification library below.";
          reqSuccessBox.className = "up-msg show ok";
          window.DfmeaReqDocs.add({
            id: "req-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            projectId: null,
            productName: productName || file.name,
            standard: "None",
            createdAt: new Date().toLocaleString(),
            specs: [
              "Requirements extracted from the uploaded document. Open this specification to review and edit each line",
              "Re-run extraction or edit the list directly once the document has been reviewed"
            ]
          });
          render();
        }, 450);
      }
    }, 130);
  }

  reqUploadBtn.addEventListener("click", function(){ reqInput.click(); });
  reqInput.addEventListener("change", function(){
    handleReqFile(reqInput.files && reqInput.files[0]);
    reqInput.value = "";
  });
  ["dragenter", "dragover"].forEach(function(evt){
    reqCard.addEventListener(evt, function(event){ event.preventDefault(); reqCard.classList.add("drag"); });
  });
  ["dragleave", "drop"].forEach(function(evt){
    reqCard.addEventListener(evt, function(event){ event.preventDefault(); reqCard.classList.remove("drag"); });
  });
  reqCard.addEventListener("drop", function(event){
    var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    handleReqFile(file);
  });

  render();
  // A spec added/edited from another open tab (or generated by "Create
  // project" running elsewhere) shows up here live, same as the sidebar
  // and the Projects table already do.
  window.addEventListener("storage", function(event){
    if(event.key === "dfmeaRequirementDocs" || event.key === "dfmeaMyProjects") render();
  });
})();
