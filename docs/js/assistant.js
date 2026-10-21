(function(){
  "use strict";
  // The AI assistant: a collapsible panel on the right of every page, a
  // dedicated page (ai-assistant.html) and the detailed AI summary pages.
  // This is a static front end, so the answers are written in advance and
  // picked by what the question is about; the same answers are used
  // everywhere so the assistant never contradicts itself.
  var CHAT_KEY = "dfmeaAssistantChat";
  var OPEN_KEY = "dfmeaAssistantOpen";
  var SPARK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M19.967 17.484A4 4 0 0 1 18 18"/></svg>';

  function esc(value){
    var div = document.createElement("div");
    div.textContent = String(value);
    return div.innerHTML;
  }
  // Bold (**text**) and line breaks are the only formatting the answers use.
  function fmt(text){
    return esc(text).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
  }
  function pageName(){ return window.location.pathname.split("/").pop() || "index.html"; }

  // ---------------------------------------------------------------
  // What each customer file contains (used to explain a reference).
  // ---------------------------------------------------------------
  var CRIMP_NOTE = "the customer's Crimp DFMEA: six functions (crimp contact resistance, conductor crimp pull-out force, terminal bend resistance and three cable seal functions), each with its failure mode and effect, and " + window.DfmeaRefs.CRIMP.paths + " cause paths down to Level " + window.DfmeaRefs.CRIMP.depth;
  function fileNote(){
    return CRIMP_NOTE;
  }
  var CATEGORY_EVIDENCE = {
    mechanical: { shows: "cause chains for crimp geometry, conductor strength and pull-out, such as crimp width and height, strand damage and insufficient crimp",
      use: "each mechanical cause was mapped to a pull-out, retention or force check on this requirement", control: "force and geometry verification (tensile or pull-out test, CMM inspection)" },
    electrical: { shows: "the contact resistance chains: wire strand to terminal interface, film resistance and Sn oxide",
      use: "the resistance limit on this requirement was checked against those chains", control: "4-wire resistance measurement before and after cycling" },
    environmental: { shows: "causes that grow over time: oxide build-up, plating wear and thermal expansion of the crimp",
      use: "the environmental exposure in this requirement was linked to those time-dependent causes", control: "thermal cycling, vibration and humidity test sequences" },
    material: { shows: "plating and base alloy causes, such as insufficient Sn or Ni thickness and inadequate annealing",
      use: "the material limits in this requirement were set so those plating and alloy causes are prevented", control: "plating thickness and material certificate checks" },
    manufacturing: { shows: "process causes such as crimp force, lubricant and tooling variation, with their detection ratings",
      use: "each process cause became a monitored limit on this requirement", control: "crimp force monitoring and process capability tracking" },
    quality: { shows: "the current design controls, detection and RPN values recorded against each cause",
      use: "the inspection and traceability in this requirement follow the controls recorded there", control: "inspection records and lot traceability" },
    general: { shows: "the cause levels and ratings recorded for the crimp joint",
      use: "this requirement was checked against those cause levels", control: "review of the listed causes" }
  };

  // ---------------------------------------------------------------
  // Detailed summaries (the AI summary pages)
  // ---------------------------------------------------------------
  // Short, one-sentence summary of a DFMEA, for its table row.
  var CRIMP_SHORT = "The crimped joint in six functions (contact resistance, pull-out force, terminal bend and the cable seal), with " + window.DfmeaRefs.CRIMP.causes + " causes across " + window.DfmeaRefs.CRIMP.paths + " paths.";
  function dfmeaShort(fn, severity){
    if(fn === window.DfmeaRefs.CRIMP.functionLabel) return CRIMP_SHORT;
    return "Starting structure for " + (fn || "this function") + ": its failure mode, effect and cause paths" + (severity ? ", severity " + severity : "") + ".";
  }

  function specDetail(doc, rowIndex, file){
    var DR = window.DfmeaReqDocs;
    var parts = DR.splitSpec(doc.specs[rowIndex - 1]);
    var key = parts.category.toLowerCase();
    var ev = CATEGORY_EVIDENCE[key] || CATEGORY_EVIDENCE.general;
    var confidence = !file ? "None cited" : (rowIndex % 3 === 0 ? "Medium" : "High");
    var rows = file ? [
      ["Requirement", parts.text],
      ["Reference used", file],
      ["What the reference contains", fileNote(file)],
      ["What it shows for this requirement", ev.shows.charAt(0).toUpperCase() + ev.shows.slice(1)],
      ["How it was used", ev.use.charAt(0).toUpperCase() + ev.use.slice(1)],
      ["How it is verified", ev.control.charAt(0).toUpperCase() + ev.control.slice(1)],
      ["Match confidence", confidence]
    ] : [
      ["Requirement", parts.text],
      ["Reference used", "No customer file is cited for this requirement"],
      ["Where it comes from", "It comes from the " + (doc.standard && doc.standard !== "None" ? doc.standard + " standard" : "project description") + " rather than from a customer DFMEA file"],
      ["How it is verified", ev.control.charAt(0).toUpperCase() + ev.control.slice(1)]
    ];
    var summary = file
      ? "This " + parts.category.toLowerCase() + " requirement was matched to " + file + ", which contains " + fileNote(file) + ". "
        + "The cause chains recorded there show where this requirement can be missed, so " + ev.use + "."
      : "This " + parts.category.toLowerCase() + " requirement does not rely on a customer DFMEA file. It is carried from the " + (doc.standard && doc.standard !== "None" ? doc.standard + " standard" : "project description") + " and is verified by " + ev.control + ".";
    return { category: parts.category, text: parts.text, rows: rows, summary: summary };
  }

  function dfmeaDetail(info){
    var refs = info.refs || [];
    var fn = info.fn || info.name;
    var rows = [
      ["Function", fn],
      ["Severity", info.severity ? String(info.severity) : "Not rated"],
      ["Structure", window.DfmeaRefs.CRIMP_STRUCTURE.charAt(0).toUpperCase() + window.DfmeaRefs.CRIMP_STRUCTURE.slice(1)],
      ["References", refs.length ? refs.length + " customer file" + (refs.length === 1 ? "" : "s") : "None selected"]
    ];
    var why = refs.map(function(f){ return [f, "Used because it contains " + fileNote(f) + "."]; });
    var summary = dfmeaShort(info.fn, info.severity) + (refs.length
      ? " It was built from " + (refs.length === 1 ? "the customer's own file" : refs.length + " of the customer's own files") + ", so every cause traces back to a document they provided."
      : " No customer file is attached to it yet.");
    return { summary: summary, rows: rows, why: why };
  }

  // ---------------------------------------------------------------
  // Answers
  // ---------------------------------------------------------------
  var TOPICS = [
    { keys: ["hello", "hi ", "hey", "good morning", "good evening"], text: function(){ return "Hello! I can explain the DFMEAs, design requirements and references in this workspace, or help you create a project. What would you like to know?"; } },
    { keys: ["thank"], text: function(){ return "You are welcome. Ask me anything else about the DFMEAs or requirements."; } },
    { keys: ["severity", "occurrence", "detection", "rpn", "rating"], text: function(){ return "**Severity** rates how serious the effect is (1 to 10). **Occurrence** rates how likely the cause is, and **Detection** rates how likely the current controls are to catch it. The **RPN** is Severity x Occurrence x Detection, and the worksheet colours the left bar of each final cause by it: red for 100 and above, amber for 40 to 99, green below 40."; } },
    { keys: ["contact resistance", "crimp", "0.55", "mohm", "resistance"], text: function(){ return "The Crimp DFMEA looks at contact resistance rising above **0.55 mOhm** after crimping. Its causes run from the wire strand to terminal interface, through film resistance and Sn oxide, down to crimp geometry and plating."; } },
    { keys: ["why", "reference", "referenc", "source", "where did", "come from", "taken from"], text: function(){ return "Every reference in this workspace is the customer's own file, **Crimp DFMEA.pdf**. A DFMEA or requirement cites it when its cause chains sit behind that item. Open the AI summary on any row to see exactly why."; } },
    { keys: ["legacy", "uploaded", "files", "documents"], text: function(){ return "Legacy DFMEA lists the file the customer shared: **Crimp DFMEA.pdf**, their Crimp DFMEA worksheet. You can upload more there, and they will appear in the same table."; } },
    { keys: ["lv214", "uscar", "iso", "standard"], text: function(){ return "A project's reference standard (for example **LV214** or **USCAR-2**) sets the limits its design requirements are written to. Choose it when you create a project, and the generated specification follows that standard."; } },
    { keys: ["requirement", "specification", "drs", "spec"], text: function(){ return "A **design requirement specification** (DRS) is the list of requirements a product must meet, grouped by category such as Mechanical, Electrical and Environmental. Each requirement can cite the customer file it came from, and you can search, filter and sort the list on any page that shows one."; } },
    { keys: ["create", "new project", "new dfmea", "how do i", "start"], text: function(){ return "To start a project, open **Projects** and choose **Create project**: give it a name, describe what you are building, pick the standard and a specification, then generate. To add a DFMEA to a project, open it and choose **New DFMEA**."; } },
    { keys: ["filter", "search", "sort", "page"], text: function(){ return "Every table has a search box and filters above it. Click a column heading to sort, and use the page controls underneath to move through long lists. **Clear filters** brings every row back."; } },
    { keys: ["theme", "colour", "color"], text: function(){ return "Use the palette button at the top right of any page to change the colour theme. The whole app changes and your choice is remembered."; } },
    { keys: ["summary", "summar", "what is this", "explain this", "about this"], text: function(ctx){ return pageSummary(ctx); } },
    { keys: ["confidence", "how sure", "accurate"], text: function(){ return "Confidence reflects how closely a requirement matches the cause chains in the cited file: **High** when the file covers the same failure mechanism, **Medium** when it covers it only in part."; } },
    { keys: ["next", "what should i do", "recommend"], text: function(){ return "A good next step is to open the AI summary for a requirement, check the reference it cites, and then open that file from the References list to confirm it. After that, review any requirement with no reference."; } }
  ];
  function pageSummary(ctx){
    var p = (ctx && ctx.page) || pageName();
    var map = {
      "projects.html": "This page lists every project. Open one to see its design requirement specification and its DFMEAs, or create a new project.",
      "project.html": "This is a project. The specification at the top lists its requirements with the customer file each came from, and the table below lists its DFMEAs with a short AI summary of each.",
      "index.html": "This is a DFMEA. The risk tree shows the chain from function to failure mode to causes, and the worksheet below holds the same causes row by row with their ratings.",
      "upload.html": "Legacy DFMEA lists the customer's own files that every reference in the app points back to.",
      "requirement-specs.html": "Design Requirements lists every specification on file, the standard it follows, the categories it covers and the file it came from.",
      "ai-assistant.html": "This is the AI assistant. Ask about any DFMEA, requirement or reference in the workspace."
    };
    return map[p] || "This page is part of the DFMEA workspace. Ask me about the DFMEAs, requirements or references and I will explain them.";
  }
  var FALLBACK = "I can help with DFMEAs, design requirements, references and the standards used here. Try asking: **Why was this reference used?**, **What does severity mean?** or **How do I create a project?**";

  function reply(text, ctx){
    var q = " " + String(text || "").toLowerCase() + " ";
    // Questions about a specific summary page answer from that page first.
    if(ctx && ctx.answers){
      for(var k = 0; k < ctx.answers.length; k++){
        if(ctx.answers[k].keys.some(function(w){ return q.indexOf(w) !== -1; })) return ctx.answers[k].text;
      }
    }
    for(var i = 0; i < TOPICS.length; i++){
      if(TOPICS[i].keys.some(function(w){ return q.indexOf(w) !== -1; })) return TOPICS[i].text(ctx);
    }
    return FALLBACK;
  }

  // ---------------------------------------------------------------
  // Chat widget (panel, assistant page, summary pages)
  // ---------------------------------------------------------------
  function loadChat(){
    try{ return JSON.parse(localStorage.getItem(CHAT_KEY) || "[]"); }catch(error){ return []; }
  }
  function saveChat(list){
    try{ localStorage.setItem(CHAT_KEY, JSON.stringify(list.slice(-40))); }catch(error){ /* history just won't persist */ }
  }
  var mounted = [];

  function mountChat(root, opts){
    opts = opts || {};
    root.classList.add("ac");
    root.innerHTML = '<div class="ac-msgs" aria-live="polite"></div>'
      + '<div class="ac-sugs"></div>'
      + '<form class="ac-form"><textarea rows="1" placeholder="' + esc(opts.placeholder || "Ask anything") + '" aria-label="Message"></textarea>'
      + '<button type="submit" class="ac-send" aria-label="Send"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg></button></form>';
    var msgs = root.querySelector(".ac-msgs");
    var sugs = root.querySelector(".ac-sugs");
    var form = root.querySelector(".ac-form");
    var input = form.querySelector("textarea");
    var history = opts.persist ? loadChat() : [];

    function bubble(role, text){
      var el = document.createElement("div");
      el.className = "ac-msg " + role;
      el.innerHTML = (role === "bot" ? '<span class="ac-av">' + SPARK + '</span>' : "") + '<div class="ac-bubble">' + fmt(text) + '</div>';
      msgs.appendChild(el);
      msgs.scrollTop = msgs.scrollHeight;
      return el;
    }
    function renderAll(){
      msgs.innerHTML = "";
      if(!history.length) bubble("bot", opts.welcome || "Hello! Ask me anything about your DFMEAs, requirements and references.");
      history.forEach(function(m){ bubble(m.role, m.text); });
      sugs.hidden = history.length > 0 && !opts.alwaysSuggest;
    }
    sugs.innerHTML = (opts.suggestions || []).map(function(s){ return '<button type="button">' + esc(s) + '</button>'; }).join("");
    function ask(text){
      text = text.trim();
      if(!text) return;
      history.push({ role: "user", text: text });
      bubble("user", text);
      sugs.hidden = !opts.alwaysSuggest;
      var typing = document.createElement("div");
      typing.className = "ac-msg bot";
      typing.innerHTML = '<span class="ac-av">' + SPARK + '</span><div class="ac-bubble ac-typing"><i></i><i></i><i></i></div>';
      msgs.appendChild(typing);
      msgs.scrollTop = msgs.scrollHeight;
      var ctx = typeof opts.context === "function" ? opts.context() : opts.context;
      setTimeout(function(){
        typing.remove();
        var answer = reply(text, ctx);
        history.push({ role: "bot", text: answer });
        bubble("bot", answer);
        if(opts.persist) saveChat(history);
        if(opts.persist) mounted.forEach(function(m){ if(m !== api && m.persist) m.sync(); });
      }, 650);
    }
    form.addEventListener("submit", function(event){
      event.preventDefault();
      var value = input.value;
      input.value = "";
      input.style.height = "";
      ask(value);
    });
    input.addEventListener("keydown", function(event){
      if(event.key === "Enter" && !event.shiftKey){ event.preventDefault(); form.requestSubmit(); }
    });
    input.addEventListener("input", function(){
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 110) + "px";
    });
    sugs.addEventListener("click", function(event){
      var b = event.target.closest("button");
      if(b) ask(b.textContent);
    });
    var api = {
      persist: !!opts.persist, ask: ask, focus: function(){ input.focus(); },
      sync: function(){ history = loadChat(); renderAll(); },
      clear: function(){ history = []; if(opts.persist) saveChat(history); renderAll(); }
    };
    renderAll();
    mounted.push(api);
    return api;
  }

  var SUGGESTIONS = ["Why was this reference used?", "What does severity mean?", "How do I create a project?", "Summarise this page"];

  // ---------------------------------------------------------------
  // Right-hand panel + toggle + sidebar link
  // ---------------------------------------------------------------
  function init(){
    var page = pageName();
    var side = document.querySelector(".side");
    if(side && !document.getElementById("navAi")){
      var nav = document.createElement("div");
      nav.className = "nav" + (page === "ai-assistant.html" ? " on" : "");
      nav.id = "navAi";
      nav.innerHTML = '<span class="ni">' + SPARK.replace('width="14" height="14"', 'width="17" height="17"') + '</span>AI Assistant';
      nav.addEventListener("click", function(){ window.location.href = "ai-assistant.html"; });
      // First item in the sidebar, above Legacy DFMEA.
      var brand = side.querySelector(".brand");
      side.insertBefore(nav, brand ? brand.nextSibling : side.firstChild);
    }
    if(page === "ai-assistant.html" || page === "ai-summary.html" || page === "login.html") return;
    var host = document.querySelector(".top") || document.querySelector(".sa-head");
    if(!host) return;

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "ai-toggle";
    toggle.setAttribute("aria-label", "AI Assistant");
    toggle.innerHTML = SPARK;
    toggle.title = "AI Assistant";
    host.appendChild(toggle);

    var panel = document.createElement("aside");
    panel.id = "aiPanel";
    panel.className = "ai-panel";
    panel.setAttribute("aria-label", "AI Assistant");
    panel.innerHTML = '<div class="ai-head"><span class="ai-title">' + SPARK + 'AI Assistant</span>'
      + '<button type="button" class="ai-clear" data-tip="Start a new conversation">New chat</button>'
      + '<button type="button" class="ai-close" aria-label="Collapse the assistant"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button></div>'
      + '<div class="ai-body"></div>';
    document.body.appendChild(panel);
    var chat = mountChat(panel.querySelector(".ai-body"), {
      persist: true, suggestions: SUGGESTIONS, context: function(){ return { page: pageName() }; },
      placeholder: "Ask the assistant", welcome: "Hello! I am your AI assistant. Ask me about the DFMEAs, requirements and references on this page, or anything else in the workspace."
    });
    panel.querySelector(".ai-clear").addEventListener("click", chat.clear);

    function setOpen(open){
      document.body.classList.toggle("ai-open", open);
      toggle.classList.toggle("on", open);
      toggle.setAttribute("aria-expanded", String(open));
      panel.setAttribute("aria-hidden", String(!open));
      try{ localStorage.setItem(OPEN_KEY, open ? "1" : "0"); }catch(error){ /* state just won't persist */ }
      if(open) setTimeout(chat.focus, 220);
    }
    toggle.addEventListener("click", function(){ setOpen(!document.body.classList.contains("ai-open")); });
    panel.querySelector(".ai-close").addEventListener("click", function(){ setOpen(false); });
    var wasOpen = false;
    try{ wasOpen = localStorage.getItem(OPEN_KEY) === "1"; }catch(error){ wasOpen = false; }
    document.body.classList.add("ai-instant");
    setOpen(wasOpen);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ document.body.classList.remove("ai-instant"); }); });
    window.addEventListener("storage", function(event){
      if(event.key === CHAT_KEY) chat.sync();
    });
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  window.DfmeaAI = { reply: reply, mountChat: mountChat, specDetail: specDetail, dfmeaDetail: dfmeaDetail, dfmeaShort: dfmeaShort,
    fileNote: fileNote, spark: SPARK, esc: esc, SUGGESTIONS: SUGGESTIONS };
})();
