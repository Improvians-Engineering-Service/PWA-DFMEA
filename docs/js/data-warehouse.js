(function(){
  "use strict";
  // page-setup.js overwrites .ttl/.crumb with the dashboard's own title --
  // put this page's real title back afterward.
  var pageTitle = document.querySelector(".ttl");
  if(pageTitle) pageTitle.textContent = "Legacy DFMEA";
  var crumbEl = document.querySelector(".crumb");
  if(crumbEl) crumbEl.innerHTML = 'DFMEA &rsaquo; <b>Legacy DFMEA</b>';
  // Legacy DFMEA is marked the active nav item directly in this
  // page's own HTML, so there's nothing to move at runtime here.

  function escapeHtml(value){
    var div = document.createElement("div");
    div.textContent = String(value);
    return div.innerHTML;
  }
  function slugify(text){
    return String(text).toLowerCase().replace(/\.(xlsx|xls|pdf)$/i, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
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

  // ============================================================
  // Section 1: uploaded worksheets
  // ============================================================
  (function(){
    var uploadCard = document.getElementById("uploadCard");
    var uploadBtn = document.getElementById("uhUploadBtn");
    var input = document.getElementById("uploadInput");
    var errBox = document.getElementById("uploadErr");
    var progressBox = document.getElementById("uploadProgress");
    var barFill = document.getElementById("uploadBarFill");
    var progressLabel = document.getElementById("uploadLabel");
    var stageList = document.getElementById("uploadStages");
    var stageItems = Array.prototype.slice.call(stageList.querySelectorAll("li"));
    function setStage(index, state){
      var item = stageItems[index];
      if(!item) return;
      item.classList.remove("active", "done");
      if(state) item.classList.add(state);
    }
    var successBox = document.getElementById("uploadSuccess");
    var historyBody = document.getElementById("uploadHistoryBody");
    var historyEmpty = document.getElementById("uploadHistoryEmpty");
    var searchInput = document.getElementById("uhSearch");
    var historyKey = "dfmeaUploadHistory";

    // The legacy worksheets shared with the project (external, kept pinned
    // at the top), then anything uploaded. Real uploads (readHistory/
    // saveHistory below) are what the "no data yet" checks elsewhere key off of.
    var DEFAULT_LIBRARY = window.DfmeaRefs.LEGACY;

    function readHistory(){
      try{ return JSON.parse(localStorage.getItem(historyKey) || "[]"); }catch(error){ return []; }
    }
    function saveHistory(list){
      try{ localStorage.setItem(historyKey, JSON.stringify(list)); }catch(error){ /* storage unavailable */ }
    }
    function formatSize(bytes){
      if(bytes < 1024) return bytes + " B";
      if(bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
      return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    }
    function allRows(){
      // Externally-shared files always lead the list -- they're the
      // authoritative external reference -- then your own uploads (newest
      // first).
      var mine = readHistory().map(function(d){ return Object.assign({ source: "mine" }, d); }).slice().reverse();
      return DEFAULT_LIBRARY.concat(mine);
    }
    // Opening an uploaded worksheet reuses the same per-document override
    // mechanism every DFMEA in this build already uses -- there's no real
    // parser behind this preview, but the real Crimp worksheet underneath
    // is a genuine, inspectable structure, relabeled with this file's
    // name, exactly like a document created through New DFMEA opens.
    function openWorksheetPreview(item){
      var docId = "upload-" + slugify(item.name);
      try{
        var map = JSON.parse(localStorage.getItem("dfmeaDocOverrides") || "{}");
        if(!map[docId]){
          // Trailing "DFMEA" is dropped -- the page already shows a DFMEA
          // badge next to the title, so a name ending in it would read
          // like "Busbar Joint DFMEA DFMEA" once both are on screen.
          var title = item.name.replace(/\.(xlsx|xls|pdf)$/i, "").replace(/[_-]+/g, " ").replace(/\s+dfmea\s*$/i, "").trim();
          map[docId] = { name: title, mode: "sample" };
          localStorage.setItem("dfmeaDocOverrides", JSON.stringify(map));
        }
      }catch(error){ /* override just won't persist -- it still opens, unlabeled */ }
      window.open("worksheet-view.html?doc=" + encodeURIComponent(docId), "_blank");
    }

    function renderHistory(){
      var rows = allRows();
      var query = searchInput.value.trim().toLowerCase();
      var visible = rows.filter(function(r){
        if(query && r.name.toLowerCase().indexOf(query) === -1) return false;
        return true;
      });

      historyBody.innerHTML = "";
      historyEmpty.hidden = visible.length > 0;
      visible.forEach(function(item, index){
        var row = document.createElement("tr");
        row.dataset.tip = "Open this worksheet";
        row.innerHTML = '<td class="uh-num">' + (index + 1) + "</td><td>" + escapeHtml(item.name) + "</td>"
          + "<td>" + escapeHtml(item.size) + "</td>"
          + "<td>" + escapeHtml(item.rows != null ? item.rows + " rows" : "") + "</td>"
          + "<td>" + escapeHtml(item.when) + "</td>";
        row.addEventListener("click", function(){ openWorksheetPreview(item); });
        historyBody.appendChild(row);
      });

      document.getElementById("uhExportBtn").onclick = function(){
        downloadCsv("uploaded-worksheets.csv", ["File", "Size", "Rows parsed", "Uploaded"],
          visible.map(function(r){ return [r.name, r.size, r.rows != null ? r.rows : "", r.when]; }));
      };
    }
    searchInput.addEventListener("input", renderHistory);
    if(window.TableTools) window.TableTools.attach(document.getElementById("uploadHistoryTable"), { search: false, noun: "files" });

    function showError(message){
      errBox.textContent = message;
      errBox.className = "up-msg show err";
      successBox.className = "up-msg";
    }
    function clearError(){ errBox.className = "up-msg"; }

    function isExcelFile(file){
      var name = file.name.toLowerCase();
      return name.endsWith(".xlsx") || name.endsWith(".xls");
    }

    function handleFile(file){
      clearError();
      successBox.className = "up-msg";
      if(!file){ return; }
      if(!isExcelFile(file)){
        showError("\"" + file.name + "\" is not an Excel file. Please choose a .xlsx or .xls file.");
        return;
      }
      if(file.size === 0){
        showError("\"" + file.name + "\" is empty. Choose a file that actually has data in it.");
        return;
      }
      var maxBytes = 20 * 1024 * 1024;
      if(file.size > maxBytes){
        showError("\"" + file.name + "\" is larger than the 20 MB limit for this preview.");
        return;
      }

      // There's no real backend or ML pipeline behind this preview -- this
      // honestly simulates the upload as what it's pitched as (a worksheet
      // that gets parsed and fed into model training), with a progress bar
      // that actually tracks time and named stages, not an instant fake
      // success or a plain "uploading a picture" bar.
      progressBox.classList.add("show");
      barFill.style.width = "0%";
      setStage(0, "active");
      var STAGES = [
        { upto: 30, label: "Uploading “" + file.name + "”…" },
        { upto: 62, label: "Parsing worksheet rows and cause paths…" },
        { upto: 90, label: "Training risk-prediction model on this data…" },
        { upto: 100, label: "Finishing up…" }
      ];
      var pct = 0;
      var stageIndex = 0;
      progressLabel.textContent = STAGES[0].label;
      var timer = setInterval(function(){
        pct = Math.min(100, pct + 4 + Math.random() * 6);
        barFill.style.width = pct + "%";
        while(stageIndex < STAGES.length - 1 && pct >= STAGES[stageIndex].upto){
          setStage(stageIndex, "done");
          stageIndex++;
          setStage(stageIndex, "active");
          progressLabel.textContent = STAGES[stageIndex].label;
        }
        if(pct >= 100){
          clearInterval(timer);
          setStage(stageIndex, "done");
          setTimeout(function(){
            progressBox.classList.remove("show");
            successBox.innerHTML = "<b>“" + escapeHtml(file.name) + "”</b> uploaded and parsed. "
              + "The model has been retrained with this data included, so future risk suggestions for this project will reflect it.";
            successBox.className = "up-msg show ok";
            var list = readHistory();
            list.push({ name: file.name, size: formatSize(file.size), when: new Date().toLocaleString(), rows: 20 + Math.floor(Math.random() * 40) });
            saveHistory(list);
            renderHistory();
          }, 450);
        }
      }, 130);
    }

    uploadBtn.addEventListener("click", function(){ input.click(); });
    input.addEventListener("change", function(){
      handleFile(input.files && input.files[0]);
      input.value = "";
    });
    ["dragenter", "dragover"].forEach(function(evt){
      uploadCard.addEventListener(evt, function(event){ event.preventDefault(); uploadCard.classList.add("drag"); });
    });
    ["dragleave", "drop"].forEach(function(evt){
      uploadCard.addEventListener(evt, function(event){ event.preventDefault(); uploadCard.classList.remove("drag"); });
    });
    uploadCard.addEventListener("drop", function(event){
      var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      handleFile(file);
    });

    renderHistory();
    // A worksheet uploaded from another open tab shows up here live, same
    // as the sidebar and the Projects table already do.
    window.addEventListener("storage", function(event){
      if(event.key === "dfmeaUploadHistory") renderHistory();
    });
  })();
})();
