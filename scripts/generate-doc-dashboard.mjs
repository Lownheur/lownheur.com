import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'dashboard_human_developper.html');
const ignored = new Set(['.git', 'node_modules', '.next', 'dist', 'coverage']);

function collect(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name)) return [];
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) return collect(target);
    return entry.isFile() && entry.name.toLowerCase().endsWith('.md') ? [target] : [];
  });
}

function category(file) {
  if (file === 'README.md') return 'Démarrage';
  if (file === 'AGENTS.md') return 'Agent';
  if (file.includes('/versions/')) return 'Versions';
  if (file.includes('/product/')) return 'Produit';
  if (file.includes('/architecture/')) return 'Architecture';
  if (/TASKS|WORKFLOW/.test(file)) return 'Exécution';
  if (file.includes('DECISIONS')) return 'Gouvernance';
  if (/CHANGELOG|JOURNAL/.test(file)) return 'Historique';
  return 'Autres';
}

const categoryOrder = ['Démarrage', 'Versions', 'Produit', 'Architecture', 'Exécution', 'Gouvernance', 'Historique', 'Agent', 'Autres'];
const docs = collect(root).map((absolute) => {
  const content = fs.readFileSync(absolute, 'utf8');
  const file = path.relative(root, absolute).replaceAll('\\', '/');
  const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? path.basename(file, '.md');
  const description = content.split(/\r?\n\r?\n/).map((part) => part.replace(/^#+\s+.*$/gm, '').replace(/^[-*|>].*$/gm, '').trim()).find((part) => part.length > 25)?.replace(/\s+/g, ' ').slice(0, 190) ?? '';
  return {
    id: file.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    file,
    title,
    description,
    category: category(file),
    updatedAt: fs.statSync(absolute).mtime.toISOString(),
    content,
  };
}).sort((a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) || a.file.localeCompare(b.file, 'fr'));

const tasksText = docs.find((doc) => doc.file.endsWith('TASKS_V1.md'))?.content ?? '';
const taskStatuses = [...tasksText.matchAll(/\*\*(V1-\d+)[^\n]*?— \x60([^\x60]+)\x60/g)].map((match) => match[2]);
const versionText = docs.find((doc) => doc.file.endsWith('versions/V1.md'))?.content ?? '';
const versionStatus = versionText.match(/\*\*Statut\*\*\s*:\s*([^\n]+)/)?.[1]?.trim() ?? 'Inconnu';
const decisionsText = docs.find((doc) => doc.file.endsWith('DECISIONS.md'))?.content ?? '';
const summary = {
  docs: docs.length,
  tasks: taskStatuses.length,
  done: taskStatuses.filter((status) => status === 'TERMINÉ').length,
  active: taskStatuses.filter((status) => status === 'EN COURS').length,
  decisions: [...decisionsText.matchAll(/^- \*\*D-\d+/gm)].length,
  versionStatus,
};
const docsJson = JSON.stringify(docs).replaceAll('</script', '<\\/script');
const summaryJson = JSON.stringify(summary);
const generatedAt = new Date().toISOString();

const html = String.raw`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark light">
  <title>Lownheur · Human Developer</title>
  <style>
    :root{--bg:#0a0d11;--side:#0f1318;--card:#141a21;--card2:#1a222b;--text:#edf1f2;--muted:#909ba6;--faint:#626e79;--border:#27313b;--accent:#b9f566;--accent-ink:#152008;--soft:rgba(185,245,102,.1);--blue:#7dbaff;--orange:#ffb568;--shadow:0 24px 70px rgba(0,0,0,.32);--radius:18px;--ui:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;--mono:"SFMono-Regular",Consolas,monospace}
    html[data-theme=light]{--bg:#f4f6f2;--side:#edf0ea;--card:#fff;--card2:#f0f3ed;--text:#172019;--muted:#667068;--faint:#89918b;--border:#d8ded5;--accent:#487d0b;--accent-ink:#fff;--soft:rgba(72,125,11,.09);--blue:#246ca9;--orange:#a95600;--shadow:0 22px 55px rgba(27,43,25,.11)}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;min-width:320px;background:var(--bg);color:var(--text);font:14px/1.55 var(--ui)}button,input{font:inherit}button,a{-webkit-tap-highlight-color:transparent}button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid color-mix(in srgb,var(--accent) 65%,transparent);outline-offset:2px}
    .skip{position:fixed;left:16px;top:-70px;z-index:99;padding:9px 13px;border-radius:9px;color:var(--accent-ink);background:var(--accent)}.skip:focus{top:12px}.shell{display:grid;grid-template-columns:284px minmax(0,1fr);min-height:100vh}.sidebar{position:sticky;top:0;z-index:30;height:100vh;overflow:auto;padding:22px 18px;background:var(--side);border-right:1px solid var(--border)}
    .brand{display:flex;gap:12px;align-items:center;margin:0 6px 24px}.logo{display:grid;width:42px;height:42px;place-items:center;border-radius:13px;color:var(--accent-ink);background:var(--accent);font-size:18px;font-weight:900;box-shadow:0 10px 30px color-mix(in srgb,var(--accent) 20%,transparent)}.brand strong,.brand small{display:block}.brand small{color:var(--muted);font-size:11px}
    .search{position:relative;margin-bottom:22px}.search input{width:100%;padding:11px 42px 11px 13px;border:1px solid var(--border);border-radius:12px;color:var(--text);background:var(--card)}.search span{position:absolute;right:9px;top:50%;transform:translateY(-50%);padding:2px 5px;border:1px solid var(--border);border-radius:5px;color:var(--faint);font:10px var(--mono)}
    .group{margin:0 0 18px}.group-label{margin:0 10px 6px;color:var(--faint);font-size:10px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}.nav-btn{display:flex;width:100%;gap:10px;align-items:center;padding:9px 10px;border:0;border-radius:10px;color:var(--muted);background:transparent;cursor:pointer;text-align:left}.nav-btn:hover{color:var(--text);background:var(--card2)}.nav-btn[aria-current=page]{color:var(--text);background:var(--soft)}.dot{width:7px;height:7px;flex:none;border-radius:50%;background:var(--faint)}[aria-current=page] .dot{background:var(--accent);box-shadow:0 0 0 4px var(--soft)}.nav-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.side-foot{margin:24px 6px 0;padding-top:15px;border-top:1px solid var(--border);color:var(--faint);font-size:10px}
    .main{min-width:0}.top{position:sticky;top:0;z-index:20;display:flex;min-height:70px;gap:16px;align-items:center;justify-content:space-between;padding:11px clamp(18px,4vw,54px);border-bottom:1px solid color-mix(in srgb,var(--border) 76%,transparent);background:color-mix(in srgb,var(--bg) 86%,transparent);backdrop-filter:blur(18px)}.top-side,.actions{display:flex;gap:9px;align-items:center}.crumb{min-width:0}.eyebrow{color:var(--accent);font-size:10px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}.current{overflow:hidden;font-weight:700;text-overflow:ellipsis;white-space:nowrap}
    .btn{display:inline-flex;min-height:38px;gap:7px;align-items:center;justify-content:center;padding:8px 12px;border:1px solid var(--border);border-radius:10px;color:var(--text);background:var(--card);cursor:pointer;text-decoration:none}.btn:hover{background:var(--card2)}.btn.icon{width:40px;padding:8px}.btn.primary{color:var(--accent-ink);background:var(--accent);border-color:var(--accent)}.menu{display:none}.content{width:min(1180px,100%);margin:auto;padding:clamp(28px,5vw,68px) clamp(18px,4vw,54px) 80px}.view[hidden]{display:none}
    .hero{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr);gap:18px;margin-bottom:18px}.hero-main,.gate,.metric,.doc-card,.progress,.result{border:1px solid var(--border);border-radius:var(--radius);background:var(--card)}.hero-main{position:relative;overflow:hidden;padding:clamp(28px,5vw,52px);box-shadow:var(--shadow)}.hero-main:after{position:absolute;right:-100px;top:-120px;width:260px;height:260px;border-radius:50%;background:var(--accent);filter:blur(80px);opacity:.13;content:""}.hero h1{max-width:680px;margin:9px 0 14px;font-size:clamp(38px,6vw,66px);line-height:.96;letter-spacing:-.058em}.hero p{max-width:650px;margin:0;color:var(--muted);font-size:16px}.gate{display:flex;flex-direction:column;justify-content:space-between;padding:24px;background:linear-gradient(145deg,var(--card),var(--card2))}.pill{display:inline-flex;width:fit-content;padding:6px 9px;border:1px solid color-mix(in srgb,var(--orange) 35%,var(--border));border-radius:99px;color:var(--orange);background:color-mix(in srgb,var(--orange) 8%,transparent);font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase}.gate h2{margin:17px 0 7px;font-size:24px;line-height:1.12;letter-spacing:-.03em}.gate p{margin:0 0 22px;color:var(--muted);font-size:12px}
    .metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px;margin:0 0 34px}.metric{padding:18px}.metric-label{color:var(--muted);font-size:11px}.metric-value{margin-top:4px;font-size:29px;font-weight:900;letter-spacing:-.05em}.metric-note{color:var(--faint);font-size:10px}.section-head{margin-bottom:14px}.section-head h2{margin:0;font-size:21px;letter-spacing:-.025em}.section-head p{margin:2px 0 0;color:var(--muted);font-size:11px}.doc-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px;margin-bottom:34px}.doc-card{display:flex;min-height:176px;flex-direction:column;padding:19px;color:var(--text);cursor:pointer;text-align:left;transition:.18s transform,.18s border-color}.doc-card:hover{transform:translateY(-3px);border-color:color-mix(in srgb,var(--accent) 42%,var(--border));background:var(--card2)}.doc-card small{color:var(--accent);font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.doc-card strong{margin:11px 0 7px;font-size:16px;line-height:1.23}.doc-card p{margin:0;color:var(--muted);font-size:11px}.path{margin-top:auto;padding-top:13px;color:var(--faint);font:10px var(--mono)}
    .progress{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:center;padding:24px}.progress h2{margin:0 0 4px;font-size:18px}.progress p{margin:0;color:var(--muted);font-size:11px}.track{height:8px;margin-top:16px;overflow:hidden;border-radius:99px;background:var(--card2)}.fill{height:100%;min-width:2px;border-radius:inherit;background:var(--accent)}.percent{font-size:36px;font-weight:900;letter-spacing:-.05em}
    .reader-head{margin-bottom:30px}.reader-head .file{color:var(--accent);font:11px var(--mono)}.reader-head h1{margin:10px 0 8px;font-size:clamp(34px,5vw,56px);line-height:1.02;letter-spacing:-.047em}.reader-head>p{max-width:740px;margin:0;color:var(--muted)}.meta{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-top:15px;color:var(--faint);font-size:10px}.reader-layout{display:grid;grid-template-columns:minmax(0,1fr) 210px;gap:42px;align-items:start}.markdown{min-width:0}.markdown>h1{display:none}.markdown h2,.markdown h3{scroll-margin-top:90px;letter-spacing:-.025em}.markdown h2{margin:42px 0 14px;padding-top:6px;font-size:25px}.markdown h3{margin:27px 0 10px;font-size:18px}.markdown p{margin:0 0 16px;color:color-mix(in srgb,var(--text) 88%,var(--muted))}.markdown a{color:var(--blue);text-underline-offset:3px}.markdown ul,.markdown ol{margin:0 0 18px;padding-left:23px}.markdown li{margin:6px 0}.markdown blockquote{margin:20px 0;padding:12px 18px;border-left:3px solid var(--accent);color:var(--muted);background:var(--soft)}.markdown code{padding:2px 5px;border:1px solid var(--border);border-radius:6px;color:var(--accent);background:var(--card2);font:.88em var(--mono)}.markdown pre{overflow:auto;margin:20px 0;padding:18px;border:1px solid var(--border);border-radius:14px;background:#080b0e}.markdown pre code{padding:0;border:0;color:#e8eeea;background:transparent}.table-wrap{overflow:auto;margin:20px 0;border:1px solid var(--border);border-radius:14px}.markdown table{width:100%;border-collapse:collapse;font-size:12px}.markdown th,.markdown td{padding:11px 13px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top}.markdown th{color:var(--muted);background:var(--card2);font-size:9px;letter-spacing:.08em;text-transform:uppercase}.markdown tr:last-child td{border:0}.markdown hr{margin:34px 0;border:0;border-top:1px solid var(--border)}.check{list-style:none;margin-left:-23px!important}.box{display:inline-grid;width:16px;height:16px;margin-right:8px;place-items:center;border:1px solid var(--border);border-radius:4px;background:var(--card2);font-size:10px;vertical-align:-2px}.box.done{color:var(--accent-ink);border-color:var(--accent);background:var(--accent)}
    .toc{position:sticky;top:94px;max-height:calc(100vh - 120px);overflow:auto;padding-left:16px;border-left:1px solid var(--border)}.toc strong{display:block;margin-bottom:8px;color:var(--faint);font-size:9px;letter-spacing:.1em;text-transform:uppercase}.toc a{display:block;padding:4px 0;color:var(--muted);font-size:10px;text-decoration:none}.toc a:hover{color:var(--text)}.search-head{margin-bottom:23px}.search-head h1{margin:7px 0;font-size:39px;letter-spacing:-.04em}.search-head p{margin:0;color:var(--muted)}.results{display:grid;gap:10px}.result{width:100%;padding:18px;color:var(--text);cursor:pointer;text-align:left}.result:hover{background:var(--card2);border-color:color-mix(in srgb,var(--accent) 35%,var(--border))}.result strong{display:block;margin-bottom:6px}.result p{margin:0;color:var(--muted);font-size:11px}.result small{display:block;margin-top:9px;color:var(--faint);font:10px var(--mono)}mark{padding:0 2px;border-radius:3px;color:var(--accent-ink);background:var(--accent)}.empty{padding:50px;color:var(--muted);text-align:center}.overlay{display:none}.toast{position:fixed;right:18px;bottom:18px;z-index:70;padding:10px 14px;border:1px solid var(--border);border-radius:10px;background:var(--card);box-shadow:var(--shadow);opacity:0;transform:translateY(8px);pointer-events:none;transition:.18s}.toast.show{opacity:1;transform:none}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
    @media(max-width:1050px){.hero{grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}.doc-grid{grid-template-columns:repeat(2,1fr)}.reader-layout{grid-template-columns:1fr}.toc{display:none}}
    @media(max-width:760px){.shell{display:block}.sidebar{position:fixed;left:0;width:min(88vw,284px);transform:translateX(-102%);transition:.2s transform;box-shadow:var(--shadow)}body.menu-open .sidebar{transform:none}.overlay{position:fixed;inset:0;z-index:25;background:rgba(0,0,0,.5)}body.menu-open .overlay{display:block}.menu{display:inline-flex}.top{padding:10px 16px}.content{padding:28px 16px 64px}.hero-main{padding:28px 22px}.hero h1{font-size:41px}.doc-grid{grid-template-columns:1fr}.progress{grid-template-columns:1fr}.action-label{display:none}}
    @media(max-width:460px){.metrics{grid-template-columns:1fr 1fr}.metric{padding:14px}.metric-value{font-size:23px}.current{max-width:145px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
  </style>
</head>
<body>
<a class="skip" href="#main">Aller au contenu</a>
<div class="shell">
  <aside class="sidebar" id="sidebar" aria-label="Documents">
    <div class="brand"><div class="logo">L</div><div><strong>Lownheur</strong><small>Human Developer</small></div></div>
    <div class="search"><label class="sr-only" for="search">Rechercher</label><input id="search" type="search" placeholder="Rechercher dans les .md"><span>Ctrl K</span></div>
    <nav id="nav"></nav>
    <div class="side-foot"><span id="doc-count"></span><br>Snapshot autonome · <span id="generated"></span></div>
  </aside>
  <button class="overlay" id="overlay" aria-label="Fermer le menu"></button>
  <main class="main" id="main">
    <header class="top">
      <div class="top-side"><button class="btn icon menu" id="menu" aria-label="Ouvrir le menu">☰</button><div class="crumb"><div class="eyebrow" id="crumb-cat">Source de vérité</div><div class="current" id="crumb-title">Vue d'ensemble</div></div></div>
      <div class="actions"><a class="btn" id="open-md" target="_blank" hidden><span class="action-label">Ouvrir le .md</span> ↗</a><button class="btn icon" id="theme" aria-label="Changer de thème">◐</button></div>
    </header>
    <div class="content">
      <section class="view" id="overview">
        <div class="hero">
          <div class="hero-main"><div class="eyebrow">Product control room</div><h1>Construire sans perdre le cap.</h1><p>La vision, l'architecture, les décisions et l'exécution de Lownheur réunies dans une interface unique.</p></div>
          <div class="gate"><div><span class="pill">● <span id="version"></span></span><h2>Prochaine porte : valider la V1</h2><p>Le développement fonctionnel reste fermé tant que le contrat de version n'est pas approuvé.</p></div><button class="btn primary" data-path="docs/versions/V1.md">Lire le contrat V1 →</button></div>
        </div>
        <div class="metrics">
          <div class="metric"><div class="metric-label">Documents suivis</div><div class="metric-value" id="m-docs"></div><div class="metric-note">Markdown embarqués</div></div>
          <div class="metric"><div class="metric-label">Tâches V1</div><div class="metric-value" id="m-tasks"></div><div class="metric-note"><span id="m-active"></span> en cours</div></div>
          <div class="metric"><div class="metric-label">Terminées</div><div class="metric-value" id="m-done"></div><div class="metric-note">sur le périmètre V1</div></div>
          <div class="metric"><div class="metric-label">Décisions</div><div class="metric-value" id="m-decisions"></div><div class="metric-note">tracées ou proposées</div></div>
        </div>
        <div class="section-head"><h2>Documents essentiels</h2><p>Les sources à lire avant toute modification.</p></div><div class="doc-grid" id="essentials"></div>
        <div class="progress"><div><h2>Progression de la V1</h2><p>Basée uniquement sur les tâches marquées TERMINÉ.</p><div class="track"><div class="fill" id="fill"></div></div></div><div class="percent" id="percent"></div></div>
      </section>
      <section class="view" id="reader" hidden>
        <div class="reader-head"><div class="file" id="reader-file"></div><h1 id="reader-title"></h1><p id="reader-desc"></p><div class="meta"><span id="reader-cat"></span><span>•</span><span id="reader-date"></span><button class="btn" id="copy">Copier le chemin</button></div></div>
        <div class="reader-layout"><article class="markdown" id="markdown"></article><aside class="toc" id="toc" aria-label="Sommaire"></aside></div>
      </section>
      <section class="view" id="search-view" hidden><div class="search-head"><div class="eyebrow">Recherche globale</div><h1 id="result-title"></h1><p id="result-subtitle"></p></div><div class="results" id="results"></div></section>
    </div>
  </main>
</div>
<div class="toast" id="toast" role="status"></div>
<script>
const docs=${docsJson},summary=${summaryJson},generatedAt="${generatedAt}";
const order=['Démarrage','Versions','Produit','Architecture','Exécution','Gouvernance','Historique','Agent','Autres'];
const essentials=['docs/versions/V1.md','docs/TASKS_V1.md','docs/architecture/V1.md','docs/product/VISION.md','docs/DECISIONS.md','docs/WORKFLOW.md'];
const state={doc:null};const el=(id)=>document.getElementById(id);
const esc=(s)=>String(s??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const slug=(s)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
function inline(s){let t=esc(s),codes=[];t=t.replace(/\x60([^\x60]+)\x60/g,(_,v)=>(codes.push('<code>'+v+'</code>'),' @@C'+(codes.length-1)+' @@'));t=t.replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_,a,h)=>'<a href="'+(/^javascript:/i.test(h)?'#':h)+'" target="_blank">'+a+'</a>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/~~([^~]+)~~/g,'<del>$1</del>');return t.replace(/@@C(\d+)@@/g,(_,i)=>codes[+i])}
function md(source){const lines=source.replace(/\r/g,'').split('\n'),out=[];let i=0,list=null,code=false,buf=[];const close=()=>{if(list)out.push('</'+list+'>');list=null};while(i<lines.length){let line=lines[i],t=line.trim();if(t.startsWith('\x60\x60\x60')){close();if(!code){code=true;buf=[]}else{out.push('<pre><code>'+esc(buf.join('\n'))+'</code></pre>');code=false}i++;continue}if(code){buf.push(line);i++;continue}if(!t){close();i++;continue}let h=t.match(/^(#{1,6})\s+(.+)$/);if(h){close();let n=h[1].length,id=slug(h[2].replace(/\*/g,''))||'s'+i;out.push('<h'+n+' id="'+id+'">'+inline(h[2])+'</h'+n+'>');i++;continue}if(t.includes('|')&&i+1<lines.length&&/^\s*\|?\s*:?-{3,}/.test(lines[i+1])){close();let rows=[t.replace(/^\||\|$/g,'').split('|').map(x=>x.trim())];i+=2;while(i<lines.length&&lines[i].trim().includes('|')){rows.push(lines[i].trim().replace(/^\||\|$/g,'').split('|').map(x=>x.trim()));i++}out.push('<div class="table-wrap"><table><thead><tr>'+rows[0].map(x=>'<th>'+inline(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.slice(1).map(r=>'<tr>'+r.map(x=>'<td>'+inline(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>');continue}let u=line.match(/^\s*[-*]\s+(.+)$/),o=line.match(/^\s*\d+\.\s+(.+)$/);if(u||o){let type=u?'ul':'ol';if(list!==type){close();list=type;out.push('<'+type+'>')}let item=(u||o)[1],check=item.match(/^\[([ xX])\]\s+(.+)$/);out.push(check?'<li class="check"><span class="box '+(check[1].toLowerCase()==='x'?'done':'')+'">'+(check[1].toLowerCase()==='x'?'✓':'')+'</span>'+inline(check[2])+'</li>':'<li>'+inline(item)+'</li>');i++;continue}close();if(/^---+$/.test(t)){out.push('<hr>');i++;continue}if(t.startsWith('>')){let q=[];while(i<lines.length&&lines[i].trim().startsWith('>'))q.push(lines[i++].trim().replace(/^>\s?/,''));out.push('<blockquote>'+inline(q.join(' '))+'</blockquote>');continue}let p=[t];i++;while(i<lines.length){let n=lines[i].trim();if(!n||/^(#{1,6})\s/.test(n)||/^\s*[-*]\s+/.test(lines[i])||/^\s*\d+\.\s+/.test(lines[i])||n.startsWith('\x60\x60\x60')||n.startsWith('>'))break;p.push(n);i++}out.push('<p>'+inline(p.join(' '))+'</p>')}close();return out.join('')}
function views(name){['overview','reader','search-view'].forEach(id=>el(id).hidden=id!==name);el('open-md').hidden=name!=='reader';scrollTo({top:0,behavior:'smooth'})}
function current(id){document.querySelectorAll('.nav-btn').forEach(b=>b.toggleAttribute('aria-current',b.dataset.id===id))}
function closeMenu(){document.body.classList.remove('menu-open')}
function overview(){state.doc=null;el('search').value='';el('crumb-cat').textContent='Source de vérité';el('crumb-title').textContent="Vue d'ensemble";current('home');views('overview');closeMenu();history.replaceState(null,'',location.pathname)}
function openDoc(doc){state.doc=doc;el('search').value='';el('crumb-cat').textContent=doc.category;el('crumb-title').textContent=doc.title;el('reader-file').textContent=doc.file;el('reader-title').textContent=doc.title;el('reader-desc').textContent=doc.description||'Document de référence du projet Lownheur.';el('reader-cat').textContent=doc.category;el('reader-date').textContent='Mis à jour le '+new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeStyle:'short'}).format(new Date(doc.updatedAt));el('markdown').innerHTML=md(doc.content);el('open-md').href=encodeURI(doc.file);let hs=[...el('markdown').querySelectorAll('h2,h3')];el('toc').innerHTML=hs.length?'<strong>Dans ce document</strong>'+hs.map(h=>'<a href="#'+h.id+'">'+esc(h.textContent)+'</a>').join(''):'';current(doc.id);views('reader');closeMenu();history.replaceState(null,'','#doc='+encodeURIComponent(doc.file))}
function nav(){let home=document.createElement('button');home.className='nav-btn';home.dataset.id='home';home.innerHTML='<span class="dot"></span><span class="nav-text">Vue d\'ensemble</span>';home.onclick=overview;el('nav').append(home);order.forEach(cat=>{let items=docs.filter(d=>d.category===cat);if(!items.length)return;let g=document.createElement('div');g.className='group';g.innerHTML='<div class="group-label">'+esc(cat)+'</div>';items.forEach(d=>{let b=document.createElement('button');b.className='nav-btn';b.dataset.id=d.id;b.innerHTML='<span class="dot"></span><span class="nav-text">'+esc(d.title)+'</span>';b.onclick=()=>openDoc(d);g.append(b)});el('nav').append(g)})}
function search(q){q=q.trim();if(!q){state.doc?openDoc(state.doc):overview();return}let low=q.toLocaleLowerCase('fr'),found=docs.filter(d=>(d.title+' '+d.file+' '+d.content).toLocaleLowerCase('fr').includes(low));el('crumb-cat').textContent='Recherche';el('crumb-title').textContent=q;el('result-title').textContent=found.length+' résultat'+(found.length>1?'s':'');el('result-subtitle').textContent='Recherche dans '+docs.length+' documents pour « '+q+' ».';el('results').innerHTML='';if(!found.length)el('results').innerHTML='<div class="empty">Aucun document ne correspond.</div>';found.forEach(d=>{let clean=d.content.replace(/[#*\x60|>-]/g,' ').replace(/\s+/g,' '),at=clean.toLocaleLowerCase('fr').indexOf(low),snippet=clean.slice(Math.max(0,at-65),Math.max(0,at-65)+210),b=document.createElement('button');b.className='result';b.innerHTML='<strong>'+esc(d.title)+'</strong><p>'+esc((at>65?'…':'')+snippet+'…')+'</p><small>'+esc(d.file)+'</small>';b.onclick=()=>openDoc(d);el('results').append(b)});current('');views('search-view')}
function toast(msg){el('toast').textContent=msg;el('toast').classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el('toast').classList.remove('show'),1600)}
function init(){nav();essentials.map(file=>docs.find(d=>d.file===file)).filter(Boolean).forEach(d=>{let b=document.createElement('button');b.className='doc-card';b.innerHTML='<small>'+esc(d.category)+'</small><strong>'+esc(d.title)+'</strong><p>'+esc(d.description||'Document de référence Lownheur.')+'</p><span class="path">'+esc(d.file)+'</span>';b.onclick=()=>openDoc(d);el('essentials').append(b)});el('doc-count').textContent=docs.length+' documents indexés';el('generated').textContent=new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(generatedAt));el('version').textContent=summary.versionStatus;el('m-docs').textContent=summary.docs;el('m-tasks').textContent=summary.tasks;el('m-active').textContent=summary.active;el('m-done').textContent=summary.done;el('m-decisions').textContent=summary.decisions;let pct=summary.tasks?Math.round(summary.done/summary.tasks*100):0;el('percent').textContent=pct+'%';el('fill').style.width=pct+'%';document.querySelectorAll('[data-path]').forEach(b=>b.onclick=()=>openDoc(docs.find(d=>d.file===b.dataset.path)));el('search').oninput=e=>search(e.target.value);el('menu').onclick=()=>document.body.classList.toggle('menu-open');el('overlay').onclick=closeMenu;el('theme').onclick=()=>{let next=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=next;localStorage.setItem('lownheur-theme',next)};document.documentElement.dataset.theme=localStorage.getItem('lownheur-theme')||'dark';el('copy').onclick=async()=>{try{await navigator.clipboard.writeText(state.doc.file);toast('Chemin copié')}catch{toast(state.doc.file)}};document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();el('search').focus()}if(e.key==='Escape'){el('search').value='';state.doc?openDoc(state.doc):overview();closeMenu()}});let file=decodeURIComponent(location.hash.replace(/^#doc=/,'')),initial=docs.find(d=>d.file===file);initial?openDoc(initial):overview()}
init();
</script>
</body>
</html>`;

const clientScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!clientScript) throw new Error('Dashboard client script missing');
new Function(clientScript);
fs.writeFileSync(output, html, 'utf8');
console.log('Generated ' + path.relative(root, output) + ' with ' + docs.length + ' Markdown documents.');

