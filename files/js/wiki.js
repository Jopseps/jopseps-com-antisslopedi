const API = location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://localhost:8787"
    : "https://antisslopedi-server.yusufmertturan.workers.dev";

async function loadCharacter(){
    const id = new URLSearchParams(location.search).get("char");
    if(!id){
        showError("Karakter belirtilmedi.");
        return;
    }

    let char;
    try{
        const res = await fetch(`${API}/api/characters/${encodeURIComponent(id)}`);
        if(res.status === 404){
            showError("Karakter bulunamadı: " + id);
            return;
        }
        if(!res.ok) throw new Error(res.status);
        char = await res.json();
    }catch(e){
        showError("Yüklenemedi. Tekrar dene.");
        return;
    }

    renderArticle(char);
    renderInfobox(char);
    buildTOC();
    applyColorScheme();
}

function initials(name){
    return name.split(" ").map(w => w[0]).filter(Boolean).join("").slice(0, 2).toUpperCase();
}

function renderArticle(char){
    document.getElementById("wiki-title").textContent = char.name;
    document.getElementById("wiki-summary").textContent = char.summary || "";
    document.title = char.name + " — Antisslopedi";

    let html = "";

    html += `<section class="wiki-section"><h2>Genel</h2><p>${escHtml(char.description || "")}</p></section>`;

    if(char.features && char.features.length){
        html += `<section class="wiki-section"><h2>Özellikler</h2><ul>`;
        char.features.forEach(a => { html += `<li>${escHtml(a)}</li>`; });
        html += `</ul></section>`;
    }

    if(char.variants && char.variants.length){
        html += `<section class="wiki-section"><h2>Varyasyonlar</h2><ul>`;
        char.variants.forEach(v => { html += `<li>${escHtml(v)}</li>`; });
        html += `</ul></section>`;
    }

    if(char.relations && char.relations.length){
        html += `<section class="wiki-section"><h2>İlişkiler</h2><ul>`;
        char.relations.forEach(r => {
            if(r.related_id){
                html += `<li>${escHtml(r.label)}: <a href="wiki.html?char=${encodeURIComponent(r.related_id)}">${escHtml(r.related_id)}</a></li>`;
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

    document.getElementById("wiki-sections").innerHTML = html;
}

function renderInfobox(char){
    const imgWrap = document.getElementById("infobox-image");
    const cap = document.getElementById("infobox-caption");
    const body = document.getElementById("infobox-body");

    if(char.image){
        imgWrap.innerHTML = `<img src="${escAttr(char.image)}" alt="${escAttr(char.name)}"/>`;
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

function escHtml(s){
    if(!s) return "";
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function escAttr(s){
    if(!s) return "";
    return String(s).replace(/"/g,"&quot;");
}

loadCharacter();
