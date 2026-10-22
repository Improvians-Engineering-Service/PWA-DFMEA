(function(){
  "use strict";
  // Figma-style tools for the full diagram view: Select (the normal pointer, the default) and
  // Hand (drag anywhere to move around). V and H switch between them, and holding Space gives the
  // hand for as long as it is held. The diagram itself is not touched, so removing this file
  // (and its <script> line) takes the tools away and leaves everything else as it was.
  var wrap = document.getElementById("treeWrap");
  var zoom = document.getElementById("treeZoom");
  if(!wrap || !zoom) return;

  var tool = "select";   // "select" | "hand"
  var spaceHeld = false;
  var panning = null;

  var style = document.createElement("style");
  // The tools sit in a small bar fixed at the bottom centre of the view, like the overview map at
  // the bottom left, so they stay put while the diagram scrolls.
  style.textContent =
    ".tt-tools{display:none;position:fixed;left:50%;bottom:30px;transform:translateX(-50%);z-index:6;align-items:center;gap:6px;padding:6px;"
    + "background:#fff;border:1px solid #E4EAF2;border-radius:12px;box-shadow:0 10px 28px -8px rgba(15,23,42,.28),0 2px 6px rgba(15,23,42,.08)}"
    + "#treeWrap.open .tt-tools{display:flex}"
    + ".tt-tools button{width:32px;height:32px;display:flex;align-items:center;justify-content:center;padding:0;border:1px solid transparent;border-radius:8px;background:transparent;color:#475569;cursor:pointer}"
    + ".tt-tools button:hover{background:#F1F5F9}"
    + ".tt-tools button.on{background:var(--p50);border-color:var(--p300);color:var(--p700)}"
    + "#treeWrap.hand-on #treeZoom,#treeWrap.hand-on #treeZoom *{cursor:grab!important}"
    + "#treeWrap.hand-on.panning #treeZoom,#treeWrap.hand-on.panning #treeZoom *{cursor:grabbing!important}";
  document.head.appendChild(style);

  var group = document.createElement("div");
  group.className = "tt-tools";
  group.setAttribute("role", "toolbar");
  group.setAttribute("aria-label", "Diagram tools");
  group.innerHTML =
    '<button type="button" data-tool="select" data-tip="Select (V): click cards and branches. This is the normal pointer.">'
    + '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3l14 7-6 2-2 6z"/></svg></button>'
    + '<button type="button" data-tool="hand" data-tip="Hand (H): drag anywhere to move around the diagram. Hold Space for a moment.">'
    + '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 11V6a2 2 0 0 0-4 0v1"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.4L3.4 16a2 2 0 0 1 3.2-2.4L8 15"/></svg></button>';
  wrap.appendChild(group);

  function handActive(){ return tool === "hand" || spaceHeld; }
  function paint(){
    wrap.classList.toggle("hand-on", handActive());
    Array.prototype.slice.call(group.children).forEach(function(b){
      b.classList.toggle("on", (handActive() ? "hand" : "select") === b.getAttribute("data-tool"));
    });
  }
  function setTool(name){ tool = name; paint(); }
  group.addEventListener("click", function(event){
    var b = event.target.closest("button");
    if(b) setTool(b.getAttribute("data-tool"));
  });

  // Dragging with the hand moves the view, and swallows the click that follows so a drag never
  // opens a branch or starts an edit.
  wrap.addEventListener("pointerdown", function(event){
    if(!handActive() || event.button !== 0 || !zoom.contains(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    panning = { x: event.clientX, y: event.clientY, left: wrap.scrollLeft, top: wrap.scrollTop, moved: false };
    wrap.classList.add("panning");
    try{ wrap.setPointerCapture(event.pointerId); }catch(error){ /* the drag still works without capture */ }
  }, true);
  wrap.addEventListener("pointermove", function(event){
    if(!panning) return;
    if(Math.abs(event.clientX - panning.x) > 3 || Math.abs(event.clientY - panning.y) > 3) panning.moved = true;
    wrap.scrollLeft = panning.left - (event.clientX - panning.x);
    wrap.scrollTop = panning.top - (event.clientY - panning.y);
  });
  function stopPan(){
    if(!panning) return;
    panning = null;
    wrap.classList.remove("panning");
  }
  wrap.addEventListener("pointerup", stopPan);
  wrap.addEventListener("pointercancel", stopPan);
  // With the hand, a click on the diagram is only ever the end of a drag (or a stray click): it
  // does nothing.
  wrap.addEventListener("click", function(event){
    if(handActive() && zoom.contains(event.target)){ event.stopPropagation(); event.preventDefault(); }
  }, true);

  function typing(target){
    return !!target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable);
  }
  function open(){ return wrap.classList.contains("open"); }
  document.addEventListener("keydown", function(event){
    if(!open() || typing(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
    var k = event.key.toLowerCase();
    if(k === "v") setTool("select");
    else if(k === "h") setTool("hand");
    else if(event.code === "Space" && !event.target.closest("button")){
      event.preventDefault();
      if(!spaceHeld){ spaceHeld = true; paint(); }
    }
  });
  document.addEventListener("keyup", function(event){
    if(event.code === "Space" && spaceHeld){ spaceHeld = false; paint(); }
  });

  // Closing the full view puts the pointer back as the tool.
  new MutationObserver(function(){
    if(!open()){ tool = "select"; spaceHeld = false; stopPan(); paint(); }
  }).observe(wrap, { attributes: true, attributeFilter: ["class"] });

  paint();
})();
