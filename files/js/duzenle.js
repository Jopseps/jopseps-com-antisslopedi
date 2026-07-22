let mode = "new";
let charId = null;
let baseRevision = 0;
let allChars = [];        // [{id, name}] — ilişki autocomplete'i için

const MAX_IMAGE_BYTES = 300 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

// Kategoriler ve Özellikler aynı chip bulutunu paylaşır; tek fark veri kaynağı ve dom id'leri.
const PICKERS = {
    categories: { url: "/api/categories", key: "category", data: [], word: "kategori", prefix: "cat" },
    features:   { url: "/api/features",   key: "feature",  data: [], word: "özellik",  prefix: "feat" },
};

function field(id){ return document.getElementById(id); }

function showEditError(msg){
    field("edit-error").textContent = msg;
}

// "list-categories" → "categories" (picker'ı olmayan listeler için null)
function pickerOf(container){
    const name = container.id.replace("list-", "");
    return PICKERS[name] ? name : null;
}

function makeRow(container, value){
    const row = document.createElement("div");
    row.className = "edit-row";
    const input = document.createElement("input");
    input.className = "form-input";
    input.value = value || "";
    const del = document.createElement("button");
    del.className = "form-btn";
    del.type = "button";
    del.textContent = "sil";
    const picker = pickerOf(container);
    del.onclick = () => {
        row.remove();
        if(picker) renderChips(picker);
    };
    if(picker) input.oninput = () => renderChips(picker);
    row.appendChild(input);
    row.appendChild(del);
    container.appendChild(row);
}

function addRow(listName, value){
    makeRow(field("list-" + listName), value);
    if(PICKERS[listName]) renderChips(listName);
}

// --- kategori / özellik seçici ---

function togglePicker(name){
    const p = PICKERS[name];
    const picker = field(p.prefix + "-picker");
    const open = picker.style.display !== "none";
    picker.style.display = open ? "none" : "";
    field(p.prefix + "-toggle").textContent = open ? "+ Ekle" : "− Kapat";
    if(!open){
        renderChips(name);
        field(p.prefix + "-search").focus();
    }
}

async function loadPicker(name){
    const p = PICKERS[name];
    try{
        const res = await fetch(API + p.url);
        if(res.ok) p.data = await res.json();
    }catch(e){
        p.data = [];
    }
    renderChips(name);
}

function hasItem(name, value){
    const n = value.toLocaleLowerCase("tr");
    return collectList(name).some(v => v.toLocaleLowerCase("tr") === n);
}

function toggleItem(name, value){
    const n = value.toLocaleLowerCase("tr");
    const rows = [...field("list-" + name).querySelectorAll(".edit-row")];
    const hit = rows.find(row => row.querySelector("input").value.trim().toLocaleLowerCase("tr") === n);
    if(hit){
        hit.remove();
        renderChips(name);
    }else{
        addRow(name, value);
    }
}

function addNewItem(name){
    const p = PICKERS[name];
    const value = field(p.prefix + "-search").value.trim();
    if(!value) return;
    if(!hasItem(name, value)) addRow(name, value);
    field(p.prefix + "-search").value = "";
    renderChips(name);
}

function renderChips(name){
    const p = PICKERS[name];
    const box = field(p.prefix + "-chips");
    if(!box) return;
    const raw = field(p.prefix + "-search").value.trim();
    const q = raw.toLocaleLowerCase("tr");
    const list = q ? p.data.filter(c => c[p.key].toLocaleLowerCase("tr").includes(q)) : p.data;
    box.innerHTML = "";
    list.forEach(c => {
        const value = c[p.key];
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "cat-chip" + (hasItem(name, value) ? " on" : "");
        chip.onclick = () => toggleItem(name, value);
        chip.appendChild(document.createTextNode(value));
        const n = document.createElement("span");
        n.className = "cat-chip-count";
        n.textContent = c.count;
        chip.appendChild(n);
        box.appendChild(chip);
    });
    const exact = q && p.data.some(c => c[p.key].toLocaleLowerCase("tr") === q);
    if(q && !exact){
        if(!list.length){
            const empty = document.createElement("div");
            empty.className = "cat-empty straightText";
            empty.textContent = "Eşleşme yok";
            box.appendChild(empty);
        }
        const add = document.createElement("button");
        add.type = "button";
        add.className = "form-btn cat-new-btn";
        add.textContent = `+ Yeni: «${raw}» ekle`;
        add.onclick = () => addNewItem(name);
        box.appendChild(add);
    }
}

