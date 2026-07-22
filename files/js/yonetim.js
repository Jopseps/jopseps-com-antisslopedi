// API, escHtml, authHeaders, getUserInfo come from auth.js (loaded first)

const ROLE_LABELS = { admin: "admin", editor: "editör", user: "okuyucu" };

function showAdminError(msg){
    document.getElementById("admin-error").textContent = msg;
}

function showTab(name){
    ["stats", "users", "featured", "order", "history", "archive", "settings"].forEach(t => {
        document.getElementById("tab-" + t).style.display = t === name ? "block" : "none";
        document.getElementById("tabbtn-" + t).classList.toggle("active", t === name);
    });
}

async function adminFetch(pathName, options){
    const res = await fetch(`${API}${pathName}`, {
        ...options,
        headers: { "Content-Type": "application/json", ...authHeaders(), ...(options && options.headers) },
    });
    if(res.status === 401 || res.status === 403){
        const data = await res.json().catch(() => ({}));
        if(data.error === "giriş gerekli" || data.error === "sadece admin"){
            location.href = "index.html";
        }
        throw new Error(data.error || res.status);
    }
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || res.status);
    return data;
}

async function loadStats(){
    const s = await adminFetch("/api/admin/stats");
    const cards = [
        [s.characters, "karakter"],
        [s.revisions, "düzenleme"],
        [s.users, "kullanıcı"],
        [s.active_sessions, "aktif oturum"],
    ];
    document.getElementById("stat-cards").innerHTML = cards.map(([n, label]) =>
        `<div class="stat-card"><div class="stat-num">${n}</div><div class="stat-label">${label}</div></div>`
    ).join("");
}

let adminUsers = [];      // geçmiş filtresi datalist'i de bunu kullanıyor

async function loadUsers(){
    const users = await adminFetch("/api/admin/users");
    adminUsers = users;
    const me = getUserInfo();
    document.getElementById("user-list").innerHTML = users.map(u => {
        const enc = encodeURIComponent(u.username);
        const name = `<a href="kullanici.html?u=${enc}"><b>${escHtml(u.username)}</b></a>`;
        const badges = `<span class="role-badge ${u.role}">${ROLE_LABELS[u.role] || escHtml(u.role)}</span>`
            + ` <span class="point-badge">${u.points || 0} puan</span>`
            + (u.disabled ? ` <span class="role-badge banned">dondurulmuş</span>` : "");

        let actions = "";
        if(u.role === "admin"){
            actions = me && me.username === u.username ? `<span style="opacity:0.6;">(sen)</span>` : "";
        }else{
            const other = u.role === "editor" ? "user" : "editor";
            const roleLabel = u.role === "editor" ? "okuyucu yap" : "editör yap";
            actions = `
                <button class="form-btn" type="button" onclick="setUser('${enc}',{role:'${other}'})">${roleLabel}</button>
                <button class="form-btn" type="button" onclick="setUser('${enc}',{disabled:${u.disabled ? "false" : "true"}})">${u.disabled ? "dondurmayı kaldır" : "dondur"}</button>
                <button class="form-btn" type="button" onclick="setUser('${enc}',{force_logout:true})">oturumları kapat</button>
                <button class="form-btn" type="button" onclick="editPoints('${enc}',${u.points || 0})">puan</button>
                <button class="form-btn" type="button" onclick="resetPassword('${enc}')">şifre sıfırla</button>
                <button class="form-btn danger" type="button" onclick="deleteUser('${enc}')">sil</button>`;
        }

        return `<div class="rev-row"><span class="straightText">${name} ${badges} · ${escHtml((u.created_at || "").slice(0, 10))}</span>
            <div class="rev-row-actions">${actions}</div></div>`;
    }).join("");
}

// --- geçmiş sekmesi ---

let histPage = 1;
let histPer = 10;
let histUser = "";
let histChar = "";

function histQuery(){
    const q = new URLSearchParams({ page: histPage, per: histPer });
    if(histUser) q.set("user", histUser);
    if(histChar) q.set("char", histChar);
    return q.toString();
}

