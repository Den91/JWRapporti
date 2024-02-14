var proclamatori
var rapporti
var presenti
const oggi = new Date()

$(window).resize(function () {
    marginBody()
})

$(document).ready(async function () {
    navbar("home")

    proclamatori = await window.electronAPI.readFile('anagrafica')
    proclamatori.sort(function (a, b) {
        if (a.Nome.toUpperCase() < b.Nome.toUpperCase())
            return -1
        if (a.Nome.toUpperCase() > b.Nome.toUpperCase())
            return 1
        return 0
    })

    rapporti = await window.electronAPI.readFile('rapporti')

    presenti = await window.electronAPI.readFile('presenti')
    presenti.sort(function (a, b) {
        if (a.Mese < b.Mese)
            return -1
        if (a.Mese > b.Mese)
            return 1
        return 0
    })

    var unAnnoBattezzati = $.grep(proclamatori, function (item) {
        let d = new Date(item.D_Batt)
        return d.getFullYear() + 1 == oggi.getFullYear() &&
            d.getMonth() == oggi.getMonth()
    })
    if (unAnnoBattezzati.length > 0) {
        $('#unAnnoBattezzati').removeClass('d-none')
        for (proc of unAnnoBattezzati) {
            $('#elencoBattezzati').append(`<div class="col-2 py-1">${proc.Nome}</div>`)
        }
    }
    avvisiRapporti()
    rapportiMancanti()
    grafici()
})

function avvisiRapporti() {
    if (oggi.getDate() == 20) {
        $('#alert').append(`
            <div class="alert alert-danger">
                Ultimo giorno per inviare i rapporti
            </div>`)
    }
    if (oggi.getDate() > 0 && oggi.getDate() < 20) {
        $('#alert').append(`
            <div class="alert alert-warning">
                Mancano ${20 - oggi.getDate()} giorni per inviare i rapporti
            </div>`)
    }
}

function rapportiMancanti() {
    $('#divRapportiMancanti').addClass('d-none')
    $('#divElenco').html(``)
    let mese = new Date()
    mese.setMonth(oggi.getMonth() - 1);
    for (proc of proclamatori) {
        if (proc.Elimina == "0" && proc.Attivo == "1") {
            m = `${mese.toLocaleString('it-IT', {
                year: 'numeric'
            })}-${mese.toLocaleString('it-IT', {
                month: '2-digit'
            })}`
            rapporti_mese = rapporti.filter(i => (i.Mese == m) && (i.CE_Anag == proc.id))
            if (rapporti_mese.length == 0) {
                $('#divRapportiMancanti').removeClass('d-none')
                $('#divElenco').append(`<div class="col-2 py-1"><i class="bi bi-person-fill"></i> ${proc.Nome}</div>`)
            }
        }
    }
}

function grafici() {
    let studi = []
    let presentiGrafico = []
    let anno = getAnnoTeocratico()
    let mesi = mesiAnnoTeocratico(anno)
    mesi.forEach(m => {
        rapporti_mese = rapporti.filter(item => item.Mese == m)
        if (rapporti_mese.length > 0) {
            studi.push(rapporti_mese.map(item => item.Studi).reduce((p, n) => p + n))
        }
    })
    new Chart(
        $('#canvasStudi'),
        {
            type: 'line',
            data: {
                labels: mesi,
                datasets: [
                    {
                        label: 'Studi',
                        data: studi,
                        fill: false,
                        borderColor: 'rgb(255, 205, 97)',
                    },
                ]
            },
            options: {
                scales: {
                    y: {
                        suggestedMin: 0
                    }
                }
            }
        }
    )
}