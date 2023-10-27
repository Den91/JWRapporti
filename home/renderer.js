var proclamatori
var rapporti
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

function grafici() {
    let ore = []
    let pubb = []
    let video = []
    let vu = []
    let studi = []
    let anno = getAnnoTeocratico()
    let mesi = mesiAnnoTeocratico(anno)
    mesi.forEach(m => {
        rapporti_mese = rapporti.filter(item => item.Mese == m)
        if (rapporti_mese.length > 0) {
            ore.push(rapporti_mese.map(item => item.Ore).reduce((p, n) => p + n))
            pubb.push(rapporti_mese.map(item => item.Pubb).reduce((p, n) => p + n))
            video.push(rapporti_mese.map(item => item.Video).reduce((p, n) => p + n))
            vu.push(rapporti_mese.map(item => item.VU).reduce((p, n) => p + n))
            studi.push(rapporti_mese.map(item => item.Studi).reduce((p, n) => p + n))
        }
    })
    /*
    const canvas0 = new Chart($('#canvas0'), {
        type: 'line',
        data: {
            labels: mesi,
            datasets: [
                {
                    label: 'Ore',
                    data: ore,
                    fill: false,
                    borderColor: 'rgb(254, 100, 132)',
                    tension: 0
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
    })
    const canvas1 = new Chart($('#canvas1'), {
        type: 'line',
        data: {
            labels: mesi,
            datasets: [
                {
                    label: 'Visite',
                    data: vu,
                    fill: false,
                    borderColor: 'rgb(56, 162, 232)',
                    tension: 0
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
    })
    */
    const canvas2 = new Chart($('#canvas2'), {
        type: 'line',
        data: {
            labels: mesi,
            datasets: [
                {
                    label: 'Studi',
                    data: studi,
                    fill: false,
                    borderColor: 'rgb(255, 205, 97)',
                    tension: 0
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
    })
    /*
    const canvas3 = new Chart($('#canvas3'), {
        type: 'line',
        data: {
            labels: mesi,
            datasets: [
                {
                    label: 'Pubblicazioni',
                    data: pubb,
                    fill: false,
                    borderColor: 'rgb(78, 192, 191)',
                    tension: 0
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
    })
    const canvas4 = new Chart($('#canvas4'), {
        type: 'line',
        data: {
            labels: mesi,
            datasets: [
                {
                    label: 'Video',
                    data: video,
                    fill: false,
                    borderColor: 'rgb(152, 103, 250)',
                    tension: 0
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
    })
    */
}