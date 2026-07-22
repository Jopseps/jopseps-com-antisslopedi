// API, escHtml, authHeaders, canEditRole come from auth.js (loaded first)

const historyCharId = new URLSearchParams(location.search).get("char");

async function loadHistory(){
    const list = document.getElementById("rev-list");
    if(!historyCharId){
        list.innerHTML = `<p class="straightText">Karakter belirtilmedi.</p>`;
        return;
    }

    document.getElementById("history-title").textContent = "Geçmiş: " + historyCharId;
    document.title = "Geçmiş: " + historyCharId + " — Antısslopedi";
    const back = document.getElementById("back-link");
    back.href = `wiki.html?char=${encodeURIComponent(historyCharId)}`;
    // döngü önleme: bu karakterin wiki sayfasından geldiysek yeni geçmiş girdisi ekleme,
    // geri git. yoksa wiki'nin "← Geri"si bizi tekrar buraya atar (wiki⇄geçmiş ping-pong).
    // history.back() sonrası wiki'de referrer hâlâ karakterler kalır → oradan grid'e döner.
    back.onclick = e => {
        let fromWiki = false;
        try{
            const ref = new URL(document.referrer);
            fromWiki = ref.origin === location.origin
                && ref.pathname.endsWith("/wiki.html")
                && ref.searchParams.get("char") === historyCharId;
        }catch(_){}
        if(fromWiki && history.length > 1){
            e.preventDefault();
            history.back();
        }
    };

    let revs;
    try{
        const res = await fetch(`${API}/api/characters/${encodeURIComponent(historyCharId)}/revisions`);
        if(!res.ok) throw new Error(res.status);
        revs = await res.json();
    }catch(e){
        list.innerHTML = `<p class="straightText">Geçmiş yüklenemedi.</p>`;
        return;
    }

    if(!revs.length){
        list.innerHTML = `<p class="straightText">Bu sayfa için henüz kayıtlı sürüm yok (ilk tohum verisi geçmişe yazılmaz).</p>`;
        return;
    }

    if(revs.length > 1) document.getElementById("compare-bar").style.display = "flex";

    list.innerHTML = "";
    revs.forEach((rev, i) => {
        const row = document.createElement("div");
        row.className = "rev-row";
        const current = i === 0 ? ` <span class="wiki-badge">güncel</span>` : "";
        // defaults: latest as "yeni", the one before as "eski"
        const radios = revs.length > 1 ? `<span class="rev-radios">
                <input type="radio" name="diff-old" value="${rev.id}" title="eski" ${i === 1 ? "checked" : ""}>
                <input type="radio" name="diff-new" value="${rev.id}" title="yeni" ${i === 0 ? "checked" : ""}>
            </span>` : "";
        const revert = (i !== 0 && canEditRole())
            ? `<a href="#" onclick="revertTo(${rev.id});return false;">geri döndür</a>`
            : "";
        row.innerHTML = `
            <span class="straightText">${radios}#${rev.id}${current} — ${rev.username ? `<a href="kullanici.html?u=${encodeURIComponent(rev.username)}" style="text-decoration:underline;">${escHtml(rev.username)}</a>` : "?"} — ${escHtml(rev.created_at)} (UTC)</span>
            <span class="rev-row-actions">
                <a href="#" onclick="showRevision(${rev.id}); return false;">Görüntüle</a>
                ${revert}
                <a href="duzenle.html?char=${encodeURIComponent(historyCharId)}&rev=${rev.id}">Düzenleyicide aç</a>
            </span>
        `;
        list.appendChild(row);
    });
}

async function fetchRevision(revId){
    const res = await fetch(`${API}/api/revisions/${revId}`);
    if(!res.ok) throw new Error(res.status);
    return await res.json();
}

// --- git-style compare ---

