(function(){
  "use strict";
  // Colour themes. Every accent colour in the app is a CSS variable
  // (--p50 ... --p800, --p-alt, --bg) defined in style.css; choosing a theme
  // here just swaps those values, so the whole app changes at once. The
  // choice is saved and applied before the page paints, on every page.
  var KEY = "dfmeaTheme";
  var THEMES = {
    indigo:  { label: "Indigo",  p: ["#EEF2FF","#E0E7FF","#C7D2FE","#A5B4FC","#818CF8","#6366F1","#4F46E5","#4338CA","#3730A3"], alt: "#8B5CF6", bg: "#F4F6FB" },
    blue:    { label: "Blue",    p: ["#EFF6FF","#DBEAFE","#BFDBFE","#93C5FD","#60A5FA","#3B82F6","#2563EB","#1D4ED8","#1E40AF"], alt: "#06B6D4", bg: "#F2F6FC" },
    teal:    { label: "Teal",    p: ["#F0FDFA","#CCFBF1","#99F6E4","#5EEAD4","#2DD4BF","#14B8A6","#0D9488","#0F766E","#115E59"], alt: "#0EA5E9", bg: "#F1F7F7" },
    emerald: { label: "Emerald", p: ["#ECFDF5","#D1FAE5","#A7F3D0","#6EE7B7","#34D399","#10B981","#059669","#047857","#065F46"], alt: "#14B8A6", bg: "#F1F7F4" },
    violet:  { label: "Violet",  p: ["#F5F3FF","#EDE9FE","#DDD6FE","#C4B5FD","#A78BFA","#8B5CF6","#7C3AED","#6D28D9","#5B21B6"], alt: "#EC4899", bg: "#F6F4FC" },
    rose:    { label: "Rose",    p: ["#FFF1F2","#FFE4E6","#FECDD3","#FDA4AF","#FB7185","#F43F5E","#E11D48","#BE123C","#9F1239"], alt: "#F97316", bg: "#FBF4F6" },
    orange:  { label: "Orange",  p: ["#FFF7ED","#FFEDD5","#FED7AA","#FDBA74","#FB923C","#F97316","#EA580C","#C2410C","#9A3412"], alt: "#F43F5E", bg: "#FBF6F1" }
  };
  var STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800];

  function rgbOf(hex){
    return parseInt(hex.slice(1, 3), 16) + " " + parseInt(hex.slice(3, 5), 16) + " " + parseInt(hex.slice(5, 7), 16);
  }
  function read(){
    try{ var t = localStorage.getItem(KEY); return THEMES[t] ? t : "indigo"; }catch(error){ return "indigo"; }
  }
  function apply(name){
    var theme = THEMES[name] || THEMES.indigo;
    var root = document.documentElement.style;
    STEPS.forEach(function(step, i){ root.setProperty("--p" + step, theme.p[i]); });
    root.setProperty("--p500-rgb", rgbOf(theme.p[5]));
    root.setProperty("--p600-rgb", rgbOf(theme.p[6]));
    root.setProperty("--p700-rgb", rgbOf(theme.p[7]));
    root.setProperty("--p-alt", theme.alt);
    root.setProperty("--bg", theme.bg);
    document.documentElement.setAttribute("data-theme", name);
  }
  apply(read());

  window.addEventListener("storage", function(event){
    if(event.key === KEY) apply(read());
  });

  document.addEventListener("DOMContentLoaded", function(){
    var host = document.querySelector(".top") || document.querySelector(".sa-head");
    var wrap = document.createElement("div");
    wrap.className = "theme-pick" + (host ? "" : " floating");
    wrap.innerHTML = '<button type="button" class="theme-btn" aria-label="Colour theme" aria-haspopup="true" aria-expanded="false">'
      + '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7.5" r="1"/><circle cx="14.5" cy="7.5" r="1"/></svg>'
      + '<i class="theme-dot"></i></button>'
      + '<div class="theme-menu" hidden role="menu"><div class="theme-title">Colour theme</div><div class="theme-grid"></div></div>';
    (host || document.body).appendChild(wrap);

    var btn = wrap.querySelector(".theme-btn");
    var menu = wrap.querySelector(".theme-menu");
    var grid = wrap.querySelector(".theme-grid");
    function render(){
      var current = read();
      grid.innerHTML = Object.keys(THEMES).map(function(name){
        var t = THEMES[name];
        return '<button type="button" class="theme-swatch' + (name === current ? " on" : "") + '" data-theme-name="' + name + '" role="menuitemradio" aria-checked="' + (name === current) + '" title="' + t.label + '">'
          + '<i style="background:linear-gradient(135deg,' + t.p[6] + ',' + t.alt + ')"></i><span>' + t.label + '</span></button>';
      }).join("");
    }
    render();
    function close(){ menu.hidden = true; btn.setAttribute("aria-expanded", "false"); }
    btn.addEventListener("click", function(event){
      event.stopPropagation();
      menu.hidden = !menu.hidden;
      btn.setAttribute("aria-expanded", String(!menu.hidden));
    });
    grid.addEventListener("click", function(event){
      var sw = event.target.closest(".theme-swatch");
      if(!sw) return;
      var name = sw.getAttribute("data-theme-name");
      try{ localStorage.setItem(KEY, name); }catch(error){ /* theme just won't persist */ }
      apply(name);
      render();
      close();
    });
    document.addEventListener("click", function(event){ if(!wrap.contains(event.target)) close(); });
    document.addEventListener("keydown", function(event){ if(event.key === "Escape") close(); });
  });
})();
