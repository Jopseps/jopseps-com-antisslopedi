// API, escHtml, authHeaders come from auth.js (loaded first)

const ROLE_LABELS = { admin: "admin", editor: "editör", user: "okuyucu" };

function showAdminError(msg){
    document.getElementById("admin-error").textContent = msg;
}

async function adminFetch(pathName, options){
    const res = await fetch(`${API}${pathName}`, {
        ...options,
        headers: { "Content-Type": "application/json", ...authHeaders(), ...(options && options.headers) },
    });
    if(res.status === 401 || res.status === 403){
        location.href = "index.html";
        throw new Error("yetki yok");
    }
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || res.status);
    return data;
}

async function loadStats(){
    const s = await adminFetch("/api/admin/stats");
    document.getElementById("stats-line").textContent =
        `${s.characters} karakter · ${s.revisions} düzenleme · ${s.users} kullanıcı · ${s.active_sessions} aktif oturum`;
}

async function loadUsers(){
    const users = await adminFetch("/api/admin/users");
    const me = getUserInfo();
    document.getElementById("user-list").innerHTML = users.map(u => {
        const name = `<a href="kullanici.html?u=${encodeURIComponent(u.username)}"><b>${escHtml(u.username)}</b></a>`;
        let action = `<span style="opacity:0.7;">${ROLE_LABELS[u.role] || escHtml(u.role)}</span>`;
        if(u.role !== "admin"){
            const other = u.role === "editor" ? "user" : "editor";
            const label = u.role === "editor" ? "okuyucu yap" : "editör yap";
            action = `<span style="opacity:0.7;">${ROLE_LABELS[u.role]}</span>
                <button class="form-btn" type="button" onclick="setRole('${encodeURIComponent(u.username)}','${other}')">${label}</button>`;
        }else if(me && me.username === u.username){
            action = `<span style="opacity:0.7;">admin (sen)</span>`;
        }
        return `<div class="rev-row"><span class="straightText">${name} · ${escHtml((u.created_at || "").slice(0, 10))}</span>
            <div class="rev-row-actions">${action}</div></div>`;
    }).join("");
}

async function setRole(encodedUsername, role){
    showAdminError("");
    try{
        await adminFetch(`/api/admin/users/${encodedUsername}`, { method: "PUT", body: JSON.stringify({ role }) });
        loadUsers();
    }catch(e){
        showAdminError("Rol değiştirilemedi: " + e.message);
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