// html onclick/oninput'ları için ince sarmalayıcılar
function toggleCatPicker(){ togglePicker("categories"); }
function renderCatChips(){ renderChips("categories"); }
function toggleFeatPicker(){ togglePicker("features"); }
function renderFeatChips(){ renderChips("features"); }

// --- İlk Görünüş seçici (tek değerli: chip'e tıklamak input'u doldurur) ---
// PICKERS listeye satır ekliyor; bu alan tek metin olduğu için ayrı, sade bir seçici.

let faData = [];   // [{value, count}] — var olan İlk Görünüş değerleri

async function loadFaPicker(){
    try{
        const res = await fetch(API + "/api/first-appearances");
        if(res.ok) faData = await res.json();
    }catch(e){
        faData = [];
    }
    renderFaChips();
}

function toggleFaPicker(){
    const picker = field("fa-picker");
    const open = picker.style.display !== "none";
    picker.style.display = open ? "none" : "";
    field("fa-toggle").textContent = open ? "+ Seç" : "− Kapat";
    if(!open){
        renderFaChips();
        field("fa-search").focus();
    }
}

function renderFaChips(){
    const box = field("fa-chips");
    if(!box) return;
    const cur = field("f-first-appearance").value.trim().toLocaleLowerCase("tr");
    const raw = field("fa-search").value.trim();
    const q = raw.toLocaleLowerCase("tr");
    const list = q ? faData.filter(c => c.value.toLocaleLowerCase("tr").includes(q)) : faData;
    box.innerHTML = "";
    list.forEach(c => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "cat-chip" + (c.value.toLocaleLowerCase("tr") === cur ? " on" : "");
        chip.onclick = () => setFaValue(c.value);
        chip.appendChild(document.createTextNode(c.value));
        const n = document.createElement("span");
        n.className = "cat-chip-count";
        n.textContent = c.count;
        chip.appendChild(n);
        box.appendChild(chip);
    });
    const exact = q && faData.some(c => c.value.toLocaleLowerCase("tr") === q);
    if(q && !exact){
        if(!list.length){
            const empty = document.createElement("div");
            empty.className = "cat-empty straightText";
            empty.textContent = "Eşleşme yok";
            box.appendChild(empty);
        }
        const add = document.createElement("button");
        add.type = "button";
        add.className = "form-btn cat-new-btn";
        add.textContent = `+ «${raw}» yaz`;
        add.onclick = () => setFaValue(raw);
        box.appendChild(add);
    }
}

// tek değerli: seçilen chip zaten seçiliyse temizle (toggle), değilse input'a yaz
function setFaValue(value){
    const input = field("f-first-appearance");
    if(input.value.trim().toLocaleLowerCase("tr") === value.toLocaleLowerCase("tr")){
        input.value = "";
    }else{
        input.value = value;
    }
    field("fa-search").value = "";
    renderFaChips();
}

// --- görsel ---

let pendingFile = null;

function imageHint(msg){ field("img-hint").textContent = msg; }

function setImagePreview(){
    const val = field("f-image").value.trim();
    const box = field("img-preview");
    field("img-remove-btn").style.display = val ? "inline-block" : "none";
    box.innerHTML = "";
    if(!val){
        box.className = "img-preview empty";
        box.textContent = "görsel yok";
        return;
    }
    box.className = "img-preview";
    const img = document.createElement("img");
    img.alt = "önizleme";
    img.onerror = () => {
        box.className = "img-preview empty";
        box.textContent = "görsel açılamadı";
    };
    img.src = imgSrc(val);
    box.appendChild(img);
}

function pickImage(){
    const file = field("f-image-file").files[0];
    pendingFile = null;
    field("upload-btn").disabled = true;
    if(!file) return;
    if(!IMAGE_TYPES.includes(file.type)){
        imageHint("Sadece png, jpg veya webp yüklenebilir.");
        return;
    }
    const kb = Math.round(file.size / 1024);
    if(file.size > MAX_IMAGE_BYTES){
        imageHint(`Dosya ${kb} KB — sınır 300 KB. Küçültüp tekrar dene.`);
        return;
    }
    pendingFile = file;
    field("upload-btn").disabled = false;
    imageHint(`${file.name} — ${kb} KB. "Yükle"ye bas.`);
    const box = field("img-preview");
    box.className = "img-preview";
    box.innerHTML = "";
    const img = document.createElement("img");
    img.alt = "önizleme";
    img.src = URL.createObjectURL(file);
    box.appendChild(img);
}

