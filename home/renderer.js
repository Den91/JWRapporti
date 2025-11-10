var db
const oggi = new Date()

$(document).ready(async function () {
    navbar("home")
    db = await window.electronAPI.readFile('db')

    var unAnnoBattezzati = $.grep(db.anagrafica, function (p) {
        let d = new Date(p.D_Batt)
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
    mese.setMonth(oggi.getMonth() - 1)
    m = `${mese.toLocaleString('it-IT', {
        year: 'numeric'
    })}-${mese.toLocaleString('it-IT', {
        month: '2-digit'
    })}`
    for (let i = 0; i < db.anagrafica.length; i++) {
        if (!db.anagrafica[i].Eliminato && db.anagrafica[i].Attivo) {
            if (db.anagrafica[i].rapporti.findIndex(r => r.Mese == m ? true : false) == -1) {
                $('#divRapportiMancanti').removeClass('d-none')
                $('#divElenco').append(`<div class="col-2 py-1"><i class="bi bi-person-fill"></i> ${db.anagrafica[i].Nome}</div>`)
            }
        }
    }
}

function grafici() {
    let mesi = []
    let studi = []
    let presenti = []
    let nMesi = 18

    data = new Date()
    data.setMonth(data.getMonth() - nMesi)
    for (m = 0; m < nMesi; m++) {
        mese = `${data.toLocaleString('it-IT', { year: 'numeric' })}-${data.toLocaleString('it-IT', { month: '2-digit' })}`
        mesi.push(mese)

        //studi
        s = 0
        for (let i = 0; i < db.anagrafica.length; i++) {
            iRap = db.anagrafica[i].rapporti.findIndex(r => r.Mese == mese)
            if (iRap != -1) {
                s += db.anagrafica[i].rapporti[iRap].Studi
            }
        }
        studi.push(s)

        //presenti
        let t = c = 0
        i = db.presenti.findIndex(presenti => presenti.Mese == mese)
        if (i != -1) {
            for (x = 1; x < 6; x++) {
                if (db.presenti[i]['f' + x] > 0) {
                    t += Number(db.presenti[i]['f' + x])
                    c++
                }
            }
        }
        presenti.push(Number((t / c).toFixed(0)) || 0)

        data.setMonth(data.getMonth() + 1)
    }
    console.log(studi)
    console.log(presenti)
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
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
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
    new Chart(
        $('#canvasPresenti'),
        {
            type: 'line',
            data: {
                labels: mesi,
                datasets: [
                    {
                        label: 'Presenti',
                        data: presenti,
                        fill: false,
                        backgroundColor: 'rgba(255, 206, 86, 0.6)',
                        borderColor: 'rgba(255, 206, 86, 1)',
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