async function loadHistory(){
    const box = document.getElementById("hist-list");
    let data;
    try{
        data = await adminFetch("/api/admin/revisions?" + histQuery());
    }catch(e){
        box.innerHTML = `<p class="straightText">Geçmiş yüklenemedi: ${escHtml(e.message)}</p>`;
        return;
    }
    histPage = data.page;
    if(!data.items.length){
        box.innerHTML = `<p class="straightText">Kayıt yok.</p>`;
        renderHistPager(data);
        return;
    }
    box.innerHTML = data.items.map(r => {
        const encChar = encodeURIComponent(r.char_id);
        const encUser = encodeURIComponent(r.username || "");
        const when = escHtml((r.created_at || "").slice(0, 16));
        const who = r.username
            ? `<a href="kullanici.html?u=${encUser}">${escHtml(r.username)}</a>`
            : `<span style="opacity:0.6;">?</span>`;
        const what = r.deleted
            ? `<span style="opacity:0.6;">${escHtml(r.char_name)} (silinmiş)</span>`
            : `<a href="wiki.html?char=${encChar}">${escHtml(r.char_name)}</a>`;
        return `<div class="rev-row"><span class="straightText">
                <a href="gecmis.html?char=${encChar}">${when}</a> · ${who} · ${what} · ${escHtml(r.summary)}
            </span>
            <div class="rev-row-actions"><span style="opacity:0.6;">#${r.id}</span></div></div>`;
    }).join("");
    renderHistPager(data);
}

// ‹ 1 2 3 4 5 › — en fazla 5 numara, mevcut sayfa ortada kalacak şekilde kayar
function renderHistPager(data){
    const pager = document.getElementById("hist-pager");
    if(data.pages <= 1){
        pager.innerHTML = `<span class="straightText hist-total">${data.total} kayıt</span>`;
        return;
    }
    const WINDOW = 5;
    let start = Math.max(1, data.page - Math.floor(WINDOW / 2));
    let end = Math.min(data.pages, start + WINDOW - 1);
    start = Math.max(1, end - WINDOW + 1);

    let html = `<button class="page-btn" type="button" ${data.page <= 1 ? "disabled" : ""} onclick="gotoHistPage(${data.page - 1})">‹</button>`;
    if(start > 1) html += `<span class="page-gap">…</span>`;
    for(let i = start; i <= end; i++){
        html += `<button class="page-btn${i === data.page ? " active" : ""}" type="button" onclick="gotoHistPage(${i})">${i}</button>`;
    }
    if(end < data.pages) html += `<span class="page-gap">…</span>`;
    html += `<button class="page-btn" type="button" ${data.page >= data.pages ? "disabled" : ""} onclick="gotoHistPage(${data.page + 1})">›</button>`;
    html += `<span class="straightText hist-total">${data.total} kayıt</span>`;
    pager.innerHTML = html;
}

function gotoHistPage(n){
    histPage = n;
    loadHistory();
}

function changeHistPer(){
    histPer = parseInt(document.getElementById("hist-per").value, 10) || 10;
    histPage = 1;
    loadHistory();
}

function applyHistFilter(){
    histUser = document.getElementById("hist-user").value.trim();
    histChar = document.getElementById("hist-char").value.trim();
    histPage = 1;
    loadHistory();
}

// filtre datalist'leri zaten yüklenmiş kullanıcı/karakter listelerinden beslenir
function fillHistOptions(){
    document.getElementById("hist-user-options").innerHTML =
        adminUsers.map(u => `<option value="${escHtml(u.username)}"></option>`).join("");
    document.getElementById("hist-char-options").innerHTML =
        allChars.map(c => `<option value="${escHtml(c.id)}">${escHtml(c.name)}</option>`).join("");
}

function clearHistFilter(){
    document.getElementById("hist-user").value = "";
    document.getElementById("hist-char").value = "";
    applyHistFilter();
}

async function setUser(encodedUsername, payload){
    showAdminError("");
    try{
        await adminFetch(`/api/admin/users/${encodedUsername}`, { method: "PUT", body: JSON.stringify(payload) });
        loadUsers();
        loadStats();
    }catch(e){
        showAdminError("İşlem başarısız: " + e.message);
    }
}