// R2'ye yazar; karakter satırı henüz yoksa da çalışır (id yeterli).
async function uploadImage(){
    if(!pendingFile) return;
    const id = mode === "edit" ? charId : field("f-id").value.trim();
    if(!/^[a-z0-9-]{2,50}$/.test(id)){
        showEditError("Görsel yüklemeden önce geçerli bir id yaz (kebab-case).");
        return;
    }
    showEditError("");
    const btn = field("upload-btn");
    btn.disabled = true;
    imageHint("yükleniyor…");
    let res, data;
    try{
        res = await fetch(`${API}/api/upload/${encodeURIComponent(id)}`, {
            method: "POST",
            headers: { "Content-Type": pendingFile.type, ...authHeaders() },
            body: pendingFile,
        });
        data = await res.json();
    }catch(e){
        showEditError("Sunucuya ulaşılamadı.");
        imageHint("");
        btn.disabled = false;
        return;
    }
    if(!res.ok){
        showEditError(data.error || "Görsel yüklenemedi.");
        imageHint("");
        btn.disabled = false;
        return;
    }
    pendingFile = null;
    field("f-image-file").value = "";
    field("f-image").value = data.image;
    // Yeni karakterde görsel id'ye bağlı yüklendi; id sonradan değişirse dosya yetim kalır
    if(mode === "new") field("f-id").disabled = true;
    imageHint("Yüklendi — Kaydet'e basmadan sayfaya işlenmez."
        + (mode === "new" ? " (görsel bu id'ye bağlandı, id kilitlendi)" : ""));
    setImagePreview();
}

async function removeImage(){
    const val = field("f-image").value.trim();
    const id = mode === "edit" ? charId : field("f-id").value.trim();
    pendingFile = null;
    field("f-image-file").value = "";
    field("upload-btn").disabled = true;
    field("f-image").value = "";
    if(mode === "new") field("f-id").disabled = false;
    imageHint("Kaldırıldı — Kaydet'e basmadan sayfaya işlenmez.");
    setImagePreview();
    if(val.startsWith("/api/images/") && id){
        try{
            await fetch(`${API}/api/upload/${encodeURIComponent(id)}`, { method: "DELETE", headers: authHeaders() });
        }catch(e){}
    }
}

function syncOrderField(){
    const on = field("f-featured").checked;
    const order = field("f-featured-order");
    order.disabled = !on;
    if(!on) order.value = "";
}

// --- ilişkiler ---

async function loadChars(){
    try{
        const res = await fetch(API + "/api/characters");
        if(res.ok) allChars = await res.json();
    }catch(e){
        allChars = [];
    }
    const dl = field("char-options");
    const dlNames = field("char-name-options");
    dl.innerHTML = "";
    dlNames.innerHTML = "";
    allChars.forEach(c => {
        if(c.id === charId) return;   // karakter kendine ilişki kurmasın
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.name;
        dl.appendChild(opt);
        // varyasyon alanında görünen metin ad olduğu için ayrı bir ad listesi
        const nopt = document.createElement("option");
        nopt.value = c.name;
        dlNames.appendChild(nopt);
    });
    // liste geç geldiyse mevcut satırların rozetlerini tazele
    [...field("list-relations").querySelectorAll(".edit-row")].forEach(row => row._syncRel && row._syncRel());
    renderVarChips();   // chip bulutu allChars'tan besleniyor, liste geç gelirse boş kalırdı
    renderRelChips();
}

