$(document).ready(async function () {
    navbar("home")

    let proclamatori = await window.electronAPI.getRows('anagrafica', { Attivo: '1', Elimina: '0' })
    proclamatori.sort(function (a, b) {
        if (a.Nome < b.Nome)
            return -1
        if (a.Nome > b.Nome)
            return 1
        return 0
    })
    const oggi = new Date()

    var unAnnoBattezzati = $.grep(proclamatori, function (item) {
        let d = new Date(item.D_Batt)
        return d.getFullYear() + 1 == oggi.getFullYear() &&
            d.getMonth() == oggi.getMonth()
    });
    if (unAnnoBattezzati.length > 0) {
        $('#unAnnoBattezzati').removeClass('d-none')
        for (proc of unAnnoBattezzati) {
            $('#elencoBattezzati').append(`<div class="col-2 py-1">${proc.Nome}</div>`)
        }
    }

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

    $('#divRapportiMancanti').addClass('d-none')
    $('#divElenco').html(``)
    let mese = new Date()
    mese.setMonth(oggi.getMonth() - 1);
    for (proc of proclamatori) {
        rap = await window.electronAPI.getRows('rapporti', {
            Mese: `${mese.toLocaleString('it-IT', {
                year: 'numeric'
            })}-${mese.toLocaleString('it-IT', {
                month: '2-digit'
            })}`, CE_Anag: proc.id
        })
        if (rap.length == 0) {
            $('#divRapportiMancanti').removeClass('d-none')
            $('#divElenco').append(`<div class="col-2 py-1"><i class="bi bi-person-fill"></i> ${proc.Nome}</div>`)
        }
    }

    /*
    let mese = new Date()
    mese.setMonth(oggi.getMonth() - 1);
    rap = await window.electronAPI.getRows('rapporti', {
        Mese: `${mese.toLocaleString('it-IT', {
            year: 'numeric'
        })}-${mese.toLocaleString('it-IT', {
            month: '2-digit'
        })}`
    })
    const difference = proclamatori.filter(({ id: id1 }) => !rap.some(({ id: id2 }) => id2 === id1));
    console.log(difference)
    */

    let ore = []
    let pubb = []
    let video = []
    let vu = []
    let studi = []
    let mesi = []
    var keys = ['Pubb', 'Video', 'Ore', 'VU', 'Studi']
    mese = oggi
    mese.setFullYear(mese.getFullYear() - 1);
    for (let x = 0; x < 12; x++) {
        let m = `${mese.toLocaleString('it-IT', {
            year: 'numeric'
        })}-${mese.toLocaleString('it-IT', {
            month: '2-digit'
        })}`
        mesi.push(mese.toLocaleString('it-IT', {
            year: '2-digit',
            month: 'short'
        }))
        let d = await window.electronAPI.sum('rapporti',
            {
                'Mese': m,
            }, keys)
        ore.push(d.Ore)
        pubb.push(d.Pubb)
        video.push(d.Video)
        vu.push(d.VU)
        studi.push(d.Studi)
        mese.setMonth(mese.getMonth() + 1);
    }
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
        }
    })
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
        }
    })
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
        }
    })
})

$(window).resize(function () {
    marginBody()
})