// Mutlak sayı ("120") ya da göreli ("+10" / "-5") kabul eder.
function editPoints(encodedUsername, current){
    const username = decodeURIComponent(encodedUsername);
    const raw = prompt(`${username} — puan (şu an ${current}).\nDüz sayı yazarsan o değere ayarlanır, +10 / -5 yazarsan eklenir/çıkarılır:`, String(current));
    if(raw === null) return;
    const v = raw.trim();
    if(!/^[+-]?\d+$/.test(v)){
        showAdminError("Puan sayı olmalı (ör. 120, +10, -5).");
        return;
    }
    const reason = prompt("Sebep (deftere yazılır, boş bırakılabilir):", "") || "";
    const relative = v[0] === "+" || v[0] === "-";
    const payload = relative ? { points_delta: parseInt(v, 10) } : { points: parseInt(v, 10) };
    if(reason.trim()) payload.points_reason = reason.trim();
    setUser(encodedUsername, payload);
}

function resetPassword(encodedUsername){
    const pass = prompt(`${decodeURIComponent(encodedUsername)} için yeni geçici şifre (en az 8 karakter):`);
    if(pass === null) return;
    if(pass.length < 8){
        showAdminError("Şifre en az 8 karakter olmalı.");
        return;
    }
    setUser(encodedUsername, { password: pass });
}

async function deleteUser(encodedUsername){
    const username = decodeURIComponent(encodedUsername);
    if(!confirm(`"${username}" hesabı kalıcı olarak silinsin mi? (Düzenleme geçmişindeki imzaları durur.)`)) return;
    showAdminError("");
    try{
        await adminFetch(`/api/admin/users/${encodedUsername}`, { method: "DELETE" });
        loadUsers();
        loadStats();
    }catch(e){
        showAdminError("Silinemedi: " + e.message);
    }
}

async function loadInvite(){
    const c = await adminFetch("/api/admin/config");
    const input = document.getElementById("invite-input");
    input.value = c.invite_code || "";
    input.placeholder = "davet kodu";
    const sort = document.getElementById("sort-input");
    if(sort) sort.value = c.char_sort === "alfabetik" ? "alfabetik" : "ozel";
}

async function saveInvite(){
    showAdminError("");
    try{
        await adminFetch("/api/admin/config", {
            method: "PUT",
            body: JSON.stringify({ invite_code: document.getElementById("invite-input").value.trim() }),
        });
        showAdminError("Davet kodu güncellendi.");
    }catch(e){
        showAdminError("Kaydedilemedi: " + e.message);
    }
}

async function saveCharSort(){
    showAdminError("");
    try{
        await adminFetch("/api/admin/config", {
            method: "PUT",
            body: JSON.stringify({ char_sort: document.getElementById("sort-input").value }),
        });
        showAdminError("Varsayılan sıralama güncellendi.");
    }catch(e){
        showAdminError("Kaydedilemedi: " + e.message);
    }
}

// --- öne çıkanlar sıralaması ---

let allChars = [];        // tüm karakterler (dropdown için)
let featuredIds = [];     // sıralı id listesi — kaydedilene kadar sadece burada
let dragId = null;

async function loadFeatured(){
    const res = await fetch(`${API}/api/characters`);
    if(!res.ok) throw new Error(res.status);
    allChars = await res.json();
    const coll = new Intl.Collator("tr");
    featuredIds = allChars
        .filter(c => c.featured)
        .sort((a, b) => {
            const ao = a.featured_order || Infinity, bo = b.featured_order || Infinity;
            if(ao !== bo) return ao - bo;
            return coll.compare(a.name, b.name);
        })
        .map(c => c.id);
    renderFeatured();
}

function charName(id){
    const c = allChars.find(x => x.id === id);
    return c ? c.name : id;
}

