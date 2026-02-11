// ⚠️ مهم: حط روابط الويب هوك هنا
const WEBHOOK_TOURNAMENT = "PUT_YOUR_TOURNAMENT_WEBHOOK_HERE";
const WEBHOOK_TEAM       = "PUT_YOUR_TEAM_WEBHOOK_HERE";

// تخزين محلي عشان تبقى البيانات حتى بعد تحديث الصفحة
const LS_PLAYERS = "krc_players_v2";
const LS_MATCHES = "krc_matches_v2";
const LS_LASTID  = "krc_lastid_v2";

let players = JSON.parse(localStorage.getItem(LS_PLAYERS) || "[]");
let matches = JSON.parse(localStorage.getItem(LS_MATCHES) || "[]");
let lastID  = Number(localStorage.getItem(LS_LASTID) || "1000");

function save(){
  localStorage.setItem(LS_PLAYERS, JSON.stringify(players));
  localStorage.setItem(LS_MATCHES, JSON.stringify(matches));
  localStorage.setItem(LS_LASTID, String(lastID));
}

function toast(el, msg, type){
  if(!el) return;
  el.className = "notice " + (type || "");
  el.textContent = msg;
  el.hidden = false;
}

function sendWebhook(url, content){
  if(!url || url.includes("PUT_YOUR")){
    throw new Error("حط رابط الويب هوك داخل script.js");
  }
  return fetch(url, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({content})
  });
}

function val(id){ return (document.getElementById(id)?.value || "").trim(); }

function registerTournament(){
  const name = val("name");
  const discord = val("discord");
  const car = val("car");
  const model = val("model");
  const cls = val("class");
  const hp = Number(val("hp") || 0);
  const notes = val("notes");

  const msg = document.getElementById("tMsg");
  if(msg) msg.hidden = true;

  if(!name || !discord || !car || !model || !cls || !hp){
    return toast(msg, "عبي البيانات الأساسية كاملة.", "warn");
  }

  lastID++;
  const player = {id:lastID, name, discord, car, model, class:cls, hp, notes, created_at: new Date().toISOString()};
  players.unshift(player);
  save();

  sendWebhook(WEBHOOK_TOURNAMENT,
    `🏁 تسجيل بطولة جديد #${player.id}\nالاسم: ${name}\nDiscord: ${discord}\nالفئة: ${cls}\nالسيارة: ${car} • ${model}\nHP: ${hp}\nملاحظات: ${notes || "—"}`)
    .catch(()=>{});

  toast(msg, `✅ تم التسجيل! رقمك: #${player.id} — تم إرسال الطلب للإدارة.`, "ok");
  ["name","discord","car","model","class","hp","notes"].forEach(x=>{ const e=document.getElementById(x); if(e) e.value=""; });
}

function applyTeam(){
  const name = val("tname");
  const discord = val("tdiscord");
  const role = val("role");
  const region = val("region");
  const about = val("about");

  const msg = document.getElementById("aMsg");
  if(msg) msg.hidden = true;

  if(!name || !discord || !role || !region || !about){
    return toast(msg, "عبي البيانات الأساسية كاملة.", "warn");
  }

  sendWebhook(WEBHOOK_TEAM,
    `📩 تقديم تيم جديد\nالاسم: ${name}\nDiscord: ${discord}\nالدور: ${role}\nالدولة/التوقيت: ${region}\nالخبرة:\n${about}`)
    .catch(()=>{});

  toast(msg, "✅ تم إرسال طلبك للإدارة.", "ok");
  ["tname","tdiscord","role","region","about"].forEach(x=>{ const e=document.getElementById(x); if(e) e.value=""; });
}

