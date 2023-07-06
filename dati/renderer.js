var rapporti
var proclamatori

$(document).ready(async function () {
    navbar("dati")
    loadPage()
})

$(window).resize(function () {
    marginBody()
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
    rapporti = await window.electronAPI.readFile('rapporti')
    proclamatori = await window.electronAPI.readFile('anagrafica')

    $("#tabAnni").html('')
    mesi = [...new Set(rapporti.map(item => item.Mese))]
    mesi.sort()
    mesi.forEach(function (o, i) {
        m = Number(o.slice(5, 7))
        a = Number(o.slice(0, 4))
        if (m >= 9) {
            a++
        }
        mesi[i] = a
    })
    anni = [...new Set(mesi)]
    anni.forEach(function (anno) {
        $("#tabAnni").append(`
            <div class="input-group mb-3">
                <input type="text" class="form-control" placeholder="Dati anno ${anno}" readonly></input>
                <button class="btn btn-danger"
                    type="button"
                    id="${anno}"  
                    onclick="modalAvviso('${anno}')"
                >
                    <i class="bi bi-trash3"></i>
                </button>
            </div>
        `)
    })

    $("#tabProcElim").html('')
    eliminabili = proclamatori.filter(i => i.Elimina == '1')
    eliminabili.forEach(proc => {
        if (!rapporti.some(i => i.CE_Anag == proc.id)) {
            //console.log(proc.Nome)
            $("#tabProcElim").append(`
            <div class="input-group mb-3">
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

function modalAvviso(anno) {
    $(".modal-body span").html(`Sei sicuro di voler eliminare l'anno ${anno}?`)
    $("#ModalAvviso").modal("show")
    $("#buttonModal").on("click", function () { elimAnno(anno) })
}

async function elimAnno(anno) {
    $("#ModalAvviso").modal("hide")
    mesi = mesiAnnoTeocratico(anno)
    try {
        for (x = 0; x < 12; x++) {
            rapporti = rapporti.filter(rapporto => rapporto.Mese != mesi[x])
        }
        result = await window.electronAPI.writeFile('rapporti', rapporti)
    } catch (e) {
        loadPage()
        toast(new Date().getTime(), "rosso", e, 10000)
        return
    }
    toast(new Date().getTime(), "verde", `Dati anno ${anno} eliminati con successo`)
    loadPage()
}

async function elimProc(id) {
    let n = proclamatori.findIndex(i => i.id == id)
    let eliminato = proclamatori[n]
    proclamatori.splice(n, 1)
    try {
        result = await window.electronAPI.writeFile('anagrafica', proclamatori)
    } catch (e) {
        loadPage()
        toast(new Date().getTime(), "rosso", e, 10000)
        return
    }
    toast(new Date().getTime(), "verde", `${eliminato.Nome} è stato eliminato`)
    loadPage()
}