function renderFeatured(){
    const list = document.getElementById("featured-list");
    if(!featuredIds.length){
        list.innerHTML = `<p class="straightText" style="opacity:0.7;">Öne çıkan karakter yok — ana sayfa tüm karakterleri gösterir.</p>`;
    }else{
        list.innerHTML = featuredIds.map((id, i) =>
            `<div class="rev-row featured-row" draggable="true" data-id="${escHtml(id)}">
                <span class="straightText"><span class="drag-handle">≡</span> ${i + 1}. <b>${escHtml(charName(id))}</b> <span style="opacity:0.6;">(${escHtml(id)})</span></span>
                <div class="rev-row-actions">
                    <button class="form-btn" type="button" onclick="moveFeatured('${encodeURIComponent(id)}', -1)">↑</button>
                    <button class="form-btn" type="button" onclick="moveFeatured('${encodeURIComponent(id)}', 1)">↓</button>
                    <button class="form-btn danger" type="button" onclick="removeFeatured('${encodeURIComponent(id)}')">×</button>
                </div>
            </div>`
        ).join("");
        [...list.querySelectorAll(".featured-row")].forEach(row => {
            row.ondragstart = () => { dragId = row.dataset.id; row.classList.add("dragging"); };
            row.ondragend = () => { dragId = null; row.classList.remove("dragging"); };
            row.ondragover = e => { e.preventDefault(); };
            row.ondrop = e => {
                e.preventDefault();
                const target = row.dataset.id;
                if(!dragId || dragId === target) return;
                featuredIds.splice(featuredIds.indexOf(dragId), 1);
                featuredIds.splice(featuredIds.indexOf(target), 0, dragId);
                renderFeatured();
            };
        });
    }

    const select = document.getElementById("featured-add");
    const coll = new Intl.Collator("tr");
    const rest = allChars.filter(c => !featuredIds.includes(c.id)).sort((a, b) => coll.compare(a.name, b.name));
    select.innerHTML = rest.length
        ? rest.map(c => `<option value="${escHtml(c.id)}">${escHtml(c.name)}</option>`).join("")
        : `<option value="">— öne çıkmayan karakter kalmadı —</option>`;
}

function moveFeatured(encodedId, delta){
    const id = decodeURIComponent(encodedId);
    const i = featuredIds.indexOf(id);
    const j = i + delta;
    if(i < 0 || j < 0 || j >= featuredIds.length) return;
    featuredIds[i] = featuredIds[j];
    featuredIds[j] = id;
    renderFeatured();
}

function removeFeatured(encodedId){
    featuredIds = featuredIds.filter(x => x !== decodeURIComponent(encodedId));
    renderFeatured();
}

function addFeatured(){
    const id = document.getElementById("featured-add").value;
    if(!id || featuredIds.includes(id)) return;
    featuredIds.push(id);
    renderFeatured();
}

async function saveFeatured(){
    showAdminError("");
    const note = document.getElementById("featured-note");
    note.textContent = "kaydediliyor...";
    try{
        await adminFetch("/api/admin/featured", { method: "PUT", body: JSON.stringify({ ids: featuredIds }) });
        note.textContent = "kaydedildi ✓";
        await loadFeatured();
    }catch(e){
        note.textContent = "";
        showAdminError("Sıra kaydedilemedi: " + e.message);
    }
}

// ── Özel sıra sekmesi (öne çıkanlarla aynı desen, custom_order üzerinden) ──
let customIds = [];       // sıralı id listesi — kaydedilene kadar sadece burada
let dragOrderId = null;

async function loadCustomOrder(){
    const res = await fetch(`${API}/api/characters`);
    if(!res.ok) throw new Error(res.status);
    allChars = await res.json();
    const coll = new Intl.Collator("tr");
    customIds = allChars
        .filter(c => c.custom_order)
        .sort((a, b) => {
            const ao = a.custom_order || Infinity, bo = b.custom_order || Infinity;
            if(ao !== bo) return ao - bo;
            return coll.compare(a.name, b.name);
        })
        .map(c => c.id);
    renderCustomOrder();
}