// Varyasyon satırı: tek görünür alan (ad). Ad bir karakterle eşleşirse variant_id
// arka planda tutulur — girilen metnin kendisi asla id'yle değiştirilmez.
function addVariantRow(variantId, variantName){
    const row = document.createElement("div");
    row.className = "edit-row rel-row";
    const input = document.createElement("input");
    input.className = "form-input";
    input.placeholder = "varyasyon adı";
    input.setAttribute("list", "char-name-options");
    input.value = variantName || "";
    row._variantId = variantId || null;
    const hint = document.createElement("span");

    // render sadece row._variantId'yi gösterir — yükleme kaydedilen id'ye güvenir
    // (ilişkilerdeki gibi), yoksa "bağı kaldır" bir sonraki açılışta geri bağlanırdı
    const render = () => {
        if(!input.value.trim()){
            hint.className = "rel-hint straightText";
            hint.textContent = "";
            hint.title = "";
            hint.style.cursor = "";
            hint.onclick = null;
            return;
        }
        const linked = row._variantId;
        hint.className = "rel-hint straightText " + (linked ? "ok" : "warn");
        hint.textContent = linked ? linked + " ✕" : "sayfası yok — düz metin";
        hint.title = linked ? "bağı kaldır" : "";
        hint.style.cursor = linked ? "pointer" : "";
        hint.onclick = linked ? () => { row._variantId = null; render(); renderVarChips(); } : null;
    };
    // resolve sadece kullanıcı yazarken çalışır: ad → id
    const resolve = () => {
        const v = input.value.trim();
        if(!v){
            row._variantId = null;
        }else{
            const low = v.toLocaleLowerCase("tr");
            const hit = allChars.find(c => c.id !== charId && (c.id === v || c.name.toLocaleLowerCase("tr") === low));
            row._variantId = hit ? hit.id : null;
        }
        render();
        renderVarChips();   // chip seçili durumu satırlardan türüyor
    };
    input.oninput = resolve;
    input.onblur = resolve;

    const del = document.createElement("button");
    del.className = "form-btn";
    del.type = "button";
    del.textContent = "sil";
    del.onclick = () => { row.remove(); renderVarChips(); };
    row.appendChild(input);
    row.appendChild(hint);
    row.appendChild(del);
    row._syncVar = render;
    render();
    field("list-variants").appendChild(row);
}

// --- varyasyon seçici ---
// Kategoriler/özellikler chip bulutunun kardeşi ama kaynağı allChars: tıklanan chip
// linkli bir satır ekler (variant_id dolu). Serbest metin "+ Yeni" ile id'siz eklenir.

function varRows(){
    return [...field("list-variants").querySelectorAll(".edit-row")];
}

function toggleVarPicker(){
    const picker = field("var-picker");
    const open = picker.style.display !== "none";
    picker.style.display = open ? "none" : "";
    field("var-toggle").textContent = open ? "+ Ekle" : "− Kapat";
    if(!open){
        renderVarChips();
        field("var-search").focus();
    }
}

function toggleVarChar(c){
    const hit = varRows().find(row => row._variantId === c.id);
    if(hit){
        hit.remove();
    }else{
        addVariantRow(c.id, c.name);
    }
    renderVarChips();
}

function addNewVariant(){
    const value = field("var-search").value.trim();
    if(!value) return;
    const n = value.toLocaleLowerCase("tr");
    const dup = varRows().some(row => row.querySelector("input").value.trim().toLocaleLowerCase("tr") === n);
    if(!dup) addVariantRow(null, value);
    field("var-search").value = "";
    renderVarChips();
}

function renderVarChips(){
    const box = field("var-chips");
    if(!box) return;
    const raw = field("var-search").value.trim();
    const q = raw.toLocaleLowerCase("tr");
    const pool = allChars.filter(c => c.id !== charId);
    const list = q ? pool.filter(c => c.name.toLocaleLowerCase("tr").includes(q) || c.id.includes(q)) : pool;
    box.innerHTML = "";
    list.forEach(c => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "cat-chip" + (varRows().some(row => row._variantId === c.id) ? " on" : "");
        chip.onclick = () => toggleVarChar(c);
        chip.textContent = c.name;
        box.appendChild(chip);
    });
    const exact = q && pool.some(c => c.name.toLocaleLowerCase("tr") === q);
    if(q && !exact){
        if(!list.length){
            const empty = document.createElement("div");
            empty.className = "cat-empty straightText";
            empty.textContent = "Eşleşme yok";
            box.appendChild(empty);
        }
        const add = document.createElement("button");
        add.type = "button";
        add.className = "form-btn cat-new-btn";
        add.textContent = `+ Yeni: «${raw}» ekle`;
        add.onclick = () => addNewVariant();
        box.appendChild(add);
    }
}

