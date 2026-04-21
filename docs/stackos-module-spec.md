<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>StackOS — Living Roadmap v4</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#070707;--surface:#0f0f0f;--s2:#131313;--s3:#161616;
  --border:#1c1c1c;--bhi:#2a2a2a;
  --text:#e6e6e6;--muted:#a0a8b8;--m2:#242424;
  --accent:#e8ff47;--adim:rgba(232,255,71,0.07);
  --green:#4dff91;--gdim:rgba(77,255,145,0.08);
  --orange:#ff9f47;--odim:rgba(255,159,71,0.08);
  --red:#ff4f4f;--rdim:rgba(255,79,79,0.08);
  --blue:#47b8ff;--purple:#c47bff;
  --must:#e8ff47;--should:#47b8ff;--could:#4dff91;--wont:#ff4f4f;
}
body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh;}
body::after{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 80% 40% at 50% -5%,rgba(232,255,71,0.03),transparent);pointer-events:none;z-index:0;}

header{padding:44px 48px 0;position:relative;z-index:1;}
.eyebrow{font-size:9px;letter-spacing:0.26em;text-transform:uppercase;color:var(--muted);margin-bottom:14px;}
h1{font-family:'Syne',sans-serif;font-size:clamp(26px,4.5vw,54px);font-weight:800;line-height:0.93;letter-spacing:-0.03em;}
h1 em{color:var(--accent);font-style:normal;}
.subtitle{font-size:11px;color:var(--muted);margin-top:11px;line-height:1.75;max-width:580px;}

/* FORMULA CARD */
.formula-card{margin-top:22px;border:1px solid var(--border);background:var(--surface);padding:16px 20px;display:inline-block;max-width:100%;}
.fc-title{font-size:8px;letter-spacing:0.22em;text-transform:uppercase;color:var(--muted);margin-bottom:10px;}
.fc-indicators{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:10px;}
.fc-ind{display:flex;align-items:center;gap:6px;font-size:10px;color:var(--muted);}
.fc-ind .dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
.fc-ind strong{color:var(--text);}
.fc-formula{font-size:11px;color:#777;line-height:1.6;border-top:1px solid var(--border);padding-top:10px;margin-top:2px;}
.fc-formula em{color:var(--accent);font-style:normal;}
.fc-note{font-size:9px;color:var(--muted);margin-top:6px;}
.mode-btn{margin-top:10px;display:inline-flex;align-items:center;gap:8px;border:1px solid var(--border);padding:5px 12px;cursor:pointer;font-size:10px;color:var(--muted);background:none;font-family:'DM Mono',monospace;transition:all 0.15s;letter-spacing:0.06em;}
.mode-btn:hover{border-color:var(--accent);color:var(--accent);}
.mode-btn.retention{border-color:var(--blue);color:var(--blue);}
.mode-dot{width:7px;height:7px;border-radius:50%;background:var(--accent);flex-shrink:0;}
.mode-btn.retention .mode-dot{background:var(--blue);}

.add-btn{display:inline-flex;align-items:center;gap:8px;background:var(--accent);color:#000;font-family:'Syne',sans-serif;font-size:11px;font-weight:800;letter-spacing:0.07em;padding:10px 18px;cursor:pointer;border:none;text-transform:uppercase;transition:opacity 0.15s;margin-top:20px;}
.add-btn:hover{opacity:0.85;}

/* TOOLBAR */
.toolbar{padding:22px 48px 0;display:flex;gap:5px;align-items:center;flex-wrap:wrap;position:relative;z-index:1;}
.tlabel{font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--muted);margin-right:3px;}
.tbtn{background:var(--surface);border:1px solid var(--border);color:var(--muted);padding:5px 10px;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.08em;cursor:pointer;transition:all 0.15s;text-transform:uppercase;}
.tbtn:hover,.tbtn.active{border-color:var(--accent);color:var(--accent);background:var(--adim);}
.tbtn.fm.active{border-color:var(--must);color:var(--must);background:rgba(232,255,71,0.06);}
.tbtn.fs.active{border-color:var(--should);color:var(--should);background:rgba(71,184,255,0.06);}
.tbtn.fc.active{border-color:var(--could);color:var(--could);background:rgba(77,255,145,0.06);}
.tbtn.fw.active{border-color:var(--wont);color:var(--wont);background:rgba(255,79,79,0.06);}
.tsep{width:1px;height:18px;background:var(--border);margin:0 3px;}

/* TABLE */
.table-wrap{padding:18px 48px 110px;position:relative;z-index:1;}
.thead{display:grid;grid-template-columns:30px 1fr 55px 55px 55px 55px 55px 80px 100px 32px;padding:7px 14px;border-bottom:1px solid var(--bhi);margin-bottom:2px;}
.thead span{font-size:8px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);text-align:center;}
.thead span:nth-child(2){text-align:left;}

