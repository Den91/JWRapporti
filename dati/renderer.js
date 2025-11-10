var db

$(document).ready(async function () {
    navbar("dati")
    loadPage()
})

async function xampp() {
    result = await window.electronAPI.importaFile()
    loadPage()
    toast(new Date().getTime(), result.succ ? "verde" : "rosso", result.msg)
}

async function loadBackup() {
    result = await window.electronAPI.loadBackup()
    loadPage()
    toast(new Date().getTime(), result.succ ? "verde" : "rosso", result.msg)
}

async function saveBackup() {
    result = await window.electronAPI.saveBackup()
    toast(new Date().getTime(), result.succ ? "verde" : "rosso", result.msg)
}

async function loadPage() {
    db = await window.electronAPI.readFile('db')
    $("#tabAnni").html('')
    anni = arrayAnniRapporti(db)
    anni.forEach(function (anno) {
        $("#tabAnni").append(`
            <div class="input-group mb-2">
                <input type="text" class="form-control" placeholder="Dati anno ${anno}" readonly></input>
                <button class="btn btn-danger"
                    type="button"
                    id="${anno}"  
                    onclick="modalAvvisoAnno('${anno}')"
                >
                    <i class="bi bi-trash3"></i>
                </button>
            </div>
        `)
    })

    $("#tabProcElim").html('')
    eliminabili = db.anagrafica.filter(i => i.Eliminato)
    eliminabili.forEach(proc => {
        if (proc.rapporti.length == 0) {
            //console.log(proc.Nome)
            $("#tabProcElim").append(`
            <div class="input-group mb-2">
                <input type="text" class="form-control" placeholder="${proc.Nome}" readonly></input>
                <button class="btn btn-danger"
                    type="button"
                    id="${proc.id}"  
                    onclick="elimProc('${proc.id}')"
                >
                    <i class="bi bi-trash3"></i>
                </button>
            </div>
        `)
        }
    })
}

function modalAvvisoAnno(anno) {
    modalAvviso(`Sei sicuro di voler eliminare l'anno ${anno}?`, `elimAnno(${anno})`)
}

async function elimAnno(anno) {
    $("#ModalAvviso").modal("hide")
    mesi = mesiAnnoTeocratico(anno)
    try {
        for (i = 0; i < db.anagrafica.length; i++) {
            for (x = 0; x < 12; x++) {
                db.anagrafica[i].rapporti = db.anagrafica[i].rapporti.filter(r => r.Mese != mesi[x])
            }
        }
        for (x = 0; x < 12; x++) {
            db.presenti = db.presenti.filter(i => i.Mese != mesi[x])
        }
        result = await window.electronAPI.writeFile('db', db)
    } catch (e) {
        loadPage()
        toast(new Date().getTime(), "rosso", e, 10000)
        return
    }
    toast(new Date().getTime(), "verde", `Dati anno ${anno} eliminati con successo`)
    loadPage()
}

async function elimProc(id) {
    let n = db.anagrafica.findIndex(i => i.id == id)
    let eliminato = db.anagrafica[n]
    try {
        db.anagrafica.splice(n, 1)
        result = await window.electronAPI.writeFile('db', db)
    } catch (e) {
        loadPage()
        toast(new Date().getTime(), "rosso", e, 10000)
        return
    }
    toast(new Date().getTime(), "verde", `${eliminato.Nome} è stato eliminato`)
    loadPage()
}