function renderCustomOrder(){
    const list = document.getElementById("order-list");
    if(!customIds.length){
        list.innerHTML = `<p class="straightText" style="opacity:0.7;">Özel sıraya alınmış karakter yok — karakterler sayfası oluşturulma sırasını (eskiden yeniye) kullanır.</p>`;
    }else{
        list.innerHTML = customIds.map((id, i) =>
            `<div class="rev-row featured-row" draggable="true" data-id="${escHtml(id)}">
                <span class="straightText"><span class="drag-handle">≡</span> ${i + 1}. <b>${escHtml(charName(id))}</b> <span style="opacity:0.6;">(${escHtml(id)})</span></span>
                <div class="rev-row-actions">
                    <button class="form-btn" type="button" onclick="moveOrder('${encodeURIComponent(id)}', -1)">↑</button>
                    <button class="form-btn" type="button" onclick="moveOrder('${encodeURIComponent(id)}', 1)">↓</button>
                    <button class="form-btn danger" type="button" onclick="removeOrder('${encodeURIComponent(id)}')">×</button>
                </div>
            </div>`
        ).join("");
        [...list.querySelectorAll(".featured-row")].forEach(row => {
            row.ondragstart = () => { dragOrderId = row.dataset.id; row.classList.add("dragging"); };
            row.ondragend = () => { dragOrderId = null; row.classList.remove("dragging"); };
            row.ondragover = e => { e.preventDefault(); };
            row.ondrop = e => {
                e.preventDefault();
                const target = row.dataset.id;
                if(!dragOrderId || dragOrderId === target) return;
                customIds.splice(customIds.indexOf(dragOrderId), 1);
                customIds.splice(customIds.indexOf(target), 0, dragOrderId);
                renderCustomOrder();
            };
        });
    }

    const select = document.getElementById("order-add");
    const coll = new Intl.Collator("tr");
    const rest = allChars.filter(c => !customIds.includes(c.id)).sort((a, b) => coll.compare(a.name, b.name));
    select.innerHTML = rest.length
        ? rest.map(c => `<option value="${escHtml(c.id)}">${escHtml(c.name)}</option>`).join("")
        : `<option value="">— sıraya eklenmemiş karakter kalmadı —</option>`;
}

function moveOrder(encodedId, delta){
    const id = decodeURIComponent(encodedId);
    const i = customIds.indexOf(id);
    const j = i + delta;
    if(i < 0 || j < 0 || j >= customIds.length) return;
    customIds[i] = customIds[j];
    customIds[j] = id;
    renderCustomOrder();
}

function removeOrder(encodedId){
    customIds = customIds.filter(x => x !== decodeURIComponent(encodedId));
    renderCustomOrder();
}

function addOrder(){
    const id = document.getElementById("order-add").value;
    if(!id || customIds.includes(id)) return;
    customIds.push(id);
    renderCustomOrder();
}

async function saveOrder(){
    showAdminError("");
    const note = document.getElementById("order-note");
    note.textContent = "kaydediliyor...";
    try{
        await adminFetch("/api/admin/custom-order", { method: "PUT", body: JSON.stringify({ ids: customIds }) });
        note.textContent = "kaydedildi ✓";
        await loadCustomOrder();
    }catch(e){
        note.textContent = "";
        showAdminError("Sıra kaydedilemedi: " + e.message);
    }
}

async function loadDeleted(){
    const rows = await adminFetch("/api/admin/deleted");
    const list = document.getElementById("deleted-list");
    if(!rows.length){
        list.innerHTML = `<p class="straightText" style="opacity:0.7;">Silinen karakter yok.</p>`;
        return;
    }
    list.innerHTML = rows.map(r =>
        `<div class="rev-row"><span class="straightText"><b>${escHtml(r.name)}</b> (${escHtml(r.char_id)}) · son: ${escHtml(r.last_editor || "?")} · ${escHtml((r.last_edit_at || "").slice(0, 16))}</span>
            <div class="rev-row-actions">
                <a href="gecmis.html?char=${encodeURIComponent(r.char_id)}">geçmiş</a>
                <button class="form-btn" type="button" onclick="restoreChar('${encodeURIComponent(r.char_id)}')">geri yükle</button>
            </div></div>`
    ).join("");
}

async function restoreChar(encodedId){
    showAdminError("");
    try{
        const data = await adminFetch(`/api/admin/restore/${encodedId}`, { method: "POST" });
        location.href = `wiki.html?char=${encodeURIComponent(data.id)}`;
    }catch(e){
        showAdminError("Geri yüklenemedi: " + e.message);
    }
}

async function initAdmin(){
    const me = getUserInfo();
    if(!getToken() || !me || me.role !== "admin"){
        location.href = "index.html";
        return;
    }
    try{
        await Promise.all([loadStats(), loadUsers(), loadInvite(), loadDeleted(), loadFeatured(), loadCustomOrder(), loadHistory()]);
        fillHistOptions();
    }catch(e){
        showAdminError("Panel yüklenemedi: " + e.message);
    }
}

initAdmin();