.row{display:grid;grid-template-columns:30px 1fr 55px 55px 55px 55px 55px 80px 100px 32px;border:1px solid var(--border);border-top:none;cursor:pointer;transition:background 0.15s;position:relative;}
.row:first-of-type{border-top:1px solid var(--border);}
.row::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;}
.row.p-must::before{background:var(--must);}
.row.p-should::before{background:var(--should);}
.row.p-could::before{background:var(--could);}
.row.p-wont::before{background:var(--wont);}
.row:hover{background:#0d0d0d;}
.row.open{background:#0b0b0b;}
.row.flash{animation:flashIn 0.5s ease;}
@keyframes flashIn{from{opacity:0;background:#1a1f00;}to{opacity:1;background:transparent;}}

.rnum{display:flex;align-items:flex-start;justify-content:flex-end;padding:14px 7px 12px 14px;font-size:9px;color:var(--muted);}
.rmain{padding:12px 16px 12px 3px;}
.rname{font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--text);line-height:1.2;}
.rdesc{font-size:10px;color:var(--muted);margin-top:3px;line-height:1.5;}

.icell{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:13px 3px 12px;gap:2px;}
.ival{font-family:'Syne',sans-serif;font-size:15px;font-weight:800;line-height:1;}
.ibar{width:34px;height:2px;background:var(--m2);margin-top:3px;border-radius:1px;}
.ibar-fill{height:100%;border-radius:1px;}
.ilabel{font-size:7px;color:var(--muted);letter-spacing:0.04em;text-align:center;}

.scell{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:12px 6px;}
.snum{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;line-height:1;}
.slabel{font-size:8px;color:var(--muted);margin-top:2px;}

.mcell{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:12px 8px;}
.mbadge{font-family:'Syne',sans-serif;font-size:9px;font-weight:800;letter-spacing:0.06em;padding:4px 9px;display:inline-block;text-align:center;}
.mb-M{background:rgba(232,255,71,0.08);color:var(--must);border:1px solid rgba(232,255,71,0.22);}
.mb-S{background:rgba(71,184,255,0.08);color:var(--should);border:1px solid rgba(71,184,255,0.2);}
.mb-C{background:rgba(77,255,145,0.08);color:var(--could);border:1px solid rgba(77,255,145,0.2);}
.mb-W{background:rgba(255,79,79,0.08);color:var(--wont);border:1px solid rgba(255,79,79,0.2);}
.mfull{font-size:8px;color:var(--muted);margin-top:3px;}

.xbtn{display:flex;align-items:flex-start;justify-content:center;padding-top:13px;font-size:13px;color:var(--muted);transition:transform 0.2s,color 0.2s;user-select:none;}
.row.open .xbtn{transform:rotate(45deg);color:var(--accent);}

.rdetail{display:none;grid-column:1/-1;padding:0 18px 18px 32px;border-top:1px solid var(--border);}
.row.open .rdetail{display:block;}
.ind-summary{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:14px;margin-bottom:14px;}
.isb{background:var(--s2);border:1px solid var(--border);padding:10px;text-align:center;}
.isb label{font-size:7px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px;}
.isb .isv{font-family:'Syne',sans-serif;font-size:20px;font-weight:800;}
.dgrid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;}
.dblock label{font-size:8px;letter-spacing:0.2em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:5px;}
.dblock p{font-size:11px;color:#999;line-height:1.6;}
.tpills{display:flex;flex-wrap:wrap;gap:4px;margin-top:7px;}
.tpill{font-size:9px;padding:2px 7px;background:var(--surface);border:1px solid var(--bhi);color:#666;}
.ai-note{font-size:10px;color:var(--purple);margin-top:8px;line-height:1.5;border-left:2px solid rgba(196,123,255,0.4);padding-left:8px;}
/* ACTION BUTTONS */
.action-btns{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px;}
.abtn{background:none;border:1px solid var(--border);color:var(--muted);font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.08em;padding:5px 10px;cursor:pointer;transition:all 0.15s;text-transform:uppercase;}
.abtn-validate:hover{border-color:var(--green);color:var(--green);}
.abtn-postpone:hover{border-color:var(--orange);color:var(--orange);}
.abtn-archive:hover{border-color:var(--red);color:var(--red);}
.abtn-reactivate:hover{border-color:var(--accent);color:var(--accent);}
.abtn-restore:hover{border-color:var(--blue);color:var(--blue);}
.abtn-prompt{border-color:rgba(196,123,255,0.3);color:var(--purple);}
.abtn-prompt:hover{border-color:var(--purple);color:#fff;background:rgba(196,123,255,0.1);}

/* PROMPT TOAST */
.toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(10px);background:var(--purple);color:#fff;font-family:'Syne',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;padding:10px 20px;z-index:300;opacity:0;transition:all 0.3s;pointer-events:none;}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0);}

/* PROMPT MODAL */
.prompt-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.9);backdrop-filter:blur(12px);z-index:250;display:none;align-items:center;justify-content:center;padding:20px;}
.prompt-overlay.open{display:flex;}
.prompt-modal{background:var(--surface);border:1px solid var(--purple);width:100%;max-width:680px;max-height:88vh;display:flex;flex-direction:column;}
.pm-head{padding:20px 22px 0;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-shrink:0;}
.pm-title{font-family:'Syne',sans-serif;font-size:15px;font-weight:800;}
.pm-title em{color:var(--purple);font-style:normal;}
.pm-actions{display:flex;gap:8px;align-items:center;}
.pm-copy{background:var(--purple);color:#fff;border:none;font-family:'Syne',sans-serif;font-size:10px;font-weight:800;letter-spacing:0.08em;padding:7px 14px;cursor:pointer;text-transform:uppercase;transition:opacity 0.15s;}
.pm-copy:hover{opacity:0.85;}
.pm-copy.copied{background:var(--green);color:#000;}
.pm-close{background:none;border:1px solid var(--border);color:var(--muted);width:26px;height:26px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}
.pm-close:hover{border-color:var(--text);color:var(--text);}
.pm-body{padding:16px 22px 22px;overflow-y:auto;}
.pm-textarea{width:100%;background:var(--s2);border:1px solid var(--border);color:#ccc;font-family:'DM Mono',monospace;font-size:11px;line-height:1.7;padding:14px;resize:none;outline:none;min-height:380px;}
.pm-hint{font-size:9px;color:var(--muted);margin-top:8px;line-height:1.5;letter-spacing:0.04em;}

/* ROW STATE STYLES */
.row.validated::before{background:var(--green)!important;}
.row.validated .rname::after{content:' ✓';color:var(--green);font-size:11px;}

.row.postponed{opacity:0.55;}
.row.postponed::before{background:var(--orange)!important;}
.row.postponed .rname{color:#999;}

.row.archived{opacity:0.38;filter:grayscale(0.5);}
.row.archived::before{background:var(--red)!important;}
.row.archived .rname{color:#777;text-decoration:line-through;text-decoration-color:rgba(255,79,79,0.4);}

/* SECTION DIVIDERS */
.section-divider{display:grid;grid-template-columns:30px 1fr;padding:26px 0 7px;}
.section-divider-inner{display:flex;align-items:center;gap:12px;}
.section-divider-inner .sname{font-family:'Syne',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;white-space:nowrap;}
.section-divider-inner .sline{flex:1;height:1px;}
.div-postponed .sname{color:var(--orange);opacity:0.7;}
.div-postponed .sline{background:rgba(255,159,71,0.15);}
.div-archived .sname{color:var(--red);opacity:0.6;}
.div-archived .sline{background:rgba(255,79,79,0.13);}

/* STATUS BADGE IN ROW */
.status-pip{display:inline-block;font-size:8px;font-weight:700;letter-spacing:0.1em;padding:2px 6px;font-family:'Syne',sans-serif;margin-left:6px;vertical-align:middle;}
.sp-validated{color:var(--green);border:1px solid rgba(77,255,145,0.3);background:rgba(77,255,145,0.06);}
.sp-postponed{color:var(--orange);border:1px solid rgba(255,159,71,0.3);background:rgba(255,159,71,0.06);}
.sp-archived{color:var(--red);border:1px solid rgba(255,79,79,0.3);background:rgba(255,79,79,0.06);}

/* MODAL */
.overlay{position:fixed;inset:0;background:rgba(0,0,0,0.88);backdrop-filter:blur(10px);z-index:200;display:none;align-items:center;justify-content:center;padding:16px;}
.overlay.open{display:flex;}
.modal{background:var(--surface);border:1px solid var(--bhi);width:100%;max-width:600px;max-height:93vh;overflow-y:auto;}
.mhead{padding:24px 26px 0;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
.mtitle{font-family:'Syne',sans-serif;font-size:18px;font-weight:800;}
.mtitle em{color:var(--accent);font-style:normal;}
.clos{background:none;border:1px solid var(--border);color:var(--muted);width:26px;height:26px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s;}
.clos:hover{border-color:var(--text);color:var(--text);}
.mbody{padding:20px 26px 26px;}

.field{margin-bottom:16px;}
.field>label{display:block;font-size:8px;letter-spacing:0.2em;text-transform:uppercase;color:var(--muted);margin-bottom:6px;}
.field input,.field textarea,.field select{width:100%;background:var(--s2);border:1px solid var(--border);color:var(--text);font-family:'DM Mono',monospace;font-size:11px;padding:9px 11px;outline:none;transition:border-color 0.15s;resize:none;}
.field input:focus,.field textarea:focus,.field select:focus{border-color:var(--bhi);}
.field textarea{min-height:60px;}
.field select option{background:var(--s2);}

/* INDICATORS */
.ind-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;}
.ind-block{background:var(--s2);border:1px solid var(--border);padding:12px 14px;}
.ind-block.full{grid-column:1/-1;}
.ind-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;}
.ind-head label{font-size:8px;letter-spacing:0.15em;text-transform:uppercase;color:var(--muted);}
.ind-head .ind-val{font-family:'Syne',sans-serif;font-size:20px;font-weight:800;}
.ind-hint{font-size:9px;color:var(--muted);margin-bottom:8px;line-height:1.4;}
.ind-block input[type=range]{width:100%;-webkit-appearance:none;height:3px;outline:none;cursor:pointer;border-radius:2px;}
.ind-block input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;cursor:pointer;}
.ind-facilidad input[type=range]{background:linear-gradient(to right,var(--blue) 0%,var(--blue) var(--p,50%),var(--m2) var(--p,50%));}
.ind-facilidad input[type=range]::-webkit-slider-thumb{background:var(--blue);}
.ind-velocidad input[type=range]{background:linear-gradient(to right,var(--orange) 0%,var(--orange) var(--p,50%),var(--m2) var(--p,50%));}
.ind-velocidad input[type=range]::-webkit-slider-thumb{background:var(--orange);}
.ind-eficiencia input[type=range]{background:linear-gradient(to right,var(--purple) 0%,var(--purple) var(--p,50%),var(--m2) var(--p,50%));}
.ind-eficiencia input[type=range]::-webkit-slider-thumb{background:var(--purple);}
.ind-einicial input[type=range]{background:linear-gradient(to right,var(--green) 0%,var(--green) var(--p,50%),var(--m2) var(--p,50%));}
.ind-einicial input[type=range]::-webkit-slider-thumb{background:var(--green);}
.ind-elifetime input[type=range]{background:linear-gradient(to right,var(--accent) 0%,var(--accent) var(--p,50%),var(--m2) var(--p,50%));}
.ind-elifetime input[type=range]::-webkit-slider-thumb{background:var(--accent);}

/* SCORE PREVIEW */
.score-prev{background:var(--s3);border:1px solid var(--border);padding:14px 16px;margin-bottom:16px;display:flex;align-items:center;gap:20px;}
.sp-left{text-align:center;flex-shrink:0;}
.sp-left .n{font-family:'Syne',sans-serif;font-size:38px;font-weight:800;line-height:1;}
.sp-left .l{font-size:8px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);margin-top:3px;}
.sp-right{flex:1;}
.sp-right .ml{font-size:8px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);margin-bottom:5px;}
.sp-right .mname{font-family:'Syne',sans-serif;font-size:14px;font-weight:800;}
.sp-right .formula{font-size:10px;color:var(--muted);line-height:1.7;margin-top:6px;}
.sp-right .formula em{color:var(--accent);font-style:normal;}

/* AI */
.ai-sec{border:1px solid var(--border);padding:14px 16px;background:rgba(232,255,71,0.02);margin-bottom:16px;}
.ai-title{font-size:8px;letter-spacing:0.2em;text-transform:uppercase;color:var(--accent);margin-bottom:8px;display:flex;align-items:center;gap:6px;}
.ai-tog{display:flex;align-items:center;gap:8px;cursor:pointer;}
.ai-tog input[type=checkbox]{accent-color:var(--accent);cursor:pointer;}
.ai-tog span{font-size:10px;color:var(--muted);}
.ai-res{margin-top:10px;padding:11px;background:var(--s2);border:1px solid var(--border);display:none;}
.ai-res.show{display:block;}
.ai-res p{font-size:10px;color:#aaa;line-height:1.6;}
.ldots{display:inline-flex;gap:4px;align-items:center;}
.ldots span{width:5px;height:5px;border-radius:50%;background:var(--accent);animation:blink 1.2s infinite;}
.ldots span:nth-child(2){animation-delay:0.2s;}
.ldots span:nth-child(3){animation-delay:0.4s;}
@keyframes blink{0%,100%{opacity:0.2;}50%{opacity:1;}}

.sub-btn{width:100%;background:var(--accent);color:#000;font-family:'Syne',sans-serif;font-size:12px;font-weight:800;letter-spacing:0.08em;padding:13px;cursor:pointer;border:none;text-transform:uppercase;transition:opacity 0.15s;}
.sub-btn:hover{opacity:0.85;}
.sub-btn:disabled{opacity:0.35;cursor:not-allowed;}

/* BOTTOM BAR */
.bbar{position:fixed;bottom:0;left:0;right:0;background:rgba(7,7,7,0.97);backdrop-filter:blur(24px);border-top:1px solid var(--border);padding:11px 48px;display:flex;align-items:center;gap:20px;z-index:50;flex-wrap:wrap;}
.bs{display:flex;flex-direction:column;gap:1px;}
.bs .n{font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:var(--accent);}
.bs .l{font-size:8px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);}
.bdiv{width:1px;height:24px;background:var(--border);}
.mleg{display:flex;gap:8px;margin-left:auto;flex-wrap:wrap;}
.mli{font-family:'Syne',sans-serif;font-size:9px;font-weight:700;letter-spacing:0.06em;padding:3px 8px;}

@media(max-width:900px){
  header,.toolbar,.table-wrap{padding-left:16px;padding-right:16px;}
  .thead,.row{grid-template-columns:24px 1fr 55px 55px 80px 100px 28px;}
  .thead span:nth-child(3),.thead span:nth-child(4),.thead span:nth-child(5),.thead span:nth-child(6),
  .icell:nth-child(3),.icell:nth-child(4),.icell:nth-child(5),.icell:nth-child(6){display:none;}
  .dgrid,.ind-grid{grid-template-columns:1fr;}
  .ind-block.full{grid-column:1;}
  .ind-summary{grid-template-columns:repeat(3,1fr);}
  .bbar{padding:10px 16px;gap:12px;}
  .mleg{display:none;}
}
</style>
</head>
<body>

<header>
  <div class="eyebrow">// stackos · living roadmap · v4 · escala unificada</div>
  <h1>Roadmap<br><em>inteligente.</em></h1>
  <p class="subtitle">5 indicadores en la misma escala — todos positivos, todos de 1 a 100. Más alto siempre es mejor. Sin distorsión de fórmula.</p>

  <div class="formula-card">
    <div class="fc-title">// 5 indicadores · todos positivos · 1–100</div>
    <div class="fc-indicators">
      <div class="fc-ind"><div class="dot" style="background:var(--blue)"></div><strong>Facilidad</strong> técnica</div>
      <div class="fc-ind"><div class="dot" style="background:var(--orange)"></div><strong>Velocidad</strong> desarrollo</div>
      <div class="fc-ind"><div class="dot" style="background:var(--purple)"></div><strong>Eficiencia</strong> de coste</div>
      <div class="fc-ind"><div class="dot" style="background:var(--green)"></div><strong>Eng.</strong> inicial</div>
      <div class="fc-ind"><div class="dot" style="background:var(--accent)"></div><strong>Eng.</strong> lifetime</div>
    </div>
    <div class="fc-formula" id="fc-formula-text">
      Score = <em>(Eng.Inicial × 0.35)</em> + <em>(Eng.Lifetime × 0.20)</em> + <em>(Facilidad × 0.20)</em> + <em>(Velocidad × 0.15)</em> + <em>(Eficiencia × 0.10)</em>
    </div>
    <div class="fc-note">100 = máximo en todos. Modo lanzamiento: engagement inicial pesa más.</div>
    <button class="mode-btn" id="mode-btn" onclick="toggleMode()">
      <div class="mode-dot"></div>
      <span id="mode-label">Modo lanzamiento — cambiar a retención</span>
    </button>
  </div>

  <button class="add-btn" onclick="openModal()">
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    Nueva funcionalidad
  </button>
</header>

<div class="toolbar">
  <span class="tlabel">ordenar:</span>
  <button class="tbtn active" onclick="sortBy('score',this)">Score</button>
  <button class="tbtn" onclick="sortBy('einicial',this)">Eng.inicial</button>
  <button class="tbtn" onclick="sortBy('elifetime',this)">Eng.lifetime</button>
  <button class="tbtn" onclick="sortBy('facilidad',this)">Facilidad</button>
  <button class="tbtn" onclick="sortBy('moscow',this)">MoSCoW</button>
  <div class="tsep"></div>
  <span class="tlabel">filtrar:</span>
  <button class="tbtn fm" onclick="filterM('M',this)">Must</button>
  <button class="tbtn fs" onclick="filterM('S',this)">Should</button>
  <button class="tbtn fc" onclick="filterM('C',this)">Could</button>
  <button class="tbtn fw" onclick="filterM('W',this)">Won't</button>
  <button class="tbtn" onclick="filterM(null,this)">Todas</button>
</div>

<div class="table-wrap">
  <div class="thead">
    <span>#</span>
    <span>Funcionalidad</span>
    <span>Facil.</span>
    <span>Veloc.</span>
    <span>Efic.</span>
    <span>Eng.ini</span>
    <span>Eng.life</span>
    <span>Score</span>
    <span>MoSCoW</span>
    <span></span>
  </div>
  <div id="rc"></div>
</div>

<div class="bbar">
  <div class="bs"><div class="n" id="st-total">0</div><div class="l">funcionalidades</div></div>
  <div class="bdiv"></div>
  <div class="bs"><div class="n" id="st-must">0</div><div class="l">must have</div></div>
  <div class="bdiv"></div>
  <div class="bs"><div class="n" id="st-avg">—</div><div class="l">score medio</div></div>
  <div class="bdiv"></div>
  <div class="bs"><div class="n" id="st-mode" style="color:var(--accent);font-size:12px">LANZAMIENTO</div><div class="l">modo activo</div></div>
  <div class="mleg">
    <span class="mli" style="color:var(--must);border:1px solid rgba(232,255,71,0.2)">M · Must have</span>
    <span class="mli" style="color:var(--should);border:1px solid rgba(71,184,255,0.2)">S · Should have</span>
    <span class="mli" style="color:var(--could);border:1px solid rgba(77,255,145,0.2)">C · Could have</span>
    <span class="mli" style="color:var(--wont);border:1px solid rgba(255,79,79,0.2)">W · Won't have</span>
  </div>
</div>

<!-- TOAST -->
<div class="toast" id="toast">✓ Prompt copiado al portapapeles</div>

<!-- PROMPT MODAL -->
<div class="prompt-overlay" id="prompt-overlay" onclick="promptOverlayClick(event)">
  <div class="prompt-modal">
    <div class="pm-head">
      <div class="pm-title">Prompt para <em>IA builder</em></div>
      <div class="pm-actions">
        <button class="pm-copy" id="pm-copy-btn" onclick="copyPrompt()">⎘ Copiar prompt</button>
        <button class="pm-close" onclick="closePromptModal()">✕</button>
      </div>
    </div>
    <div class="pm-body">
      <textarea class="pm-textarea" id="pm-textarea" readonly></textarea>
      <div class="pm-hint">Pega este prompt directamente en Cursor, Claude, Windsurf o cualquier IA de coding. Contiene toda la información necesaria para construir la funcionalidad.</div>
    </div>
  </div>
</div>

<!-- MODAL -->
<div class="overlay" id="overlay" onclick="ovClick(event)">
  <div class="modal">
    <div class="mhead">
      <div class="mtitle">Nueva<br><em>funcionalidad</em></div>
      <button class="clos" onclick="closeModal()">✕</button>
    </div>
    <div class="mbody">
      <div class="field">
        <label>Nombre *</label>
        <input type="text" id="f-name" placeholder="Ej: Detector de herramientas redundantes">
      </div>
      <div class="field">
        <label>Descripción *</label>
        <textarea id="f-desc" placeholder="¿Qué hace? ¿Qué problema resuelve al usuario?"></textarea>
      </div>

      <div style="font-size:8px;letter-spacing:0.2em;text-transform:uppercase;color:var(--muted);margin-bottom:8px;">Indicadores — todos de 1 a 100, más alto = mejor</div>

      <div class="ind-grid">
        <div class="ind-block ind-facilidad">
          <div class="ind-head"><label>Facilidad técnica</label><div class="ind-val" id="v-fac" style="color:var(--blue)">50</div></div>
          <div class="ind-hint">100 = trivial con IA. 1 = muy complejo aunque con IA.</div>
          <input type="range" id="f-fac" min="1" max="100" value="50" oninput="upSlider('fac',this.value)">
        </div>
        <div class="ind-block ind-velocidad">
          <div class="ind-head"><label>Velocidad desarrollo</label><div class="ind-val" id="v-vel" style="color:var(--orange)">50</div></div>
          <div class="ind-hint">100 = horas con IA. 1 = meses incluso con IA.</div>
          <input type="range" id="f-vel" min="1" max="100" value="50" oninput="upSlider('vel',this.value)">
        </div>
        <div class="ind-block ind-eficiencia">
          <div class="ind-head"><label>Eficiencia de coste</label><div class="ind-val" id="v-efi" style="color:var(--purple)">70</div></div>
          <div class="ind-hint">100 = coste cero de mantenimiento. 1 = muy caro de mantener.</div>
          <input type="range" id="f-efi" min="1" max="100" value="70" oninput="upSlider('efi',this.value)">
        </div>
        <div class="ind-block ind-einicial">
          <div class="ind-head"><label>Engagement inicial</label><div class="ind-val" id="v-eini" style="color:var(--green)">60</div></div>
          <div class="ind-hint">100 = "wow" inmediato en el primer uso.</div>
          <input type="range" id="f-eini" min="1" max="100" value="60" oninput="upSlider('eini',this.value)">
        </div>
        <div class="ind-block ind-elifetime full">
          <div class="ind-head"><label>Engagement lifetime</label><div class="ind-val" id="v-elif" style="color:var(--accent)">50</div></div>
          <div class="ind-hint">100 = el usuario lo usa cada día para siempre. Valor recurrente a largo plazo.</div>
          <input type="range" id="f-elif" min="1" max="100" value="50" oninput="upSlider('elif',this.value)">
        </div>
      </div>

      <!-- SCORE PREVIEW -->
      <div class="score-prev">
        <div class="sp-left">
          <div class="n" id="prev-score">—</div>
          <div class="l">score</div>
        </div>
        <div class="sp-right">
          <div class="ml">MoSCoW calculado</div>
          <div class="mname" id="prev-moscow">—</div>
          <div class="formula" id="prev-formula">Mueve los sliders para ver el resultado en tiempo real</div>
        </div>
      </div>

      <div class="field">
        <label>Fase estimada</label>
        <select id="f-phase">
          <option value="Ahora">Ahora</option>
          <option value="Próximo mes">Próximo mes</option>
          <option value="Q3 2025">Q3 2025</option>
          <option value="Q4 2025">Q4 2025</option>
          <option value="Q1 2026">Q1 2026</option>
        </select>
      </div>

      <div class="ai-sec">
        <div class="ai-title">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="var(--accent)" stroke-width="1.2"/><path d="M6 3v3l2 1" stroke="var(--accent)" stroke-width="1.2" stroke-linecap="round"/></svg>
          Análisis con IA
        </div>
        <label class="ai-tog">
          <input type="checkbox" id="ai-check" checked>
          <span>Claude ajusta los indicadores y añade contexto: why, how, tech stack</span>
        </label>
        <div class="ai-res" id="ai-res"><p id="ai-txt">—</p></div>
      </div>

      <button class="sub-btn" id="sub-btn" onclick="submitFeature()">Añadir al roadmap →</button>
    </div>
  </div>
</div>

<script>
// ── WEIGHTS ──
const WEIGHTS = {
  launch:    { einicial:0.35, elifetime:0.20, facilidad:0.20, velocidad:0.15, eficiencia:0.10 },
  retention: { einicial:0.20, elifetime:0.35, facilidad:0.20, velocidad:0.15, eficiencia:0.10 }
};
let mode = 'launch';

function calcScore(f, m) {
  const w = WEIGHTS[m];
  const s = f.einicial*w.einicial + f.elifetime*w.elifetime + f.facilidad*w.facilidad + f.velocidad*w.velocidad + f.eficiencia*w.eficiencia;
  return Math.min(100, Math.max(1, Math.round(s)));
}
function calcMoscow(s) {
  if (s>=75) return 'M';
  if (s>=55) return 'S';
  if (s>=35) return 'C';
  return 'W';
}

// ── SEED DATA — todos los indicadores en escala positiva ──
// facilidad: 100=muy fácil, velocidad: 100=muy rápido, eficiencia: 100=muy barato
const SEED = [
  {id:1, name:'Dashboard de coste total del stack', desc:'Vista del gasto mensual/anual. Desglose por capa y proyecto con gráfica de evolución.', facilidad:85, velocidad:80, eficiencia:95, einicial:92, elifetime:85, phase:'Ahora', why:'El primer "wow" del producto. Ver tu gasto real de un vistazo es el screenshot que se comparte.', how:'Recharts en React con datos ya en Supabase. Sin backend nuevo.', tech:['React','Recharts','Supabase'], aiNote:'Sin este dashboard el producto no tiene propuesta de valor clara en el primer uso.'},
  {id:2, name:'Catálogo curado de herramientas', desc:'Base de datos de tools por capa con planes y precios. Añadir al stack con un click.', facilidad:88, velocidad:75, eficiencia:92, einicial:88, elifetime:78, phase:'Ahora', why:'Elimina la fricción del onboarding. Pasar de entrada manual a buscar y añadir multiplica activaciones.', how:'Tabla tools en Supabase poblada a mano. 60–80 tools iniciales. Búsqueda ilike.', tech:['Supabase','React'], aiNote:'Sin catálogo la tasa de onboarding completado cae drásticamente.'},
  {id:3, name:'Alertas de vencimiento configurables', desc:'Email automático N días antes de cada renovación. El usuario elige cuándo avisarse por tool.', facilidad:75, velocidad:78, eficiencia:88, einicial:85, elifetime:90, phase:'Ahora', why:'Resuelve el dolor más universal. Cada email genera una revisita y refuerza el hábito.', how:'node-cron en Railway. Resend para emails. Columna alert_days_before en Supabase.', tech:['node-cron','Resend','Supabase'], aiNote:'Crea un loop de retención automático sin que el usuario tenga que recordar volver.'},
  {id:4, name:'Exportar stack como tarjeta visual', desc:'Genera imagen/PNG del stack para compartir en Twitter o LinkedIn con branding de StackOS.', facilidad:82, velocidad:85, eficiencia:97, einicial:80, elifetime:45, phase:'Ahora', why:'Viralidad orgánica de coste cero. Cada share es marketing gratuito.', how:'html2canvas en React sobre componente de tarjeta. Sin backend.', tech:['html2canvas','React'], aiNote:'Los builders comparten su stack en redes. Fuente de adquisición orgánica potente.'},
  {id:5, name:'Priorización de producto con IA', desc:'Motor de decisión de producto para builders. 5 indicadores en escala unificada 1–100 (facilidad, velocidad, eficiencia de coste, engagement inicial, engagement lifetime). Fórmula ponderada con modo lanzamiento/retención intercambiable. Score automático 0–100, MoSCoW calculado, estados por funcionalidad (activa, validada, pospuesta, archivada) con botones de transición contextuales. Exportador de prompt para IA de coding. Análisis y ajuste de indicadores vía Claude API.', facilidad:82, velocidad:84, eficiencia:70, einicial:93, elifetime:90, phase:'Ahora',
    why:'El mayor dolor del builder en solitario no es construir — es saber qué construir primero. Esta feature lo resuelve de forma sistemática, contextualizada para vibe coders que construyen con IA y necesitan priorizar sin desperdicio.',
    how:'Formulario con 5 sliders + score preview en tiempo real + Claude API para ajuste de indicadores y análisis. Estados (activa/validada/pospuesta/archivada) en Supabase con campo state. Exportador de prompt genera texto estructurado listo para pegar en Cursor o Claude. Dos modos de fórmula (lanzamiento/retención) configurables desde UI. Toda la lógica de scoring en frontend, sin backend extra.',
    tech:['Claude API','React','Supabase','localStorage'],
    aiNote:'Esta feature convierte StackOS de gestor de stack en herramienta de decisión de producto. Amplía el ICP y justifica el precio Premium. Es la funcionalidad más diferencial del roadmap completo.'},
  {id:6, name:'Asistente IA de stack (chat)', desc:'Chat que recomienda herramientas, detecta redundancias y sugiere alternativas más baratas.', facilidad:62, velocidad:60, eficiencia:68, einicial:90, elifetime:88, phase:'Próximo mes', why:'Diferencial absoluto frente a cualquier gestor de suscripciones existente.', how:'Claude API con contexto del stack inyectado. Endpoint Express. Chat simple React.', tech:['Claude API','Express','React'], aiNote:'Ningún competidor tiene IA conversacional. Genera dependencia y visitas recurrentes.'},
  {id:7, name:'Detector de herramientas redundantes', desc:'La IA señala duplicidades: "tienes Resend y SendGrid activos, estás pagando dos veces".', facilidad:65, velocidad:68, eficiencia:75, einicial:92, elifetime:80, phase:'Próximo mes', why:'Momento "oh mierda" que convierte al usuario en evangelizador instantáneo.', how:'Lógica de categorías en Supabase + prompt análisis a Claude API.', tech:['Claude API','Supabase','React'], aiNote:'El ROI medible de esta feature genera el boca a boca más potente del producto.'},
  {id:8, name:'Score de salud del stack', desc:'Puntuación 0–100: redundancias, sin uso, coste vs alternativas, cobertura de capas.', facilidad:58, velocidad:55, eficiencia:90, einicial:82, elifetime:85, phase:'Próximo mes', why:'Gamificación poderosa. El builder quiere el 100 y vuelve a mejorar.', how:'Algoritmo de scoring en Express con reglas configurables.', tech:['Express','Supabase','React'], aiNote:'La gamificación es el mecanismo de retención más efectivo en herramientas de productividad.'},
  {id:9, name:'Comparador de herramientas', desc:'Compara 2+ herramientas de la misma capa: precio, features, límites de plan.', facilidad:62, velocidad:52, eficiencia:85, einicial:72, elifetime:65, phase:'Próximo mes', why:'SEO potente y útil para builders en fase de decisión.', how:'Vista comparativa en React con datos del catálogo enriquecido.', tech:['React','Supabase'], aiNote:'Muy buen SEO pero no crítico para retención.'},
  {id:10, name:'Marketplace de stacks por proyecto', desc:'Stacks preconfigurados: SaaS B2B, landing, ecommerce… Importar con un click.', facilidad:60, velocidad:58, eficiencia:88, einicial:85, elifetime:75, phase:'Q3 2025', why:'Reduce el onboarding a cero y puede ser viral en comunidades indie.', how:'Tabla stack_templates en Supabase. UI de importación. 8–10 templates iniciales.', tech:['Supabase','React'], aiNote:'Potencial de viralidad en Product Hunt y comunidades de builders.'},
  {id:11, name:'Integración Stripe (billing real)', desc:'Conecta tu cuenta Stripe y detecta automáticamente qué estás pagando y cuánto.', facilidad:32, velocidad:38, eficiencia:80, einicial:88, elifetime:92, phase:'Q3 2025', why:'Elimina la fricción de entrada manual. Producto se convierte en mirror del gasto real.', how:'OAuth con Stripe Connect. Leer invoices/subscriptions. Mapear a catálogo.', tech:['Stripe Connect','Express','Supabase'], aiNote:'Alta complejidad pero elimina la mayor fricción del producto.'},
  {id:12, name:'Integración Railway (uso y coste)', desc:'Conecta Railway API y muestra consumo y coste acumulado del mes por servicio.', facilidad:45, velocidad:48, eficiencia:82, einicial:78, elifetime:82, phase:'Q3 2025', why:'Railway es el backend del vibe coder. Datos en tiempo real es un superpoder.', how:'API Key Railway. Polling horario. Métricas en la card de Railway.', tech:['Railway API','Express','Supabase'], aiNote:'Refuerza el concepto de nodo central de control del stack.'},
  {id:13, name:'Integración Supabase (uso y billing)', desc:'Muestra uso real del proyecto Supabase: filas, storage, bandwidth, coste del mes.', facilidad:48, velocidad:50, eficiencia:85, einicial:76, elifetime:80, phase:'Q3 2025', why:'Supabase es la DB del 80% de vibe coders. Uso real sin salir de StackOS.', how:'Supabase Management API. Token por proyecto. Polling periódico.', tech:['Supabase Management API','Express'], aiNote:'Convierte StackOS en el único dashboard necesario para el vibe coder.'},
  {id:14, name:'Optimizador de coste con IA', desc:'La IA sugiere acciones concretas para reducir el coste mensual: plan, tool o alternativa.', facilidad:42, velocidad:45, eficiencia:62, einicial:88, elifetime:90, phase:'Q4 2025', why:'ROI directo medible. "StackOS me ahorró 120€/mes" es el quote viral.', how:'Contexto del stack + precios del catálogo enviados a Claude API.', tech:['Claude API','Express','Supabase'], aiNote:'El caso de éxito más compartible del producto. Activa la conversión a plan de pago.'},
  {id:15, name:'Multi-proyecto con vista consolidada', desc:'Gestiona el stack de varios proyectos con dashboard global de coste total.', facilidad:38, velocidad:35, eficiencia:78, einicial:75, elifetime:85, phase:'Q4 2025', why:'Activa el plan Pro de forma natural en builders con varios proyectos.', how:'Tabla projects en Supabase. RLS por proyecto. Vista global.', tech:['Supabase','Express','React'], aiNote:'El builder multi-proyecto es el cliente que más paga y menos abandona.'},
  {id:16, name:'Notificaciones push / Slack / Telegram', desc:'Alertas de vencimiento y anomalías por push web, Slack o Telegram.', facilidad:45, velocidad:42, eficiencia:80, einicial:65, elifetime:72, phase:'Q4 2025', why:'Cierra el loop fuera de la app donde el builder ya trabaja.', how:'Web Push API o webhooks de Slack/Telegram. Canal configurable.', tech:['Web Push','Slack API','Telegram Bot'], aiNote:'Las alertas por email son suficientes en fase de lanzamiento.'},
  {id:17, name:'API pública + webhooks', desc:'API REST para leer el stack desde otras apps y webhooks para eventos.', facilidad:18, velocidad:15, eficiencia:70, einicial:45, elifetime:70, phase:'Q1 2026', why:'Convierte StackOS en infraestructura para builders avanzados.', how:'Rutas en Express con auth por API Key. Sistema de webhooks con reintentos.', tech:['Express','Supabase'], aiNote:'Sin base de usuarios sólida esta feature no tiene sentido aún.'},
];

let features = JSON.parse(localStorage.getItem('stackos-v4b') || 'null') || SEED.map(f=>({...f, score:calcScore(f,'launch'), moscow:calcMoscow(calcScore(f,'launch'))}));
let nextId = Math.max(...features.map(f=>f.id)) + 1;
let currentSort = 'score';
let currentFilter = null;

function save() { localStorage.setItem('stackos-v4b', JSON.stringify(features)); }

// ── COLORS / INFO ──
function scoreColor(s) {
  if (s>=75) return 'var(--must)';
  if (s>=55) return 'var(--should)';
  if (s>=35) return 'var(--could)';
  return 'var(--wont)';
}
function indColor(k) {
  return {facilidad:'var(--blue)',velocidad:'var(--orange)',eficiencia:'var(--purple)',einicial:'var(--green)',elifetime:'var(--accent)'}[k];
}
function mbInfo(m) {
  return {M:{cls:'mb-M',short:'MUST',full:'Must have'},S:{cls:'mb-S',short:'SHOULD',full:'Should have'},C:{cls:'mb-C',short:'COULD',full:'Could have'},W:{cls:'mb-W',short:"WON'T",full:"Won't have"}}[m]||{cls:'mb-C',short:'COULD',full:'Could have'};
}

// ── MODE TOGGLE ──
function toggleMode() {
  mode = mode==='launch'?'retention':'launch';
  const btn = document.getElementById('mode-btn');
  const lbl = document.getElementById('mode-label');
  const st  = document.getElementById('st-mode');
  const ft  = document.getElementById('fc-formula-text');
  if (mode==='retention') {
    btn.classList.add('retention');
    lbl.textContent = 'Modo retención — cambiar a lanzamiento';
    st.style.color='var(--blue)'; st.textContent='RETENCIÓN';
    ft.innerHTML = 'Score = <em>(Eng.Inicial × 0.20)</em> + <em>(Eng.Lifetime × 0.35)</em> + <em>(Facilidad × 0.20)</em> + <em>(Velocidad × 0.15)</em> + <em>(Eficiencia × 0.10)</em>';
  } else {
    btn.classList.remove('retention');
    lbl.textContent = 'Modo lanzamiento — cambiar a retención';
    st.style.color='var(--accent)'; st.textContent='LANZAMIENTO';
    ft.innerHTML = 'Score = <em>(Eng.Inicial × 0.35)</em> + <em>(Eng.Lifetime × 0.20)</em> + <em>(Facilidad × 0.20)</em> + <em>(Velocidad × 0.15)</em> + <em>(Eficiencia × 0.10)</em>';
  }
  features.forEach(f=>{ f.score=calcScore(f,mode); f.moscow=calcMoscow(f.score); });
  save(); render();
}

// ── SORT / FILTER ──
const moscowOrder = ['M','S','C','W'];
function getSorted() {
  let d = features.filter(f=>!['postponed','archived'].includes(getState(f)));
  if (currentFilter) d = d.filter(f=>f.moscow===currentFilter);
  if (currentSort==='score')          d.sort((a,b)=>b.score-a.score);
  else if (currentSort==='einicial')  d.sort((a,b)=>b.einicial-a.einicial);
  else if (currentSort==='elifetime') d.sort((a,b)=>b.elifetime-a.elifetime);
  else if (currentSort==='facilidad') d.sort((a,b)=>b.facilidad-a.facilidad);
  else if (currentSort==='moscow')    d.sort((a,b)=>moscowOrder.indexOf(a.moscow)-moscowOrder.indexOf(b.moscow)||b.score-a.score);
  return d;
}

// ── STATE HELPERS ──
// state: undefined/'active' | 'validated' | 'postponed' | 'archived'
function getState(f){ return f.state||'active'; }

function actionButtons(f) {
  const s = getState(f);
  const b = (cls,fn,label) => `<button class="abtn ${cls}" onclick="${fn}(${f.id},event)">${label}</button>`;
  const exportBtn = b('abtn-prompt','exportPrompt','⎘ Exportar prompt');
  if (s==='active')    return b('abtn-validate','validateF','✓ Validar') + b('abtn-postpone','postponeF','⏸ Posponer') + b('abtn-archive','archiveF','✕ Archivar') + exportBtn;
  if (s==='validated') return b('abtn-postpone','postponeF','⏸ Posponer') + b('abtn-archive','archiveF','✕ Archivar') + exportBtn;
  if (s==='postponed') return b('abtn-reactivate','reactivateF','↑ Reactivar') + b('abtn-archive','archiveF','✕ Archivar') + exportBtn;
  if (s==='archived')  return b('abtn-restore','restoreF','↩ Restaurar') + exportBtn;
  return '';
}

function statePip(f) {
  const s = getState(f);
  if (s==='validated') return '<span class="status-pip sp-validated">VALIDATED</span>';
  if (s==='postponed') return '<span class="status-pip sp-postponed">ON HOLD</span>';
  if (s==='archived')  return '<span class="status-pip sp-archived">ARCHIVED</span>';
  return '';
}

// ── BUILD ROW ──
function buildRow(f, idx, hlId) {
  const s = getState(f);
  const mb = mbInfo(f.moscow);
  const dimmed = s==='archived'||s==='postponed';
  const pCls = s==='archived'?'wont':s==='postponed'?'later':({M:'must',S:'should',C:'could',W:'wont'}[f.moscow]||'could');
  const row = document.createElement('div');
  row.className = `row p-${pCls} ${s!=='active'?s:''}${hlId===f.id?' flash':''}`.trim();
  const ic = dimmed?'#444':indColor;
  const ib = dimmed?'#2a2a2a':null;
  const iCell = (k,v) => `<div class="icell"><div class="ival" style="color:${dimmed?'#444':indColor(k)}">${v}</div><div class="ibar"><div class="ibar-fill" style="width:${v}%;background:${dimmed?'#2a2a2a':indColor(k)}"></div></div></div>`;
  const w = WEIGHTS[mode];
  const scoreBreakdown = `<em>Eng.ini</em> ${f.einicial}×${w.einicial} + <em>Eng.life</em> ${f.elifetime}×${w.elifetime} + <em>Facil.</em> ${f.facilidad}×${w.facilidad} + <em>Veloc.</em> ${f.velocidad}×${w.velocidad} + <em>Efic.</em> ${f.eficiencia}×${w.eficiencia} = <strong style="color:${scoreColor(f.score)}">${f.score}</strong>`;

  const mBadgeCls = s==='archived'?'mb-W':s==='postponed'?'mb-W':mb.cls;
  const mBadgeShort = s==='archived'?'ARCH':s==='postponed'?'HOLD':s==='validated'?'✓ '+mb.short:mb.short;
  const mBadgeFull = s==='archived'?'Archivada':s==='postponed'?'En espera':mb.full;
  const scoreStyleColor = dimmed?'#444':scoreColor(f.score);

  row.innerHTML = `
    <div class="rnum">${String(idx).padStart(2,'0')}</div>
    <div class="rmain">
      <div class="rname">${f.name}${statePip(f)}</div>
      <div class="rdesc">${f.desc}</div>
      <div class="rdetail">
        <div class="ind-summary">
          <div class="isb"><label>Facilidad</label><div class="isv" style="color:var(--blue)">${f.facilidad}</div></div>
          <div class="isb"><label>Velocidad</label><div class="isv" style="color:var(--orange)">${f.velocidad}</div></div>
          <div class="isb"><label>Eficiencia</label><div class="isv" style="color:var(--purple)">${f.eficiencia}</div></div>
          <div class="isb"><label>Eng.inicial</label><div class="isv" style="color:var(--green)">${f.einicial}</div></div>
          <div class="isb"><label>Eng.lifetime</label><div class="isv" style="color:var(--accent)">${f.elifetime}</div></div>
        </div>
        <div class="dgrid">
          <div class="dblock">
            <label>Por qué importa</label>
            <p>${f.why||'—'}</p>
            ${f.aiNote?`<div class="ai-note">🤖 ${f.aiNote}</div>`:''}
          </div>
          <div class="dblock">
            <label>Cómo construirlo</label>
            <p>${f.how||'—'}</p>
            <div class="tpills">${(f.tech||[]).map(t=>`<span class="tpill">${t}</span>`).join('')}</div>
          </div>
          <div class="dblock">
            <label>Cálculo del score</label>
            <p style="font-size:10px;color:#666;line-height:1.9;">${scoreBreakdown}</p>
            <p style="font-size:10px;color:#666;margin-top:6px;">MoSCoW → <strong style="color:${scoreColor(f.score)}">${mb.full}</strong></p>
            <div class="action-btns">${actionButtons(f)}</div>
          </div>
        </div>
      </div>
    </div>
    ${iCell('facilidad',f.facilidad)}
    ${iCell('velocidad',f.velocidad)}
    ${iCell('eficiencia',f.eficiencia)}
    ${iCell('einicial',f.einicial)}
    ${iCell('elifetime',f.elifetime)}
    <div class="scell">
      <div class="snum" style="color:${scoreStyleColor}">${f.score}</div>
      <div class="slabel">/100</div>
    </div>
    <div class="mcell">
      <span class="mbadge ${mBadgeCls}">${mBadgeShort}</span>
      <div class="mfull">${mBadgeFull}</div>
    </div>
    <div class="xbtn">+</div>
  `;

  const actionClasses = ['abtn-validate','abtn-postpone','abtn-archive','abtn-reactivate','abtn-restore','abtn-prompt'];
  row.addEventListener('click', e=>{
    if (actionClasses.some(c=>e.target.classList.contains(c))) return;
    const isOpen = row.classList.contains('open');
    document.querySelectorAll('.row.open').forEach(r=>r.classList.remove('open'));
    if (!isOpen) row.classList.add('open');
  });
  return row;
}

// ── SECTION DIVIDER ──
function makeDivider(cls, label, count) {
  const div = document.createElement('div');
  div.className = `section-divider div-${cls}`;
  div.innerHTML = `<div></div><div class="section-divider-inner"><span class="sname">${label} (${count})</span><div class="sline"></div></div>`;
  return div;
}

// ── RENDER ──
function render(hlId) {
  const rc = document.getElementById('rc');
  rc.innerHTML = '';

  const active    = getSorted(); // excludes postponed/archived
  const postponed = features.filter(f=>getState(f)==='postponed');
  const archived  = features.filter(f=>getState(f)==='archived');

  if (!active.length && !postponed.length && !archived.length) {
    rc.innerHTML='<div style="padding:60px;text-align:center;color:var(--muted);font-size:11px;">No hay funcionalidades.</div>';
    updateStats(); return;
  }

  if (!active.length) {
    rc.innerHTML='<div style="padding:32px;text-align:center;color:var(--muted);font-size:11px;">No hay funcionalidades activas con ese filtro.</div>';
  }

  active.forEach((f,i) => rc.appendChild(buildRow(f, i+1, hlId)));

  if (postponed.length) {
    rc.appendChild(makeDivider('postponed','⏸ En espera', postponed.length));
    postponed.forEach((f,i) => rc.appendChild(buildRow(f, i+1, hlId)));
  }

  if (archived.length) {
    rc.appendChild(makeDivider('archived','✕ Archivadas', archived.length));
    archived.forEach((f,i) => rc.appendChild(buildRow(f, i+1, hlId)));
  }

  updateStats();
}

function updateStats() {
  const active = features.filter(f=>!['archived','postponed'].includes(getState(f)));
  const d = currentFilter ? active.filter(f=>f.moscow===currentFilter) : active;
  document.getElementById('st-total').textContent = active.length;
  document.getElementById('st-must').textContent = active.filter(f=>f.moscow==='M').length;
  document.getElementById('st-avg').textContent = d.length?Math.round(d.reduce((s,f)=>s+f.score,0)/d.length):'—';
}

function sortBy(key,btn){currentSort=key;document.querySelectorAll('.tbtn:not(.fm):not(.fs):not(.fc):not(.fw)').forEach(b=>b.classList.remove('active'));btn.classList.add('active');render();}
function filterM(key,btn){currentFilter=key;document.querySelectorAll('.fm,.fs,.fc,.fw').forEach(b=>b.classList.remove('active'));if(key)btn.classList.add('active');render();}

function setState(id, newState) {
  features = features.map(f=>f.id===id?{...f,state:newState}:f);
  save(); render();
}
function validateF(id,e){e.stopPropagation();setState(id,'validated');}
function postponeF(id,e){e.stopPropagation();setState(id,'postponed');}
function archiveF(id,e){e.stopPropagation();setState(id,'archived');}
function reactivateF(id,e){e.stopPropagation();setState(id,'active');}
function restoreF(id,e){e.stopPropagation();setState(id,'active');}

// ── PROMPT EXPORT ──
function buildPromptText(f) {
  const w = WEIGHTS[mode];
  const mb = mbInfo(f.moscow);
  const stateLabel = {active:'Activa',validated:'Validada ✓',postponed:'En espera',archived:'Archivada'}[getState(f)]||'Activa';
  return `# ⚠️ ANTES DE ESCRIBIR CUALQUIER LÍNEA DE CÓDIGO — LEE ESTO

## Paso 1 — Lee los documentos de trabajo del proyecto (OBLIGATORIO)

Antes de proponer nada, leer en este orden:

1. \`AGENTS.md\` (raíz del repo) — especificación completa del proyecto: stack, estructura de carpetas, estándares de código, seguridad, variables de entorno, reglas multi-tenant si aplica, checklist de deploy.
2. \`docs/agents/AGENTS.md\` — secciones globales 1–14 del estándar Leadstodeals (aplican a todos los proyectos sin modificar).
3. \`docs/STATUS.md\` — estado vivo del sprint: qué está hecho, qué sigue, bloqueos activos, rutas locales.
4. \`docs/burnpilot_plan.md\` — plan maestro v1.3: posicionamiento, alcance y roadmap oficial.
5. \`docs/product_backlog_moscow.md\` — backlog de producto MoSCoW. LEER como contexto estratégico. NO implementar entradas de este archivo sin aprobación explícita del fundador.
6. \`docs/AGENT_CHAT_HANDOFF.md\` + \`docs/handoff/LATEST.md\` — snapshot del traspaso más reciente si existe.

**Regla crítica:** si hay conflicto entre lo que ves aquí y lo que dicen esos archivos, los archivos del repo mandan. Este prompt es orientación, no especificación final.

---

## Paso 2 — Contexto del producto

**Producto:** StackOS / BurnPilot — SaaS B2C de gestión y priorización de stack tecnológico para vibe coders. Builders no-programadores que construyen con IA.

**Stack (leer detalle completo en AGENTS.md P2):**
- Frontend: React 19 + Vite + TypeScript + Tailwind + shadcn/ui (Netlify)
- Backend: Node.js 20 + Express + TypeScript (Railway) — thin: billing, webhooks, crons, mail
- Base de datos: Supabase (Postgres + Auth + RLS por user_id). Cliente JS pineado a 2.49.1
- Auth: Supabase Auth (email+password + Google OAuth + verificación obligatoria)
- Estado global: Zustand (sesión, plan) + TanStack Query para datos de servidor
- Pagos: Stripe (Checkout + Customer Portal + Webhook + Stripe Tax)
- Email: Resend
- DNS/CDN: Cloudflare
- Monitorización: Sentry + Better Stack + Umami

**Aislación:** B2C — por \`auth.uid() = user_id\` en RLS. Sin multi-tenant.
**Dinero:** siempre en integer céntimos. Cero floats en cálculos financieros.

---

## Paso 3 — Funcionalidad a construir

**Nombre:** ${f.name}
**Estado en roadmap:** ${stateLabel} · ${f.phase}
**MoSCoW:** ${mb.full} · Score de prioridad: ${f.score}/100

### Qué hace
${f.desc}

### Por qué importa
${f.why || '—'}

### Cómo construirla
${f.how || '—'}

### Tech stack recomendado para esta feature
${(f.tech||[]).join(', ') || '—'}

${f.aiNote ? `### Insight de producto\n${f.aiNote}` : ''}

---

## Paso 4 — Scoring de prioridad (referencia)

| Indicador | Valor | Escala |
|---|---|---|
| Facilidad técnica | ${f.facilidad}/100 | 100 = trivial con IA |
| Velocidad de desarrollo | ${f.velocidad}/100 | 100 = horas con IA |
| Eficiencia de coste (mant.) | ${f.eficiencia}/100 | 100 = coste cero |
| Engagement inicial | ${f.einicial}/100 | 100 = wow primer uso |
| Engagement lifetime | ${f.elifetime}/100 | 100 = uso diario eterno |

**Fórmula modo ${mode === 'launch' ? 'lanzamiento' : 'retención'}:**
(${f.einicial}×${w.einicial}) + (${f.elifetime}×${w.elifetime}) + (${f.facilidad}×${w.facilidad}) + (${f.velocidad}×${w.velocidad}) + (${f.eficiencia}×${w.eficiencia}) = **${f.score}**

---

## Paso 5 — Instrucciones de implementación

1. **Lee AGENTS.md antes de proponer estructura, nombres de archivos o lógica.** Las convenciones ya están definidas — síguelas sin reinventarlas.

2. **El desarrollador es un vibe coder** — no sabe programar. Da instrucciones paso a paso, explica cada archivo que crees y por qué existe, y di exactamente dónde pegar cada fragmento de código.

3. **Sigue el protocolo P12 de AGENTS.md (hardening)** — si esta feature toca billing, auth, RLS, borrado de datos o lógica monetaria, activa hardening antes de declarar terminado.

4. **Para tablas nuevas en Supabase:** proporciona el SQL exacto de migración + RLS policies + índices necesarios. Formato \`supabase/migrations/YYYYMMDDHHMMSS_nombre.sql\`.

5. **Para endpoints nuevos en Express:** sigue el patrón controlador delgado / servicio gordo de AGENTS.md §5.5. Respuesta siempre \`{ ok: true, data }\` o \`{ ok: false, error, code }\`.

6. **Para componentes React:** un componente, una responsabilidad (AGENTS.md §5.1). Siempre los tres estados de UI: loading / error / vacío (§5.3). Props tipadas con TypeScript (§5.4).

7. **Variables de entorno nuevas:** añádelas al \`.env.example\` y documéntalas en AGENTS.md P9. En Railway sin comillas dobles.

8. **Antes de terminar:** ejecuta mentalmente el checklist de AGENTS.md §13 (antes de git push) y §14 (antes de deploy).

9. **Actualiza \`docs/STATUS.md\`** al cerrar la implementación con: qué se ha hecho, estado actual, próximo paso.

10. **Si el chat llega al límite de contexto:** genera el handoff siguiendo \`docs/AGENT_CHAT_HANDOFF.md\` y avisa al desarrollador para abrir chat nuevo.
`;
}

function exportPrompt(id, e) {
  e.stopPropagation();
  const f = features.find(x=>x.id===id);
  if (!f) return;
  const txt = buildPromptText(f);
  document.getElementById('pm-textarea').value = txt;
  document.getElementById('pm-copy-btn').textContent = '⎘ Copiar prompt';
  document.getElementById('pm-copy-btn').classList.remove('copied');
  document.getElementById('prompt-overlay').classList.add('open');
}

function closePromptModal() {
  document.getElementById('prompt-overlay').classList.remove('open');
}

function promptOverlayClick(e) {
  if (e.target === document.getElementById('prompt-overlay')) closePromptModal();
}

function copyPrompt() {
  const ta = document.getElementById('pm-textarea');
  navigator.clipboard.writeText(ta.value).then(() => {
    const btn = document.getElementById('pm-copy-btn');
    btn.textContent = '✓ Copiado';
    btn.classList.add('copied');
    showToast();
    setTimeout(()=>{ btn.textContent='⎘ Copiar prompt'; btn.classList.remove('copied'); }, 2500);
  });
}

function showToast() {
  const t = document.getElementById('toast');
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2200);
}

// ── MODAL ──
function openModal(){document.getElementById('overlay').classList.add('open');document.getElementById('f-name').focus();document.getElementById('ai-res').classList.remove('show');updatePreview();}
function closeModal(){document.getElementById('overlay').classList.remove('open');}
function ovClick(e){if(e.target===document.getElementById('overlay'))closeModal();}

// ── SLIDERS ──
function upSlider(key,val){
  document.getElementById('v-'+key).textContent=val;
  const el=document.getElementById('f-'+key);
  el.style.setProperty('--p',val+'%');
  updatePreview();
}
function getSliderVals(){
  return {
    facilidad:+document.getElementById('f-fac').value,
    velocidad:+document.getElementById('f-vel').value,
    eficiencia:+document.getElementById('f-efi').value,
    einicial:+document.getElementById('f-eini').value,
    elifetime:+document.getElementById('f-elif').value,
  };
}
function updatePreview(){
  const f = getSliderVals();
  const s = calcScore(f,mode);
  const m = calcMoscow(s);
  const mb = mbInfo(m);
  const w = WEIGHTS[mode];
  document.getElementById('prev-score').textContent=s;
  document.getElementById('prev-score').style.color=scoreColor(s);
  document.getElementById('prev-moscow').textContent=mb.full;
  document.getElementById('prev-moscow').style.color=scoreColor(s);
  document.getElementById('prev-formula').innerHTML=
    `<em>Eng.ini</em> ${f.einicial}×${w.einicial} + <em>Eng.life</em> ${f.elifetime}×${w.elifetime} + <em>Facil.</em> ${f.facilidad}×${w.facilidad} + <em>Veloc.</em> ${f.velocidad}×${w.velocidad} + <em>Efic.</em> ${f.eficiencia}×${w.eficiencia} = <strong>${s}</strong>`;
}

// init sliders
['fac','vel','efi','eini','elif'].forEach(k=>{
  const el=document.getElementById('f-'+k);
  el.style.setProperty('--p',el.value+'%');
});

// ── AI ──
async function analyzeWithAI(name,desc,vals){
  const res = await fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      model:'claude-sonnet-4-20250514',
      max_tokens:1000,
      messages:[{role:'user',content:`Eres product manager experto en SaaS para vibe coders que construyen con IA sin saber programar. Analiza esta funcionalidad para StackOS (app de gestión y priorización de stack tecnológico).

Funcionalidad: "${name}"
Descripción: "${desc}"
Indicadores propuestos (1-100, más alto = mejor siempre):
- Facilidad técnica (100=trivial con IA): ${vals.facilidad}
- Velocidad de desarrollo (100=horas con IA): ${vals.velocidad}
- Eficiencia de coste (100=coste cero mantenimiento): ${vals.eficiencia}
- Engagement inicial (100=wow inmediato): ${vals.einicial}
- Engagement lifetime (100=uso diario eterno): ${vals.elifetime}

Ajusta los indicadores si no son realistas. Responde SOLO con JSON válido sin markdown:
{"facilidad":<1-100>,"velocidad":<1-100>,"eficiencia":<1-100>,"einicial":<1-100>,"elifetime":<1-100>,"why":"<por qué importa, 1-2 frases español>","how":"<cómo construirlo con IA, 1-2 frases español>","tech":["t1","t2","t3"],"aiNote":"<insight clave 1 frase español>"}`}]
    })
  });
  const data = await res.json();
  return JSON.parse(data.content[0].text.trim());
}

