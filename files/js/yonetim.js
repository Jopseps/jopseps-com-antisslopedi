// API, escHtml, authHeaders, getUserInfo come from auth.js (loaded first)

const ROLE_LABELS = { admin: "admin", editor: "editör", user: "okuyucu" };

function showAdminError(msg){
    document.getElementById("admin-error").textContent = msg;
}

function showTab(name){
    ["stats", "users", "archive", "settings"].forEach(t => {
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

async function loadUsers(){
    const users = await adminFetch("/api/admin/users");
    const me = getUserInfo();
    document.getElementById("user-list").innerHTML = users.map(u => {
        const enc = encodeURIComponent(u.username);
        const name = `<a href="kullanici.html?u=${enc}"><b>${escHtml(u.username)}</b></a>`;
        const badges = `<span class="role-badge ${u.role}">${ROLE_LABELS[u.role] || escHtml(u.role)}</span>`
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
                <button class="form-btn" type="button" onclick="resetPassword('${enc}')">şifre sıfırla</button>
                <button class="form-btn danger" type="button" onclick="deleteUser('${enc}')">sil</button>`;
        }

        return `<div class="rev-row"><span class="straightText">${name} ${badges} · ${escHtml((u.created_at || "").slice(0, 10))}</span>
            <div class="rev-row-actions">${actions}</div></div>`;
    }).join("");
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
        await Promise.all([loadStats(), loadUsers(), loadInvite(), loadDeleted()]);
    }catch(e){
        showAdminError("Panel yüklenemedi: " + e.message);
    }
}

initAdmin();