// اقتراح مباريات حسب نفس الفئة وأقرب HP
function buildSuggestions(){
  const byClass = {};
  players.forEach(p=>{ (byClass[p.class] ||= []).push(p); });

  const sug = [];
  Object.keys(byClass).forEach(cls=>{
    const list = byClass[cls].slice().sort((a,b)=>a.hp-b.hp);
    for(let i=0;i<list.length-1;i+=2){
      sug.push({
        id: 90000 + sug.length + 1,
        status: "suggested",
        class: cls,
        a: list[i],
        b: list[i+1]
      });
    }
  });
  return sug;
}

function generateSuggestedMatches(){
  matches = buildSuggestions();
  save();
  displayMatches(matches, "suggested");
}

function approveMatch(id){
  const m = matches.find(x=>x.id===id);
  if(!m) return;
  m.status = "approved";
  m.approved_at = new Date().toISOString();
  save();
  displayMatches(matches, "admin");
}

function displayMatches(list, mode){
  const tbody = document.getElementById("matchesTable");
  const msg = document.getElementById("mMsg") || document.getElementById("adMsg");
  if(!tbody) return;

  tbody.innerHTML = "";
  if(!list || list.length===0){
    if(msg) toast(msg, "لا توجد مواجهات حالياً.", "warn");
    return;
  }
  if(msg) msg.hidden = true;

  list.forEach((m, idx)=>{
    const tr = document.createElement("tr");
    const action = (mode==="admin" && m.status!=="approved")
      ? `<button class="btn small primary" onclick="approveMatch(${m.id})">اعتماد</button>`
      : `<span class="badge">${m.status}</span>`;
    tr.innerHTML = `
      <td>#${idx+1}</td>
      <td>#${m.id}</td>
      <td>${m.a.name} <span style="color:var(--muted)">(#${m.a.id})</span><br><span style="color:var(--muted)">${m.a.car} • ${m.a.model} • ${m.a.hp}HP</span></td>
      <td>${m.b.name} <span style="color:var(--muted)">(#${m.b.id})</span><br><span style="color:var(--muted)">${m.b.car} • ${m.b.model} • ${m.b.hp}HP</span></td>
      <td>${m.class}</td>
      <td>${action}</td>
    `;
    tbody.appendChild(tr);
  });
}

function loadApprovedOnly(){
  const approved = matches.filter(m=>m.status==="approved");
  displayMatches(approved, "approved");
}

function loadAllMatchesAdmin(){
  displayMatches(matches, "admin");
}

function loadPlayersAdmin(){
  const tbody = document.getElementById("playersTable");
  const msg = document.getElementById("adMsg");
  if(!tbody) return;
  tbody.innerHTML = "";
  if(players.length===0){
    if(msg) toast(msg, "لا يوجد مسجلين حالياً.", "warn");
    return;
  }
  if(msg) msg.hidden = true;

  players.forEach(p=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>#${p.id}</td>
      <td>${p.name}</td>
      <td>${p.discord}</td>
      <td>${p.class}</td>
      <td>${p.car} • ${p.model}</td>
      <td>${p.hp}</td>
    `;
    tbody.appendChild(tr);
  });
}

function createManualMatch(){
  const a = Number(val("aId")||0);
  const b = Number(val("bId")||0);
  const msg = document.getElementById("adMsg");
  if(msg) msg.hidden = true;

  const pa = players.find(x=>x.id===a);
  const pb = players.find(x=>x.id===b);
  if(!pa || !pb || a===b){
    return toast(msg, "IDs غير صحيحة.", "bad");
  }

  const newId = (matches[0]?.id || 2000) + 1;
  matches.unshift({
    id: newId,
    status: "approved",
    class: pa.class || pb.class || "Unknown",
    a: pa,
    b: pb,
    created_at: new Date().toISOString()
  });
  save();
  toast(msg, `✅ تم إنشاء + اعتماد مواجهة #${newId}`, "ok");
  loadAllMatchesAdmin();
}

window._krc = { registerTournament, applyTeam, generateSuggestedMatches, loadApprovedOnly, loadAllMatchesAdmin, loadPlayersAdmin, createManualMatch, approveMatch };