function lcsDiff(aw, bw){
    const m = aw.length, n = bw.length;
    if(m * n > 300000) return null;
    const dp = [];
    for(let i = 0; i <= m; i++) dp.push(new Int32Array(n + 1));
    for(let i = m - 1; i >= 0; i--){
        for(let j = n - 1; j >= 0; j--){
            dp[i][j] = aw[i] === bw[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
    }
    const out = [];
    let i = 0, j = 0;
    while(i < m && j < n){
        if(aw[i] === bw[j]){ out.push(["=", aw[i]]); i++; j++; }
        else if(dp[i + 1][j] >= dp[i][j + 1]){ out.push(["-", aw[i]]); i++; }
        else{ out.push(["+", bw[j]]); j++; }
    }
    while(i < m) out.push(["-", aw[i++]]);
    while(j < n) out.push(["+", bw[j++]]);
    return out;
}

function diffTextHtml(a, b){
    const aw = String(a || "").split(/\s+/).filter(Boolean);
    const bw = String(b || "").split(/\s+/).filter(Boolean);
    const ops = lcsDiff(aw, bw);
    if(!ops){
        return `<div class="diff-del">${escHtml(a || "—")}</div><div class="diff-add">${escHtml(b || "—")}</div>`;
    }
    return ops.map(([t, w]) =>
        t === "=" ? escHtml(w) : `<span class="${t === "-" ? "diff-del" : "diff-add"}">${escHtml(w)}</span>`
    ).join(" ");
}

// Görsel alanı: linki değil küçük önizlemeleri göster. eski=kırmızı, yeni=yeşil.
// R2 tek görseli id başına saklar (üzerine yazılır); ?v=... sadece cache kırıcı — bu yüzden
// alt taban aynıysa iki özdeş resim yerine tek önizleme + not gösteririz.
function imgThumb(raw, cls){
    return `<span class="diff-img-frame ${cls}"><img src="${escHtml(imgSrc(raw))}" alt="" loading="lazy"></span>`;
}

function diffImageHtml(oldRaw, newRaw){
    const o = oldRaw || "", n = newRaw || "";
    const base = s => s.split("?")[0];
    if(!o && n) return `<div class="diff-img-row">${imgThumb(n, "add")}</div>`;
    if(o && !n) return `<div class="diff-img-row">${imgThumb(o, "del")}</div>`;
    if(base(o) === base(n)){
        return `<div class="diff-img-row">${imgThumb(n, "")}<span class="straightText diff-img-note">görsel güncellendi</span></div>`;
    }
    return `<div class="diff-img-row">${imgThumb(o, "del")}<span class="diff-img-arrow">→</span>${imgThumb(n, "add")}</div>`;
}

function diffListHtml(a, b){
    a = a || []; b = b || [];
    const kept = b.filter(x => a.includes(x));
    const removed = a.filter(x => !b.includes(x));
    const added = b.filter(x => !a.includes(x));
    return [
        ...kept.map(x => `<span class="wiki-badge">${escHtml(x)}</span>`),
        ...removed.map(x => `<span class="wiki-badge diff-del">${escHtml(x)}</span>`),
        ...added.map(x => `<span class="wiki-badge diff-add">${escHtml(x)}</span>`),
    ].join(" ");
}

function relStrings(rels){
    return (rels || []).map(r => r.label + (r.related_id ? ` (${r.related_id})` : ""));
}

// eski snapshot'lar düz string, yenileri {variant_id, variant_name}
function varStrings(vars){
    return (vars || []).map(v => {
        if(typeof v === "string") return v;
        return (v.variant_name || "") + (v.variant_id ? ` (${v.variant_id})` : "");
    });
}

async function compareRevisions(){
    const oldEl = document.querySelector('input[name="diff-old"]:checked');
    const newEl = document.querySelector('input[name="diff-new"]:checked');
    const box = document.getElementById("rev-preview");
    if(!oldEl || !newEl || oldEl.value === newEl.value){
        box.style.display = "block";
        box.innerHTML = `<p class="straightText">Karşılaştırmak için iki farklı sürüm seç.</p>`;
        return;
    }
    // lower id = old side, regardless of which column was picked
    let [oldId, newId] = [parseInt(oldEl.value, 10), parseInt(newEl.value, 10)];
    if(oldId > newId) [oldId, newId] = [newId, oldId];

    box.style.display = "block";
    box.innerHTML = `<p class="straightText">yükleniyor...</p>`;
    let oldRev, newRev;
    try{
        [oldRev, newRev] = await Promise.all([fetchRevision(oldId), fetchRevision(newId)]);
    }catch(e){
        box.innerHTML = `<p class="straightText">Sürümler yüklenemedi.</p>`;
        return;
    }

    const a = oldRev.data, b = newRev.data;
    const fields = [
        ["name", "Ad", "text"],
        ["full_name", "Tam Ad", "text"],
        ["summary", "Özet", "text"],
        ["description", "Açıklama", "text"],
        ["story", "Hikaye", "text"],
        ["image", "Görsel", "img"],
        ["first_appearance", "İlk Görünüş", "text"],
        ["featured", "Öne çıkan", "bool"],
        ["featured_order", "Öne çıkan sırası", "text"],
        ["features", "Özellikler", "list"],
        ["variants", "Varyasyonlar", "var"],
        ["categories", "Kategoriler", "list"],
        ["relations", "İlişkiler", "rel"],
    ];

    let html = `<h2 class="straightText">#${oldRev.id} → #${newRev.id}</h2>
        <p class="straightText" style="font-size:85%; opacity:0.7;">${escHtml(oldRev.username || "?")} (${escHtml(oldRev.created_at)}) → ${escHtml(newRev.username || "?")} (${escHtml(newRev.created_at)})</p>`;
    let changes = 0;

    for(const [key, label, kind] of fields){
        const norm = v => kind === "rel" ? relStrings(v) : (kind === "var" ? varStrings(v) : v);
        const av = norm(a[key]);
        const bv = norm(b[key]);
        if(JSON.stringify(av ?? null) === JSON.stringify(bv ?? null)) continue;
        changes++;
        let body;
        if(kind === "bool"){
            body = `<span class="diff-del">${a[key] ? "evet" : "hayır"}</span> → <span class="diff-add">${b[key] ? "evet" : "hayır"}</span>`;
        }else if(kind === "img"){
            body = diffImageHtml(a[key], b[key]);
        }else if(kind === "list" || kind === "rel" || kind === "var"){
            body = diffListHtml(av, bv);
        }else{
            body = diffTextHtml(av, bv);
        }
        html += `<div class="diff-field"><div class="diff-field-title">${label}</div><div class="straightText diff-body">${body}</div></div>`;
    }

    if(!changes) html += `<p class="straightText">İki sürüm arasında fark yok.</p>`;
    box.innerHTML = html;
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// --- one-click revert: old snapshot saved forward as a new revision ---

async function revertTo(revId){
    if(!confirm(`#${revId} sürümüne geri döndürülsün mü? (Eski içerik yeni sürüm olarak kaydedilir.)`)) return;
    let rev, cur;
    try{
        rev = await fetchRevision(revId);
        const res = await fetch(`${API}/api/characters/${encodeURIComponent(historyCharId)}`);
        if(!res.ok) throw new Error(res.status);
        cur = await res.json();
    }catch(e){
        alert("Sürüm yüklenemedi (karakter silinmiş olabilir — admin panelinden geri yükle).");
        return;
    }

    let res, data;
    try{
        res = await fetch(`${API}/api/characters/${encodeURIComponent(historyCharId)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ ...rev.data, base_revision: cur.revision }),
        });
        data = await res.json();
    }catch(e){
        alert("Sunucuya ulaşılamadı.");
        return;
    }
    if(!res.ok){
        alert(data.message || data.error || "Geri döndürülemedi.");
        return;
    }
    location.reload();
}

async function showRevision(revId){
    const box = document.getElementById("rev-preview");
    box.style.display = "block";
    box.innerHTML = `<p class="straightText">yükleniyor...</p>`;

    let rev;
    try{
        rev = await fetchRevision(revId);
    }catch(e){
        box.innerHTML = `<p class="straightText">Sürüm yüklenemedi.</p>`;
        return;
    }

    const d = rev.data;
    let html = `<h2 class="straightText">#${rev.id} — ${escHtml(d.name || "")}</h2>`;
    if(d.summary) html += `<p class="straightText"><b>Özet:</b> ${escHtml(d.summary)}</p>`;
    if(d.description) html += `<p class="straightText">${escHtml(d.description)}</p>`;
    if(d.story) html += `<p class="straightText"><b>Hikaye:</b> ${escHtml(d.story)}</p>`;

    const listBlock = (title, items) => {
        if(!items || !items.length) return "";
        return `<p class="straightText"><b>${title}:</b> ${items.map(escHtml).join(", ")}</p>`;
    };
    html += listBlock("Özellikler", d.features);
    html += listBlock("Varyasyonlar", varStrings(d.variants));
    html += listBlock("Kategoriler", d.categories);
    html += listBlock("İlişkiler", relStrings(d.relations));
    box.innerHTML = html;
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

loadHistory();
