(function(){
  "use strict";
  // Colour themes. Every accent colour in the app is a CSS variable
  // (--p50 ... --p800, --p-alt, --bg) defined in style.css; choosing a theme
  // here just swaps those values, so the whole app changes at once. The
  // choice is saved and applied before the page paints, on every page.
  var KEY = "dfmeaTheme";
  var THEMES = {
    red:     { label: "Red",     p: ["#FFF1F1","#FFE0E0","#FFC2C2","#FF9999","#FF6666","#FF3333","#FF0000","#D90000","#B30000"], alt: "#F97316", bg: "#FBF4F4" },
    indigo:  { label: "Indigo",  p: ["#EEF0FA","#DDE1F5","#C0C7EA","#9AA3DB","#7681C9","#5A66B5","#4A54A1","#3E4786","#323A6B"], alt: "#7C6BB0", bg: "#F3F4F9" },
    blue:    { label: "Blue",    p: ["#EDF3FA","#D9E6F5","#B6CEE8","#8DB0D6","#6690C0","#4A76A8","#3B6290","#305176","#27425F"], alt: "#5B8FA8", bg: "#F2F5F9" },
    teal:    { label: "Teal",    p: ["#ECF6F5","#D5ECE9","#AEDAD4","#82C2BA","#5AA79E","#3F8D84","#2F766E","#275F59","#1F4B47"], alt: "#4E7DA0", bg: "#F1F6F6" },
    green:   { label: "Green",   p: ["#EDF5EF","#D8EBDD","#B4D7BE","#89BE99","#62A276","#478A5D","#38724A","#2D5C3D","#244A32"], alt: "#6B9A7C", bg: "#F2F6F3" },
    violet:  { label: "Violet",  p: ["#F3F0F8","#E6DFF1","#CFC3E3","#B3A1D1","#9680BC","#7C66A4","#66528C","#524272","#403459"], alt: "#A0679A", bg: "#F6F4F9" },
    rose:    { label: "Rose",    p: ["#FAF0F2","#F4DEE3","#E8BDC7","#D993A3","#C76C82","#B04F68","#963F56","#7B3346","#602837"], alt: "#C08457", bg: "#FAF5F6" },
    copper:  { label: "Copper",  p: ["#FAF3EC","#F3E3D2","#E6C7A6","#D5A573","#C28349","#A96A33","#8C5628","#70441F","#583519"], alt: "#B05A4A", bg: "#FAF6F2" },
    orange:  { label: "Orange",  p: ["#FFF4EA","#FFE6D0","#FFCDA1","#FFAE6B","#FA9040","#EC7415","#CF5F0A","#A94C0A","#833B0A"], alt: "#D97706", bg: "#FBF6F1" },
    amber:   { label: "Amber",   p: ["#FFF9E8","#FFF0C7","#FFE08F","#F8CB57","#EBB42A","#D49A12","#B07F0C","#8A640C","#6B4E0C"], alt: "#C2410C", bg: "#FAF8F1" },
    pink:    { label: "Pink",    p: ["#FFF0F7","#FFDFEE","#FFBEDD","#FB93C4","#F068A8","#DE478E","#C03075","#9C265F","#7A1E4A"], alt: "#8B5CF6", bg: "#FBF4F8" },
    cyan:    { label: "Cyan",    p: ["#ECFAFC","#D2F2F7","#A5E4EE","#6FD0E0","#3FB8CC","#1F9DB3","#16808F","#126773","#0F505A"], alt: "#4F7FD1", bg: "#F1F8F9" },
    slate:   { label: "Slate",   p: ["#F1F4F8","#E2E8F0","#CBD5E1","#A3B1C4","#7C8CA3","#5D6D86","#475569","#364253","#283241"], alt: "#64748B", bg: "#F4F6F9" },
    silver:  { label: "Silver",  p: ["#F6F6F7","#EBEBED","#D6D6DA","#B9B9BF","#9C9CA4","#82828B","#6B6B74","#55555D","#414147"], alt: "#8E8E96", bg: "#F7F7F8" },
    black:   { label: "Black",   p: ["#F3F3F3","#E4E4E4","#C8C8C8","#9E9E9E","#6E6E6E","#3F3F3F","#111111","#000000","#000000"], alt: "#525252", bg: "#F5F5F5" }
  };
  var STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800];

  function rgbOf(hex){
    return parseInt(hex.slice(1, 3), 16) + " " + parseInt(hex.slice(3, 5), 16) + " " + parseInt(hex.slice(5, 7), 16);
  }
  function read(){
    try{ var t = localStorage.getItem(KEY); return THEMES[t] ? t : "red"; }catch(error){ return "red"; }
  }
  function apply(name){
    var theme = THEMES[name] || THEMES.red;
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
