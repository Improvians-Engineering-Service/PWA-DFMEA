(function(){
  "use strict";
  // One colour for every card in the diagram, so it reads as a single structure; only a cause
  // identified as a manufacturing cause carries a second colour. This is a colour layer only: it
  // overrides how the drawing is painted (and is added to downloaded copies too) without changing
  // the drawing itself, so removing this file brings back the original colours.
  var BASE = { fill: "#F8FAFC", stroke: "#CBD5E1", accent: "#475569" };
  var MFG = { fill: "#F0FDFA", stroke: "#5EEAD4", accent: "#0F766E" };
  // Repeating .hitbox raises the rule's weight above the diagram's own (and the TBD) colour rules.
  var P = "svg #treeContent .hitbox.hitbox.hitbox";
  function card(extra, c){
    // Search matches, the current match, a drop target and a "new since snapshot" outline keep their own colours.
    return P + extra + ":not(.search-hit)>rect:nth-of-type(2){fill:" + c.fill + "!important}"
      + P + extra + ":not(.search-hit):not(.search-current):not(.drop-target):not(.compare-new)>rect:nth-of-type(2){stroke:" + c.stroke + "!important}"
      + P + extra + ">rect:nth-of-type(3){fill:" + c.accent + "!important}"
      + P + extra + " .ttag," + P + extra + " .tag-pill{fill:" + c.accent + "!important}";
  }
  var css = card("", BASE)
    + P + ":not(.search-hit) .ttl2{fill:#0F172A!important}"
    + P + " .tsub{fill:#94A3B8!important;font-weight:400!important}"
    + card(".is-mfg", MFG)
    + "svg #treeContent .dm-badge.dm-m circle{fill:" + MFG.accent + "!important}"
    + "svg #treeContent>path:not([data-local-cause-link]){stroke:#A8B4C4!important}"
    + "svg #treeContent .pl circle,svg #treeContent .pl path{stroke:#A8B4C4!important}"
    + "svg #treeContent text.lane{fill:#64748B!important}";
  window.treeColorCss = css;
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // The legend says what the two colours mean.
  var hosts = Array.prototype.slice.call(document.querySelectorAll("[data-node-legend]"));
  function node(c, label){
    return '<span><i class="nl-node" style="background:' + c.fill + ';border-color:' + c.stroke + ';border-left-color:' + c.accent + '"></i>' + label + '</span>';
  }
  function badge(color, letter, label){
    return '<span><i class="nl-badge" style="background:' + color + '">' + letter + '</i>' + label + '</span>';
  }
  var html = '<div class="nl-group"><b>Node colours</b>' + node(BASE, "Function, failure mode and causes") + node(MFG, "Manufacturing cause") + '</div>'
    + '<div class="nl-group"><b>Badges</b>' + badge("#4338CA", "D", "Deepest design cause") + badge(MFG.accent, "M", "Deepest manufacturing cause") + '</div>';
  hosts.forEach(function(host){ host.innerHTML = html; });
})();