// ── SUBMIT ──
async function submitFeature(){
  const name=document.getElementById('f-name').value.trim();
  const desc=document.getElementById('f-desc').value.trim();
  if(!name||!desc){alert('Nombre y descripción son obligatorios.');return;}
  const vals=getSliderVals();
  const phase=document.getElementById('f-phase').value;
  const useAI=document.getElementById('ai-check').checked;
  const btn=document.getElementById('sub-btn');
  btn.disabled=true;
  let fd={...vals,why:desc,how:'—',tech:[],aiNote:''};
  if(useAI){
    btn.textContent='Analizando con IA...';
    const aiRes=document.getElementById('ai-res');
    aiRes.classList.add('show');
    aiRes.querySelector('p').innerHTML='<div class="ldots"><span></span><span></span><span></span></div>';
    try{
      const ai=await analyzeWithAI(name,desc,vals);
      fd={facilidad:ai.facilidad||vals.facilidad,velocidad:ai.velocidad||vals.velocidad,eficiencia:ai.eficiencia||vals.eficiencia,einicial:ai.einicial||vals.einicial,elifetime:ai.elifetime||vals.elifetime,why:ai.why||desc,how:ai.how||'—',tech:ai.tech||[],aiNote:ai.aiNote||''};
      aiRes.querySelector('p').textContent=`✓ ${ai.aiNote||'Indicadores ajustados.'}`;
    }catch(e){aiRes.querySelector('p').textContent='Sin conexión con IA. Se usan tus valores.';}
  }
  const score=calcScore(fd,mode);
  const moscow=calcMoscow(score);
  const nf={id:nextId++,name,desc,phase,...fd,score,moscow};
  features.unshift(nf);
  save();
  closeModal();
  currentSort='score';
  document.querySelectorAll('.tbtn:not(.fm):not(.fs):not(.fc):not(.fw)').forEach(b=>b.classList.remove('active'));
  document.querySelector('.tbtn').classList.add('active');
  render(nf.id);
  btn.disabled=false;btn.textContent='Añadir al roadmap →';
  document.getElementById('f-name').value='';document.getElementById('f-desc').value='';
  ['fac','vel','efi','eini','elif'].forEach(k=>{
    const el=document.getElementById('f-'+k),def={fac:50,vel:50,efi:70,eini:60,elif:50}[k];
    el.value=def;document.getElementById('v-'+k).textContent=def;el.style.setProperty('--p',def+'%');
  });
  updatePreview();
}

updatePreview();
render();
</script>
</body>
</html>