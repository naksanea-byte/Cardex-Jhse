let db;
let fotoCapturada = "";
const request = indexedDB.open("JHSE_CardexDB", 1);

request.onupgradeneeded = (e) => {
    db = e.target.result;
    db.createObjectStore("personal", { keyPath: "ci" });
};

request.onsuccess = (e) => {
    db = e.target.result;
    renderTabla();
};

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// CÁMARA
async function iniciarCamara() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        document.getElementById('video').srcObject = stream;
    } catch (err) { alert("No se pudo acceder a la cámara."); }
}

function capturarFoto() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    fotoCapturada = canvas.toDataURL('image/png');
    const preview = document.getElementById('fotoPreview');
    preview.src = fotoCapturada;
    preview.style.display = "block";
}

// GUARDAR / MODIFICAR
function guardarEnDB() {
    const ciVal = document.getElementById('ci').value;
    if(!ciVal) return alert("El C.I. es obligatorio");

    const transaction = db.transaction(["personal"], "readwrite");
    const store = transaction.objectStore("personal");

    const docs = {};
    document.querySelectorAll('#docsList input').forEach(i => docs[i.dataset.doc] = i.checked);

    const emp = {
        ci: ciVal,
        paterno: document.getElementById('paterno').value,
        materno: document.getElementById('materno').value,
        nombres: document.getElementById('nombres').value,
        edad: document.getElementById('edad').value,
        sexo: document.getElementById('sexo').value,
        nacimiento: document.getElementById('nacimiento').value,
        telefono: document.getElementById('telefono').value,
        cargo: document.getElementById('cargo').value,
        puesto: document.getElementById('puesto').value,
        ingreso: document.getElementById('ingreso').value,
        baja: document.getElementById('baja').value,
        papa: document.getElementById('papa').value,
        mama: document.getElementById('mama').value,
        esposa: document.getElementById('esposa').value,
        refNum: document.getElementById('refNum').value,
        foto: fotoCapturada,
        docs: docs
    };

    store.put(emp);
    transaction.oncomplete = () => {
        alert("¡Registro CARDEX JHSE Procesado!");
        renderTabla();
        nuevoRegistro();
    };
}

function renderTabla() {
    const tbody = document.getElementById('dbBody');
    tbody.innerHTML = "";
    db.transaction("personal").objectStore("personal").openCursor().onsuccess = (e) => {
        const c = e.target.result;
        if(c) {
            const v = c.value;
            const dCount = Object.values(v.docs || {}).filter(x => x).length;
            tbody.innerHTML += `
                <tr>
                    <td><img src="${v.foto || ''}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;background:#eee"></td>
                    <td>${v.paterno} ${v.nombres}</td>
                    <td>${v.ci}</td>
                    <td>${v.cargo || '--'}</td>
                    <td><b>${dCount}/9</b></td>
                    <td>
                        <div class="action-btns">
                            <button onclick="exportarPDFIndividual('${v.ci}')" class="btn-act btn-pdf">📄 PDF</button>
                            <button onclick="cargarEmpleado('${v.ci}')" class="btn-act btn-edit">✏️</button>
                            <button onclick="whatsapp('${v.telefono}', '${v.nombres}')" class="btn-act btn-wp">WP</button>
                            <button onclick="eliminar('${v.ci}')" class="btn-act btn-del">🗑️</button>
                        </div>
                    </td>
                </tr>`;
            c.continue();
        }
    };
}

function cargarEmpleado(ci) {
    db.transaction("personal").objectStore("personal").get(ci).onsuccess = (e) => {
        const v = e.target.result;
        // Mapeo manual de campos
        const campos = ['ci','paterno','materno','nombres','edad','sexo','nacimiento','telefono','cargo','puesto','ingreso','baja','papa','mama','esposa','refNum'];
        campos.forEach(f => document.getElementById(f).value = v[f] || "");
        
        fotoCapturada = v.foto || "";
        const preview = document.getElementById('fotoPreview');
        if(fotoCapturada) { preview.src = fotoCapturada; preview.style.display="block"; }
        
        document.querySelectorAll('#docsList input').forEach(i => i.checked = v.docs ? v.docs[i.dataset.doc] : false);
        switchTab('tab1');
        window.scrollTo(0,0);
    };
}

function whatsapp(tel, nombre) {
    if(!tel) return alert("No hay teléfono registrado.");
    window.open(`https://wa.me/${tel}?text=Hola%20${nombre},%20contacto%20de%20Recursos%20Humanos%20JHSE.`);
}

function eliminar(ci) {
    if(confirm("¿Eliminar registro permanentemente?")) {
        db.transaction("personal", "readwrite").objectStore("personal").delete(ci);
        renderTabla();
    }
}

function exportarExcel() {
    db.transaction("personal").objectStore("personal").getAll().onsuccess = (e) => {
        const data = e.target.result;
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Personal_JHSE");
        XLSX.writeFile(wb, "Cardex_JHSE_Full.xlsx");
    };
}

function exportarPDFIndividual(ci) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    db.transaction("personal").objectStore("personal").get(ci).onsuccess = (e) => {
        const v = e.target.result;
        doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 30, 'F');
        doc.setTextColor(255); doc.setFontSize(18); doc.text("CARDEX JHSE - FICHA INDIVIDUAL", 105, 20, {align:"center"});
        doc.setTextColor(0); doc.setFontSize(11);
        if(v.foto) doc.addImage(v.foto, 'PNG', 160, 40, 35, 35);
        let y = 50;
        doc.text(`Empleado: ${v.paterno} ${v.materno}, ${v.nombres}`, 20, y); y+=10;
        doc.text(`C.I.: ${v.ci}`, 20, y); y+=10;
        doc.text(`Cargo: ${v.cargo}`, 20, y); y+=10;
        doc.text(`Puesto: ${v.puesto}`, 20, y); y+=10;
        doc.text(`Teléfono: ${v.telefono}`, 20, y); y+=20;
        doc.text("DOCUMENTACIÓN PRESENTADA:", 20, y); y+=10;
        Object.keys(v.docs || {}).forEach(k => {
            doc.text(`${v.docs[k] ? '[X]' : '[ ]'} ${k}`, 25, y); y+=7;
        });
        doc.save(`JHSE_${v.ci}.pdf`);
    };
}

function nuevoRegistro() {
    document.getElementById('hrForm').reset();
    document.getElementById('fotoPreview').style.display = "none";
    fotoCapturada = "";
}

function filtrarTabla() {
    const b = document.getElementById('buscador').value.toLowerCase();
    const rows = document.querySelectorAll("#dbBody tr");
    rows.forEach(r => r.style.display = r.innerText.toLowerCase().includes(b) ? "" : "none");
}