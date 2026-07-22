// API, escHtml, initials, charCard come from auth.js (loaded first)

let allChars = [];
let sortMode = "ozel";   // "ozel" (oluşturulma, eskiden yeniye) | "alfabetik" (A→Z)

// Özel = oluşturulma sırası, eskiden yeniye. seed satırları aynı zaman damgasını
// paylaşabilir → id ile ikinci anahtar deterministik yapar.
function sortChars(){
    if(sortMode === "alfabetik"){
        allChars.sort((a, b) => new Intl.Collator("tr").compare(a.name, b.name));
    }else{
        allChars.sort((a, b) =>
            String(a.created_at || "").localeCompare(String(b.created_at || "")) ||
            String(a.id).localeCompare(String(b.id))
        );
    }
}

async function loadAll(){
    // varsayılan sıralama (admin ayarı) + karakterler paralel çekilir — önce alfabetik
    // gösterip sonra yeniden sıralamamak için config'i bekliyoruz.
    let cfg = null, chars = null;
    try{
        [cfg, chars] = await Promise.all([
            fetch(`${API}/api/config`).then(r => r.ok ? r.json() : null).catch(() => null),
            fetch(`${API}/api/characters`).then(r => { if(!r.ok) throw new Error(r.status); return r.json(); }),
        ]);
    }catch(e){
        document.getElementById("loading-msg").textContent = "Yüklenemedi.";
        return;
    }
    allChars = chars;
    if(cfg && cfg.char_sort === "alfabetik") sortMode = "alfabetik";
    const sel = document.getElementById("char-sort");
    if(sel) sel.value = sortMode;
    sortChars();
    filterChars();
}

function changeSort(){
    sortMode = document.getElementById("char-sort").value === "alfabetik" ? "alfabetik" : "ozel";
    sortChars();
    filterChars();
}

function renderChars(chars){
    const grid = document.getElementById("char-grid");
    grid.innerHTML = "";
    if(!chars.length){
        grid.innerHTML = `<p class="straightText" style="font-size:large;">Sonuç yok.</p>`;
        return;
    }
    chars.forEach(c => grid.appendChild(charCard(c)));
}

function filterChars(){
    const q = document.getElementById("char-search").value.trim().toLocaleLowerCase("tr");
    if(!q){
        renderChars(allChars);
        return;
    }
    renderChars(allChars.filter(c =>
        c.name.toLocaleLowerCase("tr").includes(q) ||
        (c.summary || "").toLocaleLowerCase("tr").includes(q)
    ));
}

loadAll();