function collectVariants(){
    const out = [];
    varRows().forEach(row => {
        const name = row.querySelector("input").value.trim();
        if(!name) return;
        // aynı ad iki kez girilebiliyor (chip ile ekle → bağı kaldır → tekrar chip);
        // teki kalsın, linkli olan kazansın
        const key = name.toLocaleLowerCase("tr");
        const dup = out.find(v => v.variant_name.toLocaleLowerCase("tr") === key);
        if(dup){
            if(!dup.variant_id && row._variantId) dup.variant_id = row._variantId;
            return;
        }
        out.push({ variant_id: row._variantId || null, variant_name: name });
    });
    return out;
}

function addRelationRow(relatedId, label){
    const row = document.createElement("div");
    row.className = "edit-row rel-row";
    const idInput = document.createElement("input");
    idInput.className = "form-input";
    idInput.placeholder = "id (opsiyonel)";
    idInput.setAttribute("list", "char-options");
    idInput.value = relatedId || "";
    const hint = document.createElement("span");

    // Datalist öneri verir ama serbest yazım açık kalır: sayfası olmayan karakterler
    // related_id boş kalıp düz metin olarak render edilir.
    const sync = () => {
        const v = idInput.value.trim();
        if(!v){
            hint.className = "rel-hint straightText";
            hint.textContent = "";
            return;
        }
        const hit = allChars.find(c => c.id === v);
        hint.className = "rel-hint straightText " + (hit ? "ok" : "warn");
        hint.textContent = hit ? hit.name : "sayfası yok — düz metin";
    };
    // ad yazılırsa id'ye çevir ("Remi Remi" → "remi-remi")
    const resolveName = () => {
        const v = idInput.value.trim().toLocaleLowerCase("tr");
        if(!v || allChars.some(c => c.id === idInput.value.trim())) return;
        const hit = allChars.find(c => c.name.toLocaleLowerCase("tr") === v);
        if(hit) idInput.value = hit.id;
        sync();
    };
    idInput.oninput = sync;
    idInput.onchange = resolveName;
    idInput.onblur = resolveName;

    const labelInput = document.createElement("input");
    labelInput.className = "form-input";
    labelInput.placeholder = "etiket (örn. ikiz)";
    labelInput.value = label || "";
    const del = document.createElement("button");
    del.className = "form-btn";
    del.type = "button";
    del.textContent = "sil";
    del.onclick = () => { row.remove(); renderRelChips(); };
    row.appendChild(idInput);
    row.appendChild(hint);
    row.appendChild(labelInput);
    row.appendChild(del);
    row._syncRel = sync;
    sync();
    field("list-relations").appendChild(row);
    renderRelChips();
}

// --- ilişki seçici ---
// Varyasyon chip bulutunun kardeşi, kaynağı allChars. Tıklanan chip linkli bir ilişki
// satırı ekler (etiket boş — sonra doldurulur). Serbest metin ilişki için "+ Boş satır".

function relRows(){
    return [...field("list-relations").querySelectorAll(".edit-row")];
}

function toggleRelPicker(){
    const picker = field("rel-picker");
    const open = picker.style.display !== "none";
    picker.style.display = open ? "none" : "";
    field("rel-toggle").textContent = open ? "+ Karakterden seç" : "− Kapat";
    if(!open){
        renderRelChips();
        field("rel-search").focus();
    }
}

function toggleRelChar(c){
    const hit = relRows().find(row => row.querySelector("input").value.trim() === c.id);
    if(hit){
        hit.remove();
        renderRelChips();
    }else{
        addRelationRow(c.id, "");   // etiket boş — kaydetmeden önce doldurulmalı
    }
}

function renderRelChips(){
    const box = field("rel-chips");
    if(!box) return;
    const raw = field("rel-search").value.trim();
    const q = raw.toLocaleLowerCase("tr");
    const pool = allChars.filter(c => c.id !== charId);
    const list = q ? pool.filter(c => c.name.toLocaleLowerCase("tr").includes(q) || c.id.includes(q)) : pool;
    const linked = new Set(relRows().map(row => row.querySelector("input").value.trim()));
    box.innerHTML = "";
    list.forEach(c => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "cat-chip" + (linked.has(c.id) ? " on" : "");
        chip.onclick = () => toggleRelChar(c);
        chip.textContent = c.name;
        box.appendChild(chip);
    });
    if(q && !list.length){
        const empty = document.createElement("div");
        empty.className = "cat-empty straightText";
        empty.textContent = "Eşleşme yok";
        box.appendChild(empty);
    }
}

