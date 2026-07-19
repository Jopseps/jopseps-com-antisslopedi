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
    document.title = profile.username + " — Antisslopedi";
    document.getElementById("profile-meta").textContent =
        `${ROLE_LABELS[profile.role] || profile.role} · üyelik: ${(profile.created_at || "").slice(0, 10)} · ${profile.edits.length} düzenleme`;

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

loadProfile();
