// API, escHtml come from auth.js (loaded first)

const ROLE_LABELS = { admin: "admin", editor: "editör", user: "okuyucu" };

// yönetim geçmiş sekmesiyle aynı sayfalama deseni
let profileUser = null;
let editPage = 1;
let editPer = 10;

async function loadProfile(first){
    const nameEl = document.getElementById("profile-name");
    if(first){
        profileUser = new URLSearchParams(location.search).get("u");
        if(!profileUser){
            nameEl.textContent = "Kullanıcı belirtilmedi.";
            return;
        }
    }

    let profile;
    try{
        const res = await fetch(`${API}/api/users/${encodeURIComponent(profileUser)}?page=${editPage}&per=${editPer}`);
        if(res.status === 404){
            nameEl.textContent = "Kullanıcı bulunamadı: " + profileUser;
            return;
        }
        if(!res.ok) throw new Error(res.status);
        profile = await res.json();
    }catch(e){
        if(first) nameEl.textContent = "Yüklenemedi.";
        else document.getElementById("edit-list").innerHTML = `<p class="straightText">Düzenlemeler yüklenemedi.</p>`;
        return;
    }
    editPage = profile.edits.page;

    if(first){
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
            + ` · ${profile.edits.total} düzenleme · <span class="point-badge">${profile.points || 0} puan</span>`;
    }

    renderEdits(profile.edits);
}

function renderEdits(edits){
    const list = document.getElementById("edit-list");
    if(!edits.items.length){
        list.innerHTML = `<p class="straightText">Henüz düzenleme yok.</p>`;
        renderEditPager(edits);
        return;
    }
    list.innerHTML = edits.items.map(e => {
        const encChar = encodeURIComponent(e.char_id);
        const when = escHtml((e.created_at || "").slice(0, 16));
        const what = e.deleted
            ? `<span style="opacity:0.6;">${escHtml(e.char_name)} (silinmiş)</span>`
            : `<a href="wiki.html?char=${encChar}">${escHtml(e.char_name)}</a>`;
        return `<div class="rev-row"><span class="straightText">
                <a href="gecmis.html?char=${encChar}">${when}</a> · ${what} · ${escHtml(e.summary)}
            </span>
            <div class="rev-row-actions"><span style="opacity:0.6;">#${e.id}</span></div></div>`;
    }).join("");
    renderEditPager(edits);
}

// ‹ 1 2 3 4 5 › — yönetimdeki renderHistPager'ın kopyası, dom id'leri farklı
function renderEditPager(data){
    const pager = document.getElementById("edit-pager");
    if(data.pages <= 1){
        pager.innerHTML = `<span class="straightText hist-total">${data.total} kayıt</span>`;
        return;
    }
    const WINDOW = 5;
    let start = Math.max(1, data.page - Math.floor(WINDOW / 2));
    let end = Math.min(data.pages, start + WINDOW - 1);
    start = Math.max(1, end - WINDOW + 1);

    let html = `<button class="page-btn" type="button" ${data.page <= 1 ? "disabled" : ""} onclick="gotoEditPage(${data.page - 1})">‹</button>`;
    if(start > 1) html += `<span class="page-gap">…</span>`;
    for(let i = start; i <= end; i++){
        html += `<button class="page-btn${i === data.page ? " active" : ""}" type="button" onclick="gotoEditPage(${i})">${i}</button>`;
    }
    if(end < data.pages) html += `<span class="page-gap">…</span>`;
    html += `<button class="page-btn" type="button" ${data.page >= data.pages ? "disabled" : ""} onclick="gotoEditPage(${data.page + 1})">›</button>`;
    html += `<span class="straightText hist-total">${data.total} kayıt</span>`;
    pager.innerHTML = html;
}

function gotoEditPage(n){
    editPage = n;
    loadProfile(false);
}

function changeEditPer(){
    editPer = parseInt(document.getElementById("edit-per").value, 10) || 10;
    editPage = 1;
    loadProfile(false);
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

loadProfile(true);