function collectList(listName){
    return [...field("list-" + listName).querySelectorAll("input")]
        .map(i => i.value.trim())
        .filter(Boolean);
}

function collectRelations(){
    return [...field("list-relations").querySelectorAll(".edit-row")].map(row => {
        const inputs = row.querySelectorAll("input");
        return { related_id: inputs[0].value.trim() || null, label: inputs[1].value.trim() };
    }).filter(r => r.label);
}

function fillForm(d){
    field("f-name").value = d.name || "";
    field("f-full-name").value = d.full_name || "";
    field("f-summary").value = d.summary || "";
    field("f-description").value = d.description || "";
    field("f-story").value = d.story || "";
    field("f-image").value = d.image || "";
    setImagePreview();
    field("f-first-appearance").value = d.first_appearance || "";
    field("f-featured").checked = !!d.featured;
    field("f-featured-order").value = d.featured_order ? d.featured_order : "";
    syncOrderField();
    field("list-features").innerHTML = "";
    field("list-variants").innerHTML = "";
    field("list-categories").innerHTML = "";
    field("list-relations").innerHTML = "";
    (d.features || []).forEach(v => addRow("features", v));
    // eski revizyon snapshot'ları düz string dizisi olabilir
    (d.variants || []).forEach(v => {
        if(typeof v === "string") addVariantRow(null, v);
        else addVariantRow(v.variant_id, v.variant_name);
    });
    (d.categories || []).forEach(v => addRow("categories", v));
    (d.relations || []).forEach(r => addRelationRow(r.related_id, r.label));
    renderVarChips();
}

async function initEditor(){
    if(!getToken()){
        location.href = "giris.html";
        return;
    }
    if(!canEditRole()){
        location.href = "index.html";
        return;
    }

    field("f-image").oninput = setImagePreview;
    setImagePreview();

    const params = new URLSearchParams(location.search);
    charId = params.get("char");
    const rev = params.get("rev");

    loadPicker("categories");
    loadPicker("features");
    loadFaPicker();
    loadChars();

    if(!charId){
        mode = "new";
        document.getElementById("edit-title").textContent = "Yeni Karakter";
        return;
    }

    mode = "edit";
    field("f-id").value = charId;
    field("f-id").disabled = true;
    document.getElementById("rename-btn").style.display = "inline-block";
    document.getElementById("cancel-link").href = `wiki.html?char=${encodeURIComponent(charId)}`;

    let char;
    try{
        const res = await fetch(`${API}/api/characters/${encodeURIComponent(charId)}`);
        if(!res.ok) throw new Error(res.status);
        char = await res.json();
    }catch(e){
        showEditError("Karakter yüklenemedi.");
        return;
    }

    baseRevision = char.revision || 0;
    document.getElementById("edit-title").textContent = "Düzenle: " + char.name;
    document.title = "Düzenle: " + char.name + " — Antisslopedi";
    fillForm(char);

    if(rev){
        try{
            const res = await fetch(`${API}/api/revisions/${encodeURIComponent(rev)}`);
            if(!res.ok) throw new Error(res.status);
            const snapshot = await res.json();
            if(snapshot.char_id !== charId) throw new Error("wrong char");
            fillForm(snapshot.data);
            const note = document.getElementById("rev-note");
            note.textContent = `#${snapshot.id} numaralı eski sürüm yüklendi. Kaydedersen bu içerik yeni sürüm olarak geçmişe eklenir.`;
            note.style.display = "block";
        }catch(e){
            showEditError("Eski sürüm yüklenemedi, güncel içerik gösteriliyor.");
        }
    }

    const user = getUserInfo();
    if(user && user.role === "admin"){
        document.getElementById("delete-btn").style.display = "inline-block";
    }
}

