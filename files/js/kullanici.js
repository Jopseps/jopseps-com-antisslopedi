// API, escHtml come from auth.js (loaded first)

const ROLE_LABELS = { admin: "admin", editor: "editör", user: "okuyucu" };

async function loadProfile(){
    const username = new URLSearchParams(location.search).get("u");
    const nameEl = document.getElementById("profile-name");
    if(!username){
        nameEl.textContent = "Kullanıcı belirtilmedi.";
        return;
    }

    let profile;
    try{
        const res = await fetch(`${API}/api/users/${encodeURIComponent(username)}`);
        if(res.status === 404){
            nameEl.textContent = "Kullanıcı bulunamadı: " + username;
            return;
        }
        if(!res.ok) throw new Error(res.status);
        profile = await res.json();
    }catch(e){
        nameEl.textContent = "Yüklenemedi.";
        return;
    }

    nameEl.textContent = profile.username;
    document.title = profile.username + " — Antısslopedi";

    const me = getUserInfo();
    if(getToken() && me && me.username.toLocaleLowerCase("tr") === profile.username.toLocaleLowerCase("tr")){
        document.getElementById("pass-slot").innerHTML = `
            <form class="pass-form" onsubmit="changePassword(); return false;">
                <input id="pass-current" class="form-input" type="password" placeholder="Mevcut şifre" autocomplete="current-password" required>
                <input id="pass-next" class="form-input" type="password" placeholder="Yeni şifre (en az 8 karakter)" autocomplete="new-password" required>
                <div class="form-error" id="pass-error"></div>
                <button class="form-btn" type="submit">Şifreyi Değiştir</button>
            </form>`;
    }
    document.getElementById("profile-meta").innerHTML =
        `${escHtml(ROLE_LABELS[profile.role] || profile.role)} · üyelik: ${escHtml((profile.created_at || "").slice(0, 10))}`
        + ` · ${profile.edits.length} düzenleme · <span class="point-badge">${profile.points || 0} puan</span>`;

    const list = document.getElementById("edit-list");
    if(!profile.edits.length){
        list.innerHTML = `<p class="straightText">Henüz düzenleme yok.</p>`;
        return;
    }
    list.innerHTML = profile.edits.map(e => {
        const name = e.char_name
            ? `<a href="wiki.html?char=${encodeURIComponent(e.char_id)}"><b>${escHtml(e.char_name)}</b></a>`
            : `<b>${escHtml(e.char_id)}</b> <span style="opacity:0.6;">(silinmiş)</span>`;
        return `<div class="rev-row"><span class="straightText">${name} · ${escHtml((e.created_at || "").slice(0, 16))}</span>
            <div class="rev-row-actions"><a href="gecmis.html?char=${encodeURIComponent(e.char_id)}">geçmiş</a></div></div>`;
    }).join("");
}

async function changePassword(){
    const errEl = document.getElementById("pass-error");
    errEl.textContent = "";
    let res, data;
    try{
        res = await fetch(`${API}/api/auth/password`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({
                current: document.getElementById("pass-current").value,
                next: document.getElementById("pass-next").value,
            }),
        });
        data = await res.json();
    }catch(e){
        errEl.textContent = "Sunucuya ulaşılamadı.";
        return;
    }
    if(!res.ok){
        errEl.textContent = data.error || "Değiştirilemedi.";
        return;
    }
    document.getElementById("pass-current").value = "";
    document.getElementById("pass-next").value = "";
    errEl.textContent = "Şifre değişti. Diğer cihazlardaki oturumlar kapatıldı.";
}

loadProfile();
