(function(){
  "use strict";
  // Custom dropdowns for the whole app. A native <select> can be restyled while it is closed,
  // but its open list is always the browser's own. So every <select> is replaced by a button and
  // a list that match the rest of the app, and the original <select> stays as the data (hidden),
  // so all the code that reads .value, sets it or listens for "change" keeps working unchanged.
  // Selects added later (filters, form fields built by script) are picked up automatically.
  var LIST_GAP = 4, EDGE = 12, MAX_HEIGHT = 280;
  var valueDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  var indexDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "selectedIndex");

  function enhanceSelect(select){
    if(!select || select.dataset.enhanced || select.multiple || select.size > 1 || select.closest(".csel")) return;
    select.dataset.enhanced = "true";
    var wrap = document.createElement("div");
    wrap.className = "csel";
    // A select that was a block-level, full-width control stays one; the rest sit in a line.
    var display = window.getComputedStyle(select);
    if(display.display === "block" || select.style.width === "100%" || select.closest(".nd-field,.login-field,.ce-field,.wf-col")) wrap.classList.add("csel-block");
    ["fsel", "tt-filter", "tt-size-sel", "tt-select"].forEach(function(cls){
      if(select.classList.contains(cls)) wrap.classList.add("csel-" + cls);
    });
    select.parentNode.insertBefore(wrap, select);
    select.classList.add("csel-native");
    select.tabIndex = -1;
    wrap.appendChild(select);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "csel-btn";
    btn.setAttribute("aria-haspopup", "listbox");
    btn.setAttribute("aria-expanded", "false");
    var labelled = select.getAttribute("aria-label") || select.getAttribute("data-tip");
    if(labelled) btn.setAttribute("aria-label", labelled);
    btn.innerHTML = '<span class="csel-label"></span><svg class="csel-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
    wrap.appendChild(btn);
    var labelEl = btn.querySelector(".csel-label");

    // The list lives in <body> (or in the dialog this select is in, so it shares the dialog's top
    // layer) and is positioned from the button's screen position, so no parent's overflow,
    // z-index or stacking context can clip it or hide it.
    var list = document.createElement("div");
    list.className = "csel-list";
    list.setAttribute("role", "listbox");
    list.hidden = true;
    (select.closest("dialog") || document.body).appendChild(list);

    var active = -1;
    function syncLabel(){
      var opt = select.options[select.selectedIndex];
      labelEl.textContent = opt ? opt.textContent : "";
      btn.classList.toggle("is-placeholder", !opt || opt.value === "");
      btn.disabled = select.disabled;
      btn.classList.toggle("disabled", select.disabled);
    }
    function items(){ return Array.prototype.slice.call(list.children); }
    function setActive(i){
      var all = items();
      if(!all.length) return;
      active = Math.max(0, Math.min(all.length - 1, i));
      all.forEach(function(el, n){ el.classList.toggle("active", n === active); });
      var el = all[active];
      if(el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
    }
    function choose(opt){
      if(opt.disabled) return;
      select.value = opt.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      closeList();
      btn.focus();
    }
    function buildList(){
      list.innerHTML = "";
      Array.prototype.slice.call(select.options).forEach(function(opt){
        var item = document.createElement("div");
        item.className = "csel-opt" + (opt.selected ? " sel" : "") + (opt.disabled ? " disabled" : "");
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", String(opt.selected));
        item.textContent = opt.textContent;
        item.addEventListener("click", function(){ choose(opt); });
        list.appendChild(item);
      });
    }
    // Opens below the button, or above it when there is more room there; never wider than the
    // screen and never off either side of it.
    function positionList(){
      var r = btn.getBoundingClientRect();
      var viewW = document.documentElement.clientWidth, viewH = window.innerHeight;
      var width = Math.min(Math.max(r.width, 150), viewW - EDGE * 2);
      var left = Math.max(EDGE, Math.min(r.left, viewW - width - EDGE));
      var below = viewH - r.bottom - EDGE, above = r.top - EDGE;
      var up = below < Math.min(MAX_HEIGHT, list.scrollHeight) && above > below;
      list.style.left = left + "px";
      list.style.width = width + "px";
      list.style.maxHeight = Math.max(120, Math.min(MAX_HEIGHT, up ? above - LIST_GAP : below - LIST_GAP)) + "px";
      if(up){ list.style.top = ""; list.style.bottom = (viewH - r.top + LIST_GAP) + "px"; }
      else{ list.style.bottom = ""; list.style.top = (r.bottom + LIST_GAP) + "px"; }
    }
    function onKeydown(event){
      if(event.key === "Escape"){
        // Claim Escape first so it doesn't also close the dialog underneath.
        event.preventDefault(); event.stopPropagation();
        closeList(); btn.focus();
      }else if(event.key === "ArrowDown"){ event.preventDefault(); setActive(active + 1); }
      else if(event.key === "ArrowUp"){ event.preventDefault(); setActive(active - 1); }
      else if(event.key === "Home"){ event.preventDefault(); setActive(0); }
      else if(event.key === "End"){ event.preventDefault(); setActive(items().length - 1); }
      else if(event.key === "Enter" || event.key === " "){
        event.preventDefault();
        var opt = select.options[active];
        if(opt) choose(opt);
      }else if(event.key === "Tab"){ closeList(); }
      else if(event.key.length === 1){
        // Type to jump to the next option starting with that letter.
        var ch = event.key.toLowerCase(), all = Array.prototype.slice.call(select.options);
        for(var n = 1; n <= all.length; n++){
          var i = (active + n) % all.length;
          if(all[i].textContent.trim().toLowerCase().indexOf(ch) === 0){ setActive(i); break; }
        }
      }
    }
    function onScroll(event){ if(!list.contains(event.target)) closeList(); }
    function onDocClick(event){ if(!wrap.contains(event.target) && !list.contains(event.target)) closeList(); }
    function openList(){
      if(select.disabled) return;
      buildList();
      list.hidden = false;
      positionList();
      wrap.classList.add("open");
      btn.setAttribute("aria-expanded", "true");
      setActive(select.selectedIndex);
      document.addEventListener("click", onDocClick);
      document.addEventListener("keydown", onKeydown, true);
      window.addEventListener("scroll", onScroll, true);
      window.addEventListener("resize", closeList);
    }
    function closeList(){
      list.hidden = true;
      wrap.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKeydown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", closeList);
    }
    btn.addEventListener("click", function(event){
      event.stopPropagation();
      if(list.hidden) openList(); else closeList();
    });
    btn.addEventListener("keydown", function(event){
      if(event.key === "ArrowDown" || event.key === "ArrowUp"){ event.preventDefault(); if(list.hidden) openList(); }
    });
    select.addEventListener("change", syncLabel);
    // Script that rebuilds a select's options, or sets its value, keeps the button in step.
    new MutationObserver(syncLabel).observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled", "selected"] });
    Object.defineProperty(select, "value", { configurable: true,
      get: function(){ return valueDesc.get.call(this); },
      set: function(v){ valueDesc.set.call(this, v); syncLabel(); } });
    Object.defineProperty(select, "selectedIndex", { configurable: true,
      get: function(){ return indexDesc.get.call(this); },
      set: function(v){ indexDesc.set.call(this, v); syncLabel(); } });
    syncLabel();
    select.refreshCustomSelect = syncLabel;
    // A select that is removed from the page takes its list with it.
    new MutationObserver(function(){
      if(!document.body.contains(wrap)){ list.remove(); this.disconnect(); }
    }).observe(document.body, { childList: true, subtree: true });
  }
  window.enhanceSelect = enhanceSelect;

  function enhanceAll(root){
    if(!root || !root.querySelectorAll) return;
    if(root.tagName === "SELECT") enhanceSelect(root);
    Array.prototype.slice.call(root.querySelectorAll("select")).forEach(enhanceSelect);
  }
  function start(){
    enhanceAll(document.body);
    new MutationObserver(function(records){
      records.forEach(function(r){
        Array.prototype.slice.call(r.addedNodes).forEach(function(node){
          if(node.nodeType === 1 && !(node.classList && node.classList.contains("csel-list"))) enhanceAll(node);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
