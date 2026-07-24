// API, escHtml, initials come from auth.js (loaded first)

async function loadCharacter(){
    const id = new URLSearchParams(location.search).get("char");
    if(!id){
        showError("Karakter belirtilmedi.");
        return;
    }

    let char, charMap = new Map();
    try{
        // tek karakter + isim haritası paralel; harita [[id]] linklerini çözer.
        // Harita çekimi hata verse de sayfa render olmalı → link olmadan.
        const [res, listRes] = await Promise.all([
            fetch(`${API}/api/characters/${encodeURIComponent(id)}`),
            fetch(`${API}/api/characters`).catch(() => null),
        ]);
        if(res.status === 404){
            showError("Karakter bulunamadı: " + id);
            return;
        }
        if(!res.ok) throw new Error(res.status);
        char = await res.json();
        if(listRes && listRes.ok){
            try{
                (await listRes.json()).forEach(c => charMap.set(c.id, c.name));
            }catch(e){}
        }
    }catch(e){
        showError("Yüklenemedi. Tekrar dene.");
        return;
    }

    renderArticle(char, charMap);
    renderInfobox(char);
    renderActions(id);
    buildTOC();
}

function renderActions(id){
    const el = document.getElementById("wiki-actions");
    if(!el) return;
    let html = `<a href="#" onclick="goBack();return false;">← Geri</a>`;
    if(canEditRole()){
        html += `<a href="duzenle.html?char=${encodeURIComponent(id)}">Düzenle</a>`;
    }
    html += `<a href="gecmis.html?char=${encodeURIComponent(id)}">Geçmiş</a>`;
    el.innerHTML = html;
}

// history.back() only when we came from within the site; direct/shared links go home
function goBack(){
    let sameSite = false;
    try{
        sameSite = !!document.referrer && new URL(document.referrer).origin === location.origin;
    }catch(e){}
    if(sameSite && history.length > 1){
        history.back();
    }else{
        location.href = "index.html";
    }
}

// [[id]] veya [[id|görünen ad]] → wiki linki. Wikipedia gibi: her id sadece ilk
// geçtiğinde linklenir (paylaşılan `seen`), sonrakiler düz metin. Bilinmeyen id
// (sayfası yok) da düz metin. Ham metin parçalanır, her parça ayrı escHtml'lenir.
function linkify(text, charMap, seen){
    if(!text) return "";
    const re = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;
    let out = "", last = 0, m;
    while((m = re.exec(text))){
        out += escHtml(text.slice(last, m.index));
        const id = m[1].trim();
        const exists = charMap.has(id);
        const disp = (m[2] != null ? m[2] : (exists ? charMap.get(id) : id)).trim();
        if(exists && !seen.has(id)){
            seen.add(id);
            out += `<a href="wiki.html?char=${encodeURIComponent(id)}">${escHtml(disp)}</a>`;
        }else{
            out += escHtml(disp);
        }
        last = m.index + m[0].length;
    }
    out += escHtml(text.slice(last));
    return out;
}

