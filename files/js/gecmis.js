const historyCharId = new URLSearchParams(location.search).get("char");

async function loadHistory(){
    const list = document.getElementById("rev-list");
    if(!historyCharId){
        list.innerHTML = `<p class="straightText">Karakter belirtilmedi.</p>`;
        return;
    }

    document.getElementById("history-title").textContent = "Geçmiş: " + historyCharId;
    document.title = "Geçmiş: " + historyCharId + " — Antisslopedi";
    const back = document.getElementById("back-link");
    back.href = `wiki.html?char=${encodeURIComponent(historyCharId)}`;

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

    list.innerHTML = "";
    revs.forEach((rev, i) => {
        const row = document.createElement("div");
        row.className = "rev-row";
        const current = i === 0 ? ` <span class="wiki-badge">güncel</span>` : "";
        row.innerHTML = `
            <span class="straightText">#${rev.id}${current} — ${rev.username ? `<a href="kullanici.html?u=${encodeURIComponent(rev.username)}" style="text-decoration:underline;">${escHtml(rev.username)}</a>` : "?"} — ${escHtml(rev.created_at)} (UTC)</span>
            <span class="rev-row-actions">
                <a href="#" onclick="showRevision(${rev.id}); return false;">Görüntüle</a>
                <a href="duzenle.html?char=${encodeURIComponent(historyCharId)}&rev=${rev.id}">Düzenleyicide aç</a>
            </span>
        `;
        list.appendChild(row);
    });
}

async function showRevision(revId){
    const box = document.getElementById("rev-preview");
    box.style.display = "block";
    box.innerHTML = `<p class="straightText">yükleniyor...</p>`;

    let rev;
    try{
        const res = await fetch(`${API}/api/revisions/${revId}`);
        if(!res.ok) throw new Error(res.status);
        rev = await res.json();
    }catch(e){
        box.innerHTML = `<p class="straightText">Sürüm yüklenemedi.</p>`;
        return;
    }

    const d = rev.data;
    let html = `<h2 class="straightText">#${rev.id} — ${escHtml(d.name || "")}</h2>`;
    if(d.summary) html += `<p class="straightText"><b>Özet:</b> ${escHtml(d.summary)}</p>`;
    if(d.description) html += `<p class="straightText">${escHtml(d.description)}</p>`;

    const listBlock = (title, items) => {
        if(!items || !items.length) return "";
        return `<p class="straightText"><b>${title}:</b> ${items.map(escHtml).join(", ")}</p>`;
    };
    html += listBlock("Özellikler", d.features);
    html += listBlock("Varyasyonlar", d.variants);
    html += listBlock("Kategoriler", d.categories);
    if(d.relations && d.relations.length){
        html += `<p class="straightText"><b>İlişkiler:</b> ${d.relations.map(r => escHtml(r.label + (r.related_id ? " (" + r.related_id + ")" : ""))).join(", ")}</p>`;
    }
    box.innerHTML = html;
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

loadHistory();
