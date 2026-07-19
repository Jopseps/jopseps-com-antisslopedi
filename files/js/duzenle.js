let mode = "new";
let charId = null;
let baseRevision = 0;

function field(id){ return document.getElementById(id); }

function showEditError(msg){
    field("edit-error").textContent = msg;
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
    del.onclick = () => row.remove();
    row.appendChild(input);
    row.appendChild(del);
    container.appendChild(row);
}

function addRow(listName, value){
    makeRow(field("list-" + listName), value);
}

function addRelationRow(relatedId, label){
    const row = document.createElement("div");
    row.className = "edit-row";
    const idInput = document.createElement("input");
    idInput.className = "form-input";
    idInput.placeholder = "id (opsiyonel)";
    idInput.value = relatedId || "";
    const labelInput = document.createElement("input");
    labelInput.className = "form-input";
    labelInput.placeholder = "etiket (örn. ikiz)";
    labelInput.value = label || "";
    const del = document.createElement("button");
    del.className = "form-btn";
    del.type = "button";
    del.textContent = "sil";
    del.onclick = () => row.remove();
    row.appendChild(idInput);
    row.appendChild(labelInput);
    row.appendChild(del);
    field("list-relations").appendChild(row);
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
    field("f-image").value = d.image || "";
    field("f-first-appearance").value = d.first_appearance || "";
    field("list-features").innerHTML = "";
    field("list-variants").innerHTML = "";
    field("list-categories").innerHTML = "";
    field("list-relations").innerHTML = "";
    (d.features || []).forEach(v => addRow("features", v));
    (d.variants || []).forEach(v => addRow("variants", v));
    (d.categories || []).forEach(v => addRow("categories", v));
    (d.relations || []).forEach(r => addRelationRow(r.related_id, r.label));
}

async function initEditor(){
    if(!getToken()){
        location.href = "giris.html";
        return;
    }

    const params = new URLSearchParams(location.search);
    charId = params.get("char");
    const rev = params.get("rev");

    if(!charId){
        mode = "new";
        document.getElementById("edit-title").textContent = "Yeni Karakter";
        return;
    }

    mode = "edit";
    field("f-id").value = charId;
    field("f-id").disabled = true;
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
        image: field("f-image").value,
        first_appearance: field("f-first-appearance").value,
        features: collectList("features"),
        variants: collectList("variants"),
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

    location.href = `wiki.html?char=${encodeURIComponent(data.id)}`;
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
    location.href = "index.html";
}

initEditor();
