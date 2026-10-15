(function(){
  "use strict";
  // Shared storage for every design requirement specification -- the two
  // samples this workspace already has on file, and every real one
  // generated through "Create project". Kept in one place (not duplicated
  // per page) so editing a spec on the viewer page, listing it on the
  // Design Requirements page, and showing it on a project's page all agree.
  var KEY = "dfmeaRequirementDocs";
  var DEFAULTS_VERSION_KEY = "dfmeaRequirementDocsDefaultsVersion";
  var DEFAULTS_VERSION = "6";
  var DEFAULTS = [
    { id: "default-0", projectId: null, productName: "Titan Connector Housing", standard: "USCAR-2", createdAt: "Feb 11, 2024", specs: [
      "Mechanical — Housing dimensional tolerance ±0.15mm on all mating interface features, verified by CMM inspection",
      "Mechanical — Connector mating force ≤ 60 N, unmating force ≤ 50 N per USCAR-2 Section 5.2",
      "Mechanical — Locking mechanism retention force ≥ 80 N before primary lock release",
      "Mechanical — Secondary lock (TPA) must prevent terminal insertion unless fully seated, verified per USCAR-2 Section 5.3",
      "Mechanical — Minimum 50 mating/unmating cycles without contact degradation, verified per USCAR-2 durability test method",
      "Mechanical — Polarization features prevent incorrect orientation assembly under 20 N applied force",
      "Electrical — Dielectric withstand voltage 1500V AC for 60 seconds between adjacent terminal positions, no breakdown",
      "Electrical — Insulation resistance ≥ 100 MΩ at 500V DC, measured after humidity conditioning",
      "Electrical — Low-level contact resistance ≤ 10 mΩ per terminal position across the full mating cycle life",
      "Environmental — Housing sealing rated to IP67 (1m, 30 min submersion) at the connector mating face per IEC 60529",
      "Environmental — Operating temperature range -40°C to +105°C per USCAR-2 thermal cycling requirements",
      "Environmental — Thermal shock resistance: 100 cycles -40°C to +105°C, 30 min dwell each, no cracking or deformation",
      "Environmental — Vibration resistance per USCAR-2 Section 5.6, random vibration 10-2000 Hz, no electrical discontinuity >1μs",
      "Environmental — UV resistance: 500 hours per SAE J2527, no significant color change or material degradation",
      "Environmental — Chemical resistance to engine bay fluids (coolant, brake fluid, fuel) per USCAR-2 Section 5.8, no swelling or cracking",
      "Material — Housing material flammability rating UL94 V-0, verified per USCAR-2 Section 5.4 flame test",
      "Material — Housing resin must retain ≥ 80% tensile strength after 1000h at +105°C thermal aging",
      "Manufacturing — Process capability Cpk ≥ 1.33 on all critical-to-function housing dimensions at full production rate",
      "Manufacturing — Mold flow analysis required to confirm no sink marks or voids on load-bearing wall sections",
      "Quality — 100% automated vision inspection of locking tab geometry at final assembly, zero escape rate target"
    ]},
    { id: "default-1", projectId: null, productName: "Nova Terminal Block", standard: "LV214", createdAt: "Sep 3, 2024", specs: [
      "Mechanical — Crimp pull-out force ≥ 70 N per terminal, verified per LV214 Section 4.2 tensile test",
      "Mechanical — Terminal retention force ≥ 55 N in the housing cavity per LV214 Section 4.5",
      "Mechanical — Insertion/extraction force within LV214 Table 6 limits for the terminal size class",
      "Mechanical — Crimp height and width within ±0.05mm of nominal per LV214 crimp cross-section inspection",
      "Mechanical — Mechanical shock resistance per LV214 Section 4.8, 50g half-sine pulse, 11ms duration",
      "Mechanical — Wire strain relief must withstand 5 N axial pull for 1 minute with no conductor movement at the crimp",
      "Electrical — Contact resistance ≤ 0.6 mΩ after crimping, measured per LV214 4-wire Kelvin method",
      "Electrical — Current rating verified per LV214 Section 7, temperature rise ≤ 40K at rated current",
      "Electrical — Insulation resistance ≥ 100 MΩ at 500V DC between adjacent terminals",
      "Electrical — Voltage drop ≤ 30 mV at rated current across the full crimp joint after thermal cycling",
      "Environmental — Salt spray resistance per ISO 9227, 96h minimum, no red rust on base metal",
      "Environmental — Humidity resistance: 10 cycles per LV214 Annex, no corrosion or contact resistance drift >20%",
      "Environmental — Operating temperature range -40°C to +120°C with no plating discoloration or base metal exposure",
      "Environmental — Fretting corrosion resistance under micro-vibration per LV214 Section 4.9, no resistance increase >10%",
      "Material — Terminal base material and plating thickness per drawing, verified by cross-section metallurgical analysis",
      "Material — Tin plating minimum 2μm thickness over copper alloy base, no exposed base metal after crimping",
      "Manufacturing — Crimp force monitoring on 100% of production units with automatic reject of out-of-window crimps",
      "Manufacturing — Process capability Cpk ≥ 1.33 on crimp height, width, and pull-out force at full production rate",
      "Quality — First-article crimp cross-sections reviewed and approved before production release, per LV214 Annex C",
      "Quality — Lot traceability required for terminal plating batch and wire conductor batch used in each crimp"
    ]},
    { id: "default-2", projectId: null, productName: "Orion Busbar Assembly", standard: "LV214", createdAt: "Nov 20, 2024", specs: [
      "Mechanical — Busbar-to-terminal joint torque 8 ± 1 N·m, verified at 100% of production units",
      "Mechanical — Busbar bend radius ≥ 3x material thickness to avoid stress concentration cracking",
      "Mechanical — Fastener retention torque must be maintained within 10% after 50 thermal cycles",
      "Mechanical — Insulating boot/cover must remain seated under 15 N pull force in any direction",
      "Electrical — Joint resistance ≤ 0.3 mΩ per connection, measured by 4-wire Kelvin method after torque-down",
      "Electrical — Continuous current rating meets design load with ≤ 30K temperature rise at the busbar joint",
      "Electrical — Dielectric withstand voltage 2200V AC for 60 seconds between busbar and chassis ground",
      "Electrical — Isolation resistance ≥ 10 MΩ between high-voltage busbar and any exposed conductive part",
      "Environmental — Operating temperature range -40°C to +120°C with no joint loosening or plating degradation",
      "Environmental — Vibration resistance per ISO 16750-3, 10-2000 Hz, no joint resistance increase >15%",
      "Environmental — Salt spray resistance per ISO 9227, 240h minimum for exposed busbar sections, no red rust",
      "Environmental — Humidity resistance: 10 cycles per LV214 Annex, no corrosion at the joint interface",
      "Material — Busbar copper alloy conductivity ≥ 97% IACS, verified by eddy-current testing on incoming stock",
      "Material — Plating (tin or nickel) minimum 3μm thickness, no exposed base metal at bend or punch edges",
      "Manufacturing — Torque monitoring with automatic reject on 100% of production fasteners",
      "Manufacturing — Process capability Cpk ≥ 1.33 on joint resistance and torque at full production rate",
      "Quality — First-article joint cross-sections reviewed before production release",
      "Quality — Lot traceability required for busbar copper stock and plating batch"
    ]},
    { id: "default-3", projectId: null, productName: "Vantage Sensor Harness", standard: "USCAR-2", createdAt: "Jan 6, 2025", specs: [
      "Mechanical — Harness branch retention ≥ 40 N pull force at each wire exit point without conductor exposure",
      "Mechanical — Connector-to-harness strain relief withstands 50 N axial pull for 1 minute, no wire movement",
      "Mechanical — Minimum bend radius 5x cable OD maintained at all routing clips and brackets",
      "Mechanical — Clip/bracket retention force ≥ 25 N in the vehicle-mounted orientation",
      "Electrical — Signal line crosstalk ≤ -40dB between adjacent sensor channels at rated frequency",
      "Electrical — Shield continuity resistance ≤ 50 mΩ end-to-end, verified on 100% of harness assemblies",
      "Electrical — Insulation resistance ≥ 100 MΩ at 500V DC between any two conductors or conductor-to-shield",
      "Environmental — Operating temperature range -40°C to +125°C per USCAR-2 thermal cycling requirements",
      "Environmental — Abrasion resistance per USCAR-2 Section 5.9, no conductor exposure after 2500 scrape cycles",
      "Environmental — Chemical resistance to engine bay fluids, no insulation cracking or swelling",
      "Environmental — Vibration resistance per USCAR-2 Section 5.6, no intermittent signal dropout >1μs",
      "Material — Wire insulation material rated to the full operating temperature range with no embrittlement",
      "Material — Connector housing flammability rating UL94 V-0",
      "Manufacturing — Automated continuity and hipot test on 100% of finished harness assemblies",
      "Manufacturing — Process capability Cpk ≥ 1.33 on critical wire length and connector seating dimensions",
      "Quality — Lot traceability required for wire, terminal, and connector housing batches used per harness"
    ]},
    { id: "default-4", projectId: null, productName: "Helios DC Fast-Charge Inlet", standard: "IEC 62196-3", createdAt: "Feb 18, 2025", specs: [
      "Mechanical — Inlet shutter mechanism prevents contact access when vehicle not connected, verified per IEC 62196-3",
      "Mechanical — Connector latch retention force ≥ 100 N before release, withstands 10,000 charge cycles",
      "Mechanical — Inlet housing withstands 50 N side-load without cracking or seal displacement",
      "Mechanical — Pin alignment tolerance ±0.1mm to guarantee correct mating with handle across the cycle life",
      "Electrical — Contact resistance ≤ 0.3 mΩ per power pin, measured at rated current after mating",
      "Electrical — Dielectric withstand voltage 3000V AC for 60 seconds between power pins and chassis ground",
      "Electrical — Pilot/CP signal timing accuracy within ±5% of SAE J1772 / IEC 61851 state transition windows",
      "Electrical — Temperature sensing in-pin accuracy ±3°C across -40°C to +85°C, used for charge current derating",
      "Environmental — Sealing rated to IP55 minimum with inlet cap closed, IP44 minimum while mated and charging",
      "Environmental — Operating temperature range -40°C to +85°C under full rated charge current",
      "Environmental — Thermal shutdown must trigger before pin temperature exceeds 90°C, verified by thermal test",
      "Environmental — Vibration resistance per ISO 16750-3, no loss of continuity on power or signal pins",
      "Material — Pin contact plating minimum 5μm thickness, rated for 10,000 mating cycles without resistance drift",
      "Material — Housing material flammability rating UL94 V-0 and resistant to automotive cleaning agents",
      "Manufacturing — 100% electrical test (continuity, hipot, pilot signal) on every finished inlet assembly",
      "Quality — Lot traceability required for pin contact plating batch and housing resin batch"
    ]},
    { id: "default-5", projectId: null, productName: "Zenith HV Interlock Connector", standard: "ISO 6469-3", createdAt: "Apr 2, 2025", specs: [
      "Mechanical — Interlock loop opens within 2mm of connector disengagement, before high-voltage pins separate",
      "Mechanical — Connector must require a tool or two-stage release to disconnect under load, per ISO 6469-3",
      "Mechanical — Housing withstands 100 N crush load without interlock loop false-closing",
      "Electrical — Interlock loop resistance ≤ 100 mΩ when closed, open-circuit when disengaged, verified every mating cycle",
      "Electrical — High-voltage pin isolation resistance ≥ 100 MΩ at 1000V DC between any two pins",
      "Electrical — Dielectric withstand voltage 2500V AC for 60 seconds between HV pins and chassis ground",
      "Electrical — Response time from interlock-open to high-voltage bus disable ≤ 50ms, verified at system level",
      "Environmental — Operating temperature range -40°C to +125°C with no interlock signal degradation",
      "Environmental — Sealing rated to IP67 at the connector mating face, verified by submersion test",
      "Environmental — Vibration resistance per ISO 16750-3, no interlock loop discontinuity >1μs",
      "Environmental — Humidity resistance: 10 cycles minimum, no corrosion of interlock loop contacts",
      "Material — Interlock contact plating minimum 2μm thickness, no exposed base metal after cycling",
      "Manufacturing — 100% interlock continuity and HV isolation test on every finished connector assembly",
      "Quality — Functional safety review required per ISO 26262 for the interlock disable response path",
      "Quality — Lot traceability required for interlock contact and HV pin plating batches"
    ]},
    { id: "default-6", projectId: null, productName: "Apex Battery Disconnect Unit", standard: "ISO 20653", createdAt: "May 27, 2025", specs: [
      "Mechanical — Manual service disconnect requires ≥ 40 N deliberate pull force, cannot release under vibration alone",
      "Mechanical — Fuse cartridge retention force ≥ 60 N in the housing, verified after 50 insertion/removal cycles",
      "Mechanical — Housing withstands 30g mechanical shock without cover separation or fuse dislodgement",
      "Electrical — Contact resistance ≤ 0.2 mΩ across the main current path, measured after torque-down",
      "Electrical — Continuous current rating meets design load with ≤ 25K temperature rise at rated current",
      "Electrical — Fuse interrupt rating verified to clear worst-case fault current within datasheet time curve",
      "Electrical — Isolation resistance ≥ 10 MΩ between disconnected terminals and housing/chassis",
      "Environmental — Sealing rated to IP6K9K per ISO 20653, withstands high-pressure/steam-jet washdown",
      "Environmental — Operating temperature range -40°C to +85°C with no contact resistance drift",
      "Environmental — Salt spray resistance per ISO 9227, 240h minimum, no red rust on main current path contacts",
      "Material — Main contact plating minimum 3μm thickness over copper alloy base",
      "Material — Housing material flammability rating UL94 V-0, resistant to battery electrolyte exposure",
      "Manufacturing — Torque and contact resistance verified on 100% of production units before release",
      "Quality — Lot traceability required for fuse cartridge batch and main contact plating batch"
    ]},
    { id: "default-7", projectId: null, productName: "Polaris Low-Voltage Distribution Box", standard: "LV214", createdAt: "Jun 14, 2025", specs: [
      "Mechanical — Busbar and fuse terminal retention force ≥ 50 N, no loosening after 50 thermal cycles",
      "Mechanical — Cover latch retention ≥ 30 N, withstands 20 open/close cycles without cracking",
      "Mechanical — Relay socket retention force ≥ 25 N, verified after 1000 insertion/removal cycles",
      "Mechanical — Housing withstands 20g mechanical shock without internal busbar contact displacement",
      "Electrical — Branch circuit contact resistance ≤ 0.5 mΩ, measured per LV214 4-wire Kelvin method",
      "Electrical — Each fused branch verified to clear worst-case fault current within datasheet time curve",
      "Electrical — Insulation resistance ≥ 100 MΩ at 500V DC between adjacent branch circuits",
      "Electrical — Dielectric withstand voltage 1500V AC for 60 seconds between branches and housing ground",
      "Environmental — Sealing rated to IP67 with cover closed, verified by submersion test",
      "Environmental — Operating temperature range -40°C to +105°C with no branch resistance drift",
      "Environmental — Vibration resistance per LV214 Section 4.8, no intermittent branch discontinuity >1μs",
      "Environmental — Humidity resistance: 10 cycles per LV214 Annex, no corrosion on busbar or fuse contacts",
      "Material — Busbar copper alloy conductivity ≥ 97% IACS; plating minimum 2μm, no exposed base metal",
      "Material — Housing material flammability rating UL94 V-0",
      "Manufacturing — 100% continuity and insulation test on every finished distribution box",
      "Quality — Lot traceability required for busbar stock, fuse, and relay socket batches"
    ]},
    { id: "default-8", projectId: null, productName: "Comet Wiring Harness Grommet", standard: "USCAR-2", createdAt: "Jul 22, 2025", specs: [
      "Mechanical — Grommet retention force ≥ 35 N in the body panel bulkhead cutout, no dislodgement",
      "Mechanical — Grommet compression set ≤ 20% after 1000h at +100°C, verified per ASTM D395",
      "Mechanical — Wire bundle pass-through seal maintains compression under ±3mm bundle diameter variation",
      "Mechanical — Grommet withstands 10 N side-pull on the harness without seal gap formation",
      "Environmental — Sealing rated to IP67 at the bulkhead pass-through, verified by submersion test",
      "Environmental — Operating temperature range -40°C to +120°C with no material hardening or cracking",
      "Environmental — UV resistance: 500 hours per SAE J2527, no significant cracking or surface crazing",
      "Environmental — Chemical resistance to engine bay fluids (coolant, oil, fuel), no swelling >10% volume",
      "Environmental — Ozone resistance per ASTM D1149, no cracking after 72h exposure at rated concentration",
      "Material — Grommet elastomer hardness 60 ± 5 Shore A, verified on incoming material lots",
      "Material — Flammability rating UL94 V-0 for any grommet material used in the passenger compartment",
      "Manufacturing — 100% visual inspection for seal gaps or flash at the parting line on finished grommets",
      "Quality — Lot traceability required for elastomer compound batch used in each production run"
    ]},
    { id: "default-9", projectId: null, productName: "Nimbus Charge Port Door Actuator", standard: "ISO 16750", createdAt: "Aug 30, 2025", specs: [
      "Mechanical — Actuator withstands 50,000 open/close cycles without loss of position accuracy",
      "Mechanical — Door latch retention ≥ 60 N against forced opening while in the closed/locked state",
      "Mechanical — Actuator stall torque sufficient to overcome 5mm ice buildup at the door seam",
      "Mechanical — Gear train withstands 10 N·cm reverse-drive torque without damage when manually opened",
      "Electrical — Actuator motor draws ≤ 2.5A at 12V under rated load, verified at temperature extremes",
      "Electrical — Position sensor accuracy ±2° across the full travel range, over the operating temperature range",
      "Electrical — EMC emissions and immunity per ISO 16750-2 for motor drive and position sensor circuits",
      "Environmental — Sealing rated to IP67 at the actuator housing, verified by submersion test",
      "Environmental — Operating temperature range -40°C to +85°C per ISO 16750-4 thermal requirements",
      "Environmental — Salt spray resistance per ISO 9227, 240h minimum, no red rust on exposed metal parts",
      "Environmental — Vibration resistance per ISO 16750-3, no false actuation or position drift",
      "Material — Housing material flammability rating UL94 V-0, UV-stabilized for exterior exposure",
      "Manufacturing — 100% functional cycle test (open/close/latch) on every finished actuator assembly",
      "Quality — Lot traceability required for motor, gear train, and position sensor batches"
    ]},
    // The one built-in project (not generated through "Create project") --
    // its own requirement spec, covering the same ground its five DFMEAs
    // do: crimp, terminal retention, housing seal, mating durability and
    // lock retention. projectId ties it to that project directly, the
    // same way a generated project's spec is tied to its own.
    { id: "default-10", projectId: "aster-ev-connector", productName: "Aster EV Connector", standard: "USCAR-2", createdAt: "Jan 15, 2024", specs: [
      "Mechanical — Crimp pull-out force ≥ 70 N per terminal, verified per USCAR-2 Section 4.2 tensile test",
      "Mechanical — Terminal retention force ≥ 55 N in the housing cavity, verified after 50 insertion cycles",
      "Mechanical — Locking mechanism retention force ≥ 80 N before primary lock release",
      "Mechanical — Secondary lock (TPA) must prevent terminal insertion unless fully seated",
      "Mechanical — Minimum 50 mating/unmating cycles without contact degradation or increased insertion force",
      "Mechanical — Connector mating force ≤ 60 N, unmating force ≤ 50 N per USCAR-2 Section 5.2",
      "Electrical — Contact resistance ≤ 0.55 mΩ after crimping, measured by 4-wire Kelvin method",
      "Electrical — Low-level contact resistance ≤ 10 mΩ per terminal position across the full mating cycle life",
      "Electrical — Dielectric withstand voltage 1500V AC for 60 seconds between adjacent terminal positions",
      "Environmental — Housing sealing rated to IP67 (1m, 30 min submersion) at the connector mating face",
      "Environmental — Operating temperature range -40°C to +105°C per USCAR-2 thermal cycling requirements",
      "Environmental — Vibration resistance per USCAR-2 Section 5.6, no electrical discontinuity greater than 1μs",
      "Environmental — Thermal shock resistance: 100 cycles -40°C to +105°C, 30 min dwell each, no cracking",
      "Material — Housing material flammability rating UL94 V-0, verified per USCAR-2 Section 5.4 flame test",
      "Material — Terminal plating minimum 2μm thickness over base alloy, no exposed base metal after crimping",
      "Manufacturing — Crimp force monitoring on 100% of production units with automatic reject of out-of-window crimps",
      "Manufacturing — Process capability Cpk ≥ 1.33 on crimp height, width, and pull-out force at full production rate",
      "Quality — Lot traceability required for terminal plating batch and housing resin batch used per connector"
    ]}
  ];

  function save(list){
    try{ localStorage.setItem(KEY, JSON.stringify(list)); }catch(error){ /* storage unavailable */ }
  }
  function readAll(){
    var list;
    try{ list = JSON.parse(localStorage.getItem(KEY) || "null"); }catch(error){ list = null; }
    if(!list){
      list = DEFAULTS.slice();
      save(list);
      try{ localStorage.setItem(DEFAULTS_VERSION_KEY, DEFAULTS_VERSION); }catch(error){ /* storage unavailable */ }
    }else if(!list.some(function(d){ return d.id === "default-0"; })){
      // Seeded once, on whichever page loads first -- if an earlier
      // session already has real docs saved, the samples just get
      // prepended ahead of them rather than replacing anything.
      list = DEFAULTS.concat(list);
      save(list);
      try{ localStorage.setItem(DEFAULTS_VERSION_KEY, DEFAULTS_VERSION); }catch(error){ /* storage unavailable */ }
    }else{
      // The sample docs got more detailed, and more of them were added, in
      // later builds -- refresh existing ones in-place and append any new
      // ones for anyone whose browser already cached an older, shorter
      // version, without touching any real project docs mixed in among them.
      var storedVersion = null;
      try{ storedVersion = localStorage.getItem(DEFAULTS_VERSION_KEY); }catch(error){ storedVersion = null; }
      if(storedVersion !== DEFAULTS_VERSION){
        list = list.map(function(d){
          var fresh = DEFAULTS.find(function(f){ return f.id === d.id; });
          return fresh ? fresh : d;
        });
        DEFAULTS.forEach(function(def, i){
          if(!list.some(function(d){ return d.id === def.id; })) list.splice(i, 0, def);
        });
        save(list);
        try{ localStorage.setItem(DEFAULTS_VERSION_KEY, DEFAULTS_VERSION); }catch(error){ /* storage unavailable */ }
      }
    }
    return list;
  }
  function getById(id){
    return readAll().find(function(d){ return d.id === id; }) || null;
  }
  function updateSpecs(id, specs){
    var list = readAll();
    var doc = list.find(function(d){ return d.id === id; });
    if(!doc) return false;
    doc.specs = specs;
    save(list);
    return true;
  }
  function add(doc){
    var list = readAll();
    list.push(doc);
    save(list);
  }

  function escapeHtml(value){
    var div = document.createElement("div");
    div.textContent = String(value);
    return div.innerHTML;
  }
  // Each requirement is stored as one line, "Category — requirement text".
  // A line without that prefix (one typed in by hand, or extracted from an
  // uploaded document) is simply filed under "General".
  function splitSpec(spec){
    var match = /^([A-Za-z][A-Za-z &\/-]{1,24}) — ([\s\S]+)$/.exec(String(spec));
    return match ? { category: match[1], text: match[2] } : { category: "General", text: String(spec) };
  }
  // The distinct categories a spec covers, in the order they first appear.
  function categoriesOf(specs){
    var out = [];
    (specs || []).forEach(function(spec){
      var c = splitSpec(spec).category;
      if(out.indexOf(c) === -1) out.push(c);
    });
    return out;
  }
  // What a project's spec was drawn from: other specs, and existing
  // DFMEAs. A spec made by Create project carries its own lists; the
  // built-in Aster one is fixed.
  var KNOWN_REFS = { "aster-ev-connector": {
    specs: [{ id: "default-0", name: "Titan Connector Housing" }, { id: "default-3", name: "Vantage Sensor Harness" },
      { id: "default-8", name: "Comet Wiring Harness Grommet" }, { id: "default-1", name: "Nova Terminal Block" }],
    dfmeas: ["Terminal_Retention_DFMEA_Rev3.xlsx", "Connector_Housing_DFMEA.xlsx", "Crimp Contact Resistance", "Door_Latch_Actuator_DFMEA.xlsx"] } };
  function refsFor(doc){
    return (doc && (doc.builtFrom || (KNOWN_REFS[doc.projectId] || {}).specs)) || [];
  }
  function dfmeaRefsFor(doc){
    return (doc && (doc.builtFromDfmeas || (KNOWN_REFS[doc.projectId] || {}).dfmeas)) || [];
  }
  // Each requirement cites where it came from -- a DFMEA, a spec, or
  // both -- one source at a time, cycling through them so neighbouring rows
  // never repeat, and leaving some rows (taken from nowhere in particular)
  // without a reference.
  function rowSources(doc){
    var dfmeas = dfmeaRefsFor(doc).map(function(n){ return { name: n, url: window.DfmeaRefs.dfmeaUrl(n) }; });
    var specs = refsFor(doc).map(function(s){ return { name: s.name, url: "requirement-view.html?id=" + encodeURIComponent(s.id) }; });
    var all = [];
    for(var i = 0; i < Math.max(dfmeas.length, specs.length); i++){
      if(dfmeas[i]) all.push(dfmeas[i]);
      if(specs[i]) all.push(specs[i]);
    }
    return all;
  }
  // The one way a specification is rendered everywhere it appears (the
  // viewer, a project's page, the new-project result, inside a DFMEA):
  // a numbered table with the category as its own column, and -- when the
  // spec was built from other documents -- a one-line Reference column.
  function specTableHtml(specs, doc){
    var sources = rowSources(doc);
    var cursor = 0;
    return '<table class="spec-table"><thead><tr><th class="spec-num">#</th><th class="spec-cat-cell">Category</th><th>Requirement</th>'
      + (sources.length ? '<th class="spec-ref-cell">Reference</th>' : '') + '</tr></thead><tbody>'
      + (specs || []).map(function(spec, index){
          var parts = splitSpec(spec);
          var refCell = "";
          if(sources.length){
            var picks = [];
            if(index % 4 !== 2){
              picks.push(sources[cursor++ % sources.length]);
              if(index % 3 === 1) picks.push(sources[cursor++ % sources.length]);
            }
            refCell = '<td class="spec-ref-cell"><div class="np-chiprow-mini">'
              + (picks.length ? window.DfmeaRefs.chipRowHtml(picks, 2, function(item){ return item.url; }) : "") + '</div></td>';
          }
          return '<tr><td class="spec-num">' + (index + 1) + '</td>'
            + '<td class="spec-cat-cell"><span class="spec-cat" data-cat="' + escapeHtml(parts.category.toLowerCase()) + '">' + escapeHtml(parts.category) + '</span></td>'
            + '<td>' + escapeHtml(parts.text) + '</td>' + refCell + '</tr>';
        }).join("")
      + '</tbody></table>';
  }

  window.DfmeaReqDocs = { readAll: readAll, getById: getById, updateSpecs: updateSpecs, add: add, specTableHtml: specTableHtml, refsFor: refsFor, sourcesFor: rowSources, categoriesOf: categoriesOf };
})();
