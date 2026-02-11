// ✅ حط روابط الويب هوك هنا (يفضل تستخدم discord.com بدل discordapp.com)
const WEBHOOK_TOURNAMENT = "https://discordapp.com/api/webhooks/1471201409142624431/pDp-OLC_M4BfDNCfpumA42ZV8Ukl57IgiLX7K0XHPs2LLMoYRBsk3p9aobrKbA57N79T";
const WEBHOOK_TEAM       = "https://discordapp.com/api/webhooks/1471203857525899467/61XIl10-VlciJp_oye9-xAxMwK38V3_TcPZpoSJ5KY_G6QB6akQT3chUwxlCr0Iov1rF";

// تخزين محلي عشان تبقى البيانات بعد تحديث الصفحة
const LS_PLAYERS = "krc_players_v3";
const LS_MATCHES = "krc_matches_v3";
const LS_LASTID  = "krc_lastid_v3";

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
    body: JSON.stringify({ content })
  });
}

function val(id){
  return (document.getElementById(id)?.value || "").trim();
}

/* =========================
   ✅ تسجيل بطولة
========================= */
function registerTournament(){
  const name    = val("name");
  const discord = val("discord");
  const car     = val("car");
  const model   = val("model");
  const cls     = val("class");
  const hp      = Number(val("hp") || 0);
  const notes   = val("notes");

  const msg = document.getElementById("tMsg");
  if(msg) msg.hidden = true;

  if(!name || !discord || !car || !model || !cls || !hp){
    return toast(msg, "عبي البيانات الأساسية كاملة.", "warn");
  }

  lastID++;
  const player = {
    id: lastID,
    name, discord, car, model,
    class: cls,
    hp,
    notes,
    created_at: new Date().toISOString()
  };

  players.unshift(player);
  save();

  sendWebhook(
    WEBHOOK_TOURNAMENT,
    `🏁 تسجيل بطولة جديد #${player.id}\n` +
    `الاسم: ${name}\n` +
    `Discord: ${discord}\n` +
    `الفئة: ${cls}\n` +
    `السيارة: ${car} • ${model}\n` +
    `HP: ${hp}\n` +
    `ملاحظات: ${notes || "—"}`
  ).catch(()=>{});

  toast(msg, `✅ تم التسجيل! رقمك: #${player.id} — تم إرسال الطلب للإدارة.`, "ok");

  ["name","discord","car","model","class","hp","notes"].forEach(x=>{
    const e = document.getElementById(x);
    if(e) e.value = "";
  });
}

/* =========================
   ✅ تقديم تيم
========================= */
function applyTeam(){
  const name    = val("tname");
  const discord = val("tdiscord");
  const role    = val("role");
  const region  = val("region");
  const about   = val("about");

  const msg = document.getElementById("aMsg");
  if(msg) msg.hidden = true;

  if(!name || !discord || !role || !region || !about){
    return toast(msg, "عبي البيانات الأساسية كاملة.", "warn");
  }

  sendWebhook(
    WEBHOOK_TEAM,
    `📩 تقديم تيم جديد\n` +
    `الاسم: ${name}\n` +
    `Discord: ${discord}\n` +
    `الدور: ${role}\n` +
    `الدولة/التوقيت: ${region}\n` +
    `الخبرة:\n${about}`
  ).catch(()=>{});

  toast(msg, "✅ تم إرسال طلبك للإدارة.", "ok");

  ["tname","tdiscord","role","region","about"].forEach(x=>{
    const e = document.getElementById(x);
    if(e) e.value = "";
  });
}

/* =========================
   ✅ توليد مواجهات (اقتراحات)
   - نفس الفئة + أقرب HP
========================= */
function buildSuggestions(){
  const byClass = {};
  players.forEach(p => (byClass[p.class] ||= []).push(p));

  const sug = [];
  Object.keys(byClass).forEach(cls=>{
    const list = byClass[cls].slice().sort((a,b)=>a.hp - b.hp);
    for(let i=0; i<list.length-1; i+=2){
      sug.push({
        id: 90000 + sug.length + 1,
        status: "suggested",
        class: cls,
        a: list[i],
        b: list[i+1],
        created_at: new Date().toISOString()
      });
    }
  });

  return sug;
}

function generateSuggestedMatches(){
  matches = buildSuggestions();
  save();
  displayMatches(matches);
}

function displayMatches(list){
  const tbody = document.getElementById("matchesTable");
  const msg = document.getElementById("mMsg");
  if(!tbody) return;

  tbody.innerHTML = "";
  if(!list || list.length === 0){
    if(msg) toast(msg, "لا توجد مواجهات حالياً. سجّل لاعبين أكثر.", "warn");
    return;
  }
  if(msg) msg.hidden = true;

  list.forEach((m, idx)=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>#${idx+1}</td>
      <td>#${m.id}</td>
      <td>
        ${m.a.name} <span style="color:var(--muted)">(#${m.a.id})</span><br>
        <span style="color:var(--muted)">${m.a.car} • ${m.a.model} • ${m.a.hp}HP</span>
      </td>
      <td>
        ${m.b.name} <span style="color:var(--muted)">(#${m.b.id})</span><br>
        <span style="color:var(--muted)">${m.b.car} • ${m.b.model} • ${m.b.hp}HP</span>
      </td>
      <td>${m.class}</td>
      <td><span class="badge">${m.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// نخلي الدوال متاحة للأزرار بالصفحات
window._krc = {
  registerTournament,
  applyTeam,
  generateSuggestedMatches
};