function renderArticle(char, charMap){
    document.getElementById("wiki-title").textContent = char.name;
    document.getElementById("wiki-summary").textContent = char.summary || "";
    document.title = char.name + " — Antisslopedi";

    let html = "";
    const seen = new Set();   // makale genelinde ilk-geçiş linklemesi (Genel + Hikaye)

    html += `<section class="wiki-section"><h2>Genel</h2><p>${linkify(char.description, charMap, seen)}</p></section>`;

    if(char.story){
        html += `<section class="wiki-section"><h2>Hikaye</h2><p>${linkify(char.story, charMap, seen)}</p></section>`;
    }

    if(char.features && char.features.length){
        html += `<section class="wiki-section"><h2>Özellikler</h2><ul>`;
        char.features.forEach(a => { html += `<li>${escHtml(a)}</li>`; });
        html += `</ul></section>`;
    }

    if(char.variants && char.variants.length){
        html += `<section class="wiki-section"><h2>Varyasyonlar</h2><ul>`;
        char.variants.forEach(v => {
            // eski kayıtlar düz string olabilir; yeni şekil {variant_id, variant_name}
            const name = (typeof v === "string") ? v : (v.variant_name || "");
            const vid = (typeof v === "string") ? null : v.variant_id;
            if(vid){
                html += `<li><a href="wiki.html?char=${encodeURIComponent(vid)}">${escHtml(name)}</a></li>`;
            }else{
                html += `<li>${escHtml(name)}</li>`;
            }
        });
        html += `</ul></section>`;
    }

    if(char.relations && char.relations.length){
        html += `<section class="wiki-section"><h2>İlişkiler</h2><ul>`;
        char.relations.forEach(r => {
            if(r.related_id){
                html += `<li>${escHtml(r.label)}: <a href="wiki.html?char=${encodeURIComponent(r.related_id)}">${escHtml(r.related_name || r.related_id)}</a></li>`;
            }else{
                html += `<li>${escHtml(r.label)}</li>`;
            }
        });
        html += `</ul></section>`;
    }

    if(char.categories && char.categories.length){
        html += `<section class="wiki-section"><h2>Kategoriler</h2><div class="wiki-categories">`;
        char.categories.forEach(c => { html += `<span class="wiki-badge">${escHtml(c)}</span>`; });
        html += `</div></section>`;
    }

    if(char.last_edit && char.last_edit.username){
        html += `<p class="wiki-last-edit">son düzenleyen: <a href="kullanici.html?u=${encodeURIComponent(char.last_edit.username)}">${escHtml(char.last_edit.username)}</a> · ${escHtml((char.last_edit.created_at || "").slice(0, 16))}</p>`;
    }

    document.getElementById("wiki-sections").innerHTML = html;
}

function renderInfobox(char){
    const imgWrap = document.getElementById("infobox-image");
    const cap = document.getElementById("infobox-caption");
    const body = document.getElementById("infobox-body");

    if(char.image){
        imgWrap.innerHTML = `<img src="${escHtml(imgSrc(char.image))}" alt="${escHtml(char.name)}"/>`;
    }else{
        imgWrap.innerHTML = `<div class="wiki-initials-placeholder">${initials(char.name)}</div>`;
    }
    cap.textContent = char.name;

    const rows = [
        ["Ad", char.name],
        ["Tam Ad", char.full_name],
        ["İlk Görünüş", char.first_appearance],
    ].filter(([, v]) => v);

    body.innerHTML = rows.map(([k, v]) =>
        `<div class="wiki-infobox-row"><span class="key">${escHtml(k)}</span><span class="val">${escHtml(v)}</span></div>`
    ).join("");
}

function toggleTOC(){
    document.getElementById("wiki-toc").classList.toggle("open");
}

document.getElementById("wiki-toc-list").addEventListener("click", () => {
    document.getElementById("wiki-toc").classList.remove("open");
});

function buildTOC(){
    const list = document.getElementById("wiki-toc-list");
    const headings = document.querySelectorAll("#wiki-sections h2");
    list.innerHTML = "";
    headings.forEach((h, i) => {
        h.id = "section-" + i;
        const li = document.createElement("li");
        li.innerHTML = `<a href="#section-${i}">${escHtml(h.textContent)}</a>`;
        list.appendChild(li);
    });
}

function showError(msg){
    document.getElementById("wiki-title").textContent = "Hata";
    document.getElementById("wiki-summary").textContent = "";
    document.getElementById("wiki-sections").innerHTML = `<p class="straightText" style="padding:10px 0;">${escHtml(msg)}</p>`;
    document.getElementById("infobox-image").innerHTML = "";
    document.getElementById("infobox-caption").textContent = "";
    document.getElementById("infobox-body").innerHTML = "";
}

// Düzenle → kaydet → wiki (replace) sonrası "← Geri" geçmişteki *eski* wiki
// girdisine düşer ve tarayıcı onu bfcache'ten aynen geri getirir (eski içerik).
// bfcache'ten dönen her sayfayı tazele.
window.addEventListener("pageshow", e => {
    if(e.persisted) location.reload();
});

loadCharacter();