async function save(){
    showEditError("");
    const payload = {
        name: field("f-name").value,
        full_name: field("f-full-name").value,
        summary: field("f-summary").value,
        description: field("f-description").value,
        story: field("f-story").value,
        image: field("f-image").value,
        first_appearance: field("f-first-appearance").value,
        featured: field("f-featured").checked ? 1 : 0,
        featured_order: field("f-featured").checked ? (parseInt(field("f-featured-order").value, 10) || 0) : 0,
        features: collectList("features"),
        variants: collectVariants(),
        categories: collectList("categories"),
        relations: collectRelations(),
    };

    if(!payload.name.trim()){
        showEditError("Ad boş olamaz.");
        return;
    }

    let url = `${API}/api/characters`;
    let method = "POST";
    if(mode === "new"){
        payload.id = field("f-id").value.trim();
        if(!/^[a-z0-9-]{2,50}$/.test(payload.id)){
            showEditError("Id kebab-case olmalı: küçük harf, rakam ve tire (örn. yeni-tiss).");
            return;
        }
    }else{
        url = `${API}/api/characters/${encodeURIComponent(charId)}`;
        method = "PUT";
        payload.base_revision = baseRevision;
    }

    const saveBtn = document.getElementById("save-btn");
    saveBtn.disabled = true;
    let res, data;
    try{
        res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(payload),
        });
        data = await res.json();
    }catch(e){
        showEditError("Sunucuya ulaşılamadı.");
        saveBtn.disabled = false;
        return;
    }
    saveBtn.disabled = false;

    if(res.status === 401){
        clearSession();
        location.href = "giris.html";
        return;
    }
    if(!res.ok){
        showEditError(data.message || data.error || "Kaydedilemedi.");
        return;
    }

    // replace (href değil): Geri tuşu düzenleme menüsüne değil, önceki sayfaya dönsün
    location.replace(`wiki.html?char=${encodeURIComponent(data.id)}`);
}

// Two-step: first click unlocks the field, second click confirms the rename.
// Server repoints child rows, incoming relations and revision history to the new id.
async function renameId(){
    const btn = document.getElementById("rename-btn");
    const input = field("f-id");
    if(input.disabled){
        input.disabled = false;
        input.focus();
        btn.textContent = "Onayla";
        return;
    }

    const newId = input.value.trim();
    if(newId === charId){
        input.disabled = true;
        btn.textContent = "Id'yi değiştir";
        return;
    }
    if(!/^[a-z0-9-]{2,50}$/.test(newId)){
        showEditError("Id kebab-case olmalı: küçük harf, rakam ve tire.");
        return;
    }

    showEditError("");
    btn.disabled = true;
    let res, data;
    try{
        res = await fetch(`${API}/api/characters/${encodeURIComponent(charId)}/rename`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ new_id: newId }),
        });
        data = await res.json();
    }catch(e){
        showEditError("Sunucuya ulaşılamadı.");
        btn.disabled = false;
        return;
    }
    btn.disabled = false;

    if(!res.ok){
        showEditError(data.error || "Id değiştirilemedi.");
        return;
    }

    charId = data.id;
    input.disabled = true;
    btn.textContent = "Id'yi değiştir";
    history.replaceState(null, "", `duzenle.html?char=${encodeURIComponent(charId)}`);
    document.getElementById("cancel-link").href = `wiki.html?char=${encodeURIComponent(charId)}`;
    const note = document.getElementById("rev-note");
    // Yüklenmiş görsel R2'de otomatik taşındı; elle girilen /files/... yolu taşınmaz
    const manual = data.image && !data.image.startsWith("/api/images/");
    if(data.image !== undefined) field("f-image").value = data.image || "";
    setImagePreview();
    note.textContent = `Id "${charId}" oldu. Bağlantılar, geçmiş ve yüklenmiş görsel otomatik taşındı.`
        + (manual ? ` Görsel yolu elle girilmiş — /files/images/characters/${charId}.png olarak sen yeniden adlandır ve alanı güncelle.` : "");
    note.style.display = "block";
}

async function deleteCharacter(){
    if(!confirm(`"${charId}" kalıcı olarak silinsin mi? (Geçmiş kayıtları durur ama sayfa gider.)`)) return;
    let res, data;
    try{
        res = await fetch(`${API}/api/characters/${encodeURIComponent(charId)}`, {
            method: "DELETE",
            headers: authHeaders(),
        });
        data = await res.json();
    }catch(e){
        showEditError("Sunucuya ulaşılamadı.");
        return;
    }
    if(!res.ok){
        showEditError(data.error || "Silinemedi.");
        return;
    }
    location.replace("index.html");
}

initEditor();
