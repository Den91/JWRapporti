const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const FPDF = require('node-fpdf')
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const Chart = require('chart.js')
//const PDFWindowModule = require('electron-pdf-window')
let updateWindow, mainWindow

const tabelle = ['anagrafica', 'gruppi', 'rapporti', 'presenti', 'sorvegliante']
let db
var pack = null
try {
    pack = require('./package.json')
} catch (e) {
    console.log("File non trovato")
}
const platform = os.platform();
var appName = ''
if (pack !== null) {
    appName = (pack.productName ? pack.productName : pack.name);
}
let userData = '';
if (platform === 'win32') {
    userData = path.join(process.env.APPDATA, appName);
} else if (platform === 'darwin') {
    userData = path.join(process.env.HOME, 'Library', 'Application Support', appName);
} else {
    userData = path.join('var', 'local', appName);
}

app.whenReady().then(() => {
    loadDB()
    //creaTabelle()
    //ottimizzaTabelle()
    ipcMain.handle('login', login)
    ipcMain.handle('readFile', readFile)
    ipcMain.handle('writeFile', writeFile)
    ipcMain.handle('loadBackup', loadBackup)
    ipcMain.handle('saveBackup', saveBackup)
    ipcMain.handle('fpdfAnagrafica', fpdfAnagrafica)
    ipcMain.handle('fpdfS21Singola', fpdfS21Singola)
    ipcMain.handle('fpdfS21Tutte', fpdfS21Tutte)
    ipcMain.handle('fpdfS88', fpdfS88)
    ipcMain.handle('fpdfRapporti', fpdfRapporti)
    ipcMain.on('closeModalWindow', closeModalWindow)
    ipcMain.handle('openBrowserUpdate', openBrowserUpdate)

    mainWindow = new BrowserWindow({
        icon: '/images/icon.png',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    })
    mainWindow.setTitle("JW Rapporti " + pack.version)
    mainWindow.maximize()
    if (app.isPackaged) {
        mainWindow.loadFile('./login/index.html')
        if (platform === 'win32') {
            autoUpdater.checkForUpdates()
        } else if (platform === 'darwin') {
            updateMacos()
        }
    } else {
        mainWindow.loadFile('./home/index.html')
    }
    //controllaRapportiDoppi()
})

autoUpdater.on('checking-for-update', () => {
    //log.info("Checking for update.")
})
autoUpdater.on('update-available', (info) => {
    updateWindow = new BrowserWindow({
        parent: mainWindow,
        width: 600,
        height: 300,
        modal: true,
        show: true,
        closable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    })
    updateWindow.loadFile('./update/index.html')
    updateWindow.webContents.send('update',
        {
            state: 'available',
        }
    )
    updateWindow.once('ready-to-show', () => {
        updateWindow.show()
    })
    //log.info('Update available.');
})
autoUpdater.on('update-not-available', (info) => {
    //log.info('Update not available.');
})
autoUpdater.on('error', (err) => {
    //log.info('Error in auto-updater. ' + err);
    updateWindow.webContents.send('update',
        {
            state: 'error',
            error: err,
        }
    )
    updateWindow.closable = true;
})
autoUpdater.on('download-progress', (progress) => {
    /*
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    */
    updateWindow.webContents.send('update',
        {
            state: 'progress',
            progress: progress,
        }
    )
})
autoUpdater.on('update-downloaded', (info) => {
    //log.info('Update downloaded');
    updateWindow.webContents.send('update', { state: 'downloaded', })
    updateWindow.closable = true;
})
function updateMacos() {
    fetch("https://api.github.com/repos/Den91/JWRapporti/tags")
        .then(res => res.json())
        .then(latest => {
            updateVersion = latest[0].name.slice(1)
            packVersion = pack.version
            compare = updateVersion.localeCompare(packVersion, undefined, { numeric: true, sensitivity: 'base' })
            if (compare == 1) {
                updateWindow = new BrowserWindow({
                    parent: mainWindow,
                    width: 600,
                    height: 300,
                    modal: true,
                    show: true,
                    closable: true,
                    webPreferences: {
                        preload: path.join(__dirname, 'preload.js'),
                    },
                })
                updateWindow.loadFile('./update/index.html')
                updateWindow.once('ready-to-show', () => {
                    updateWindow.webContents.send('update',
                        {
                            state: 'mac-update',
                            link: `https://github.com/Den91/JWRapporti/releases/latest/download/jwrapporti-${updateVersion}.dmg`,
                        }
                    )
                    updateWindow.show()
                })
            }
        })
        .catch(err => { throw err })
}
function closeModalWindow() {
    updateWindow.close()
}
function openBrowserUpdate(event, url) {
    shell.openExternal(url)
}

function login(event, username, password) {
    if (username.toUpperCase() == "SEGRETARIO" && password == "Rapporti1914")
        return true
    else
        return false
}

async function controllaRapportiDoppi() {
    proclamatori = await readFile(null, 'anagrafica')
    rapporti = await readFile(null, 'rapporti')
    rapporti_doppi = []
    mesi = [...new Set(rapporti.map(item => item.Mese))]
    mesi.sort()
    for (let mese of mesi) {
        for (let proc of proclamatori) {
            rapporto = rapporti.filter(i => (i.Mese == mese) && (i.CE_Anag == proc.id))
            if (rapporto.length > 1) {
                rapporto[0].Nome = proc.Nome
                rapporti_doppi.push(rapporto[0])
            }
        }
    }
    if (rapporti_doppi.length > 0) {
        msg = ''
        for (let rap of rapporti_doppi) {
            let data = new Date(rap.Mese)
            msg += `${data.toLocaleString('it-IT', {
                month: 'long',
                year: 'numeric',
            })} - ${rap.Nome}
            `
        }
        const response = dialog.showMessageBox(mainWindow,
            {
                message: `Attenzione! I seguenti rapporti sono doppi. 
                    È necessario cancellarli manualmente.
                    
                    ${msg}`,
                type: 'warning',
            })
    }
}

function creaTabelle() {
    tabelle.forEach(function (tabella) {
        fname = path.join(userData, tabella + '.json');
        let exists = fs.existsSync(fname);
        if (!exists) {
            let obj = new Object()
            obj[tabella] = []
            try {
                fs.writeFileSync(fname, JSON.stringify(obj, null, 2), (err) => {
                    throw err
                })
            } catch (e) {
                console.log("Errore creazione file tabella" + e)
                return
            }
        }
    })
}

async function ottimizzaTabelle() {
    rapporti = await readFile(null, 'rapporti')
    anagrafica = await readFile(null, 'anagrafica')
    rapporti.forEach(rapporto => {
        if (rapporto.hasOwnProperty('CP_Rap')) {
            delete rapporto.CP_Rap
        }
        if (!rapporto.hasOwnProperty('Gr')) {
            proc = anagrafica.filter(item => item.id == rapporto.CE_Anag)
            rapporto.Gr = proc[0].Gr
        } else {
            if (rapporto.Gr == "") {
                rapporto.Gr = null
            }
        }
    })
    try {
        result = await writeFile(null, 'rapporti', rapporti)
        //result = await writeFile(null, 'anagrafica', anagrafica)
    } catch (e) {
        return
    }
}

async function loadDB() {
    let exists = fs.existsSync(path.join(userData, 'db.json'))
    if (exists) {
        db = await readFile(null, 'db')
    } else {
        db = new Object()
        db.version = 1
        db.gruppi = []
        db.sorvegliante = []
        db.presenti = []
        db.anagrafica = []
        if (fs.existsSync(path.join(userData, 'gruppi.json'))) {
            db.gruppi = await readFile(null, 'gruppi')
            fs.unlink(path.join(userData, 'gruppi.json'), function (err) {
                if (err) return console.log(err);
            })
        }
        if (fs.existsSync(path.join(userData, 'sorvegliante.json'))) {
            db.sorvegliante = await readFile(null, 'sorvegliante')
            fs.unlink(path.join(userData, 'sorvegliante.json'), function (err) {
                if (err) return console.log(err);
            })
        }
        if (fs.existsSync(path.join(userData, 'presenti.json'))) {
            db.presenti = await readFile(null, 'presenti')
            fs.unlink(path.join(userData, 'presenti.json'), function (err) {
                if (err) return console.log(err);
            })
        }
        if (fs.existsSync(path.join(userData, 'anagrafica.json'))) {
            db.anagrafica = await readFile(null, 'anagrafica')
            for (let i = 0; i < db.anagrafica.length; i++) {
                if (db.anagrafica[i].Elimina == '0') {
                    db.anagrafica[i].Eliminato = false
                    delete db.anagrafica[i].Elimina
                }
                if (db.anagrafica[i].Elimina == '1') {
                    db.anagrafica[i].Eliminato = true
                    delete db.anagrafica[i].Elimina
                }
                if (db.anagrafica[i].Attivo == '0') {
                    db.anagrafica[i].Attivo = false
                }
                if (db.anagrafica[i].Attivo == '1') {
                    db.anagrafica[i].Attivo = true
                }
                delete db.anagrafica[i].CP_Anag
                db.anagrafica[i].rapporti = []
            }
            fs.unlink(path.join(userData, 'anagrafica.json'), function (err) {
                if (err) return console.log(err);
            })
        }
        if (fs.existsSync(path.join(userData, 'rapporti.json'))) {
            r = await readFile(null, 'rapporti')
            for (let i = 0; i < r.length; i++) {
                let obj = db.anagrafica.find((anagrafica, indice) => {
                    if (anagrafica.id == r[i].CE_Anag) {
                        db.anagrafica[indice].rapporti.push(r[i])
                        return true; // stop searching
                    }
                });
            }
            db.anagrafica.forEach(p => {
                p.rapporti.sort((a, b) => {
                    return a.Mese < b.Mese ? -1 : 1;
                })
            })
            fs.unlink(path.join(userData, 'rapporti.json'), function (err) {
                if (err) return console.log(err);
            })
        }
        try {
            result = await writeFile(null, 'db', db)
        } catch (e) {
            console.log(e)
        }
    }
}

async function loadBackupOld() {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        filters: [
            { name: 'Backup', extensions: ['json'] },
        ]
    })
    if (canceled) {
        return
    } else {
        for (tabella of tabelle) {
            fs.copyFile(path.join(userData, tabella + '.json'), path.join(userData, tabella + '.tmp'), (err) => {
                if (err) throw err;
            })
        }
        let dati = JSON.parse(fs.readFileSync(filePaths[0]))
        try {
            for (tabella of tabelle) {
                //console.log(dati[tabella])
                fs.writeFileSync(path.join(userData, tabella + '.json'),
                    JSON.stringify({ [tabella]: dati[tabella] }, null, 2), (err) => {
                        throw err;
                    })
            }
            for (tabella of tabelle) {
                fs.unlink(path.join(userData, tabella + '.tmp'), function (err) {
                    if (err) return console.log(err);
                })
            }
            ottimizzaTabelle()
            return { succ: true, msg: 'Dati importati con successo' }
        } catch (err) {
            for (tabella of tabelle) {
                fs.unlink(path.join(userData, tabella + '.json'), function (err) {
                    if (err) return console.log(err);
                    console.log('file deleted successfully');
                })
                fs.rename(path.join(userData, tabella + '.tmp'), path.join(userData, tabella + '.json'), function (err) {
                    if (err) console.log('ERROR: ' + err);
                });
            }
            return { succ: false, msg: err }
        }
    }
}

async function saveBackupOld() {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (canceled) {
        return
    } else {
        let backup = {}
        for (tabella of tabelle) {
            backup[tabella] = JSON.parse(fs.readFileSync(path.join(userData, tabella + '.json')))[tabella]
        }
        try {
            d = new Date()
            nomeFile = 'backup_' +
                d.getFullYear() + '-' +
                ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
                ('0' + d.getDate()).slice(-2) + '-' +
                d.getHours() + '-' +
                d.getMinutes() + '.json'
            fs.writeFileSync(path.join(filePaths[0], nomeFile),
                JSON.stringify(backup, null, 2), (err) => {
                    log.info(err)
                    throw err;
                })
            return { succ: true, msg: 'Backup effettuato' }
        } catch (err) {
            console.log(err)
            return { succ: false, msg: err }
        }
    }
}

async function loadBackup() {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        filters: [
            { name: 'Backup', extensions: ['json'] },
        ]
    })
    if (canceled) {
        return
    } else {
        let backup = JSON.parse(fs.readFileSync(filePaths[0]))
        if (!backup.version) {
            console.log("Versione 0")
            db = new Object()
            db.version = 1
            db.gruppi = backup.gruppi
            db.sorvegliante = backup.sorvegliante
            db.presenti = backup.presenti
            db.anagrafica = backup.anagrafica
            db.anagrafica.forEach(p => {
                p.rapporti = []
            })
            for (let i = 0; i < backup.rapporti.length; i++) {
                let obj = db.anagrafica.find((anagrafica, indice) => {
                    if (anagrafica.id == backup.rapporti[i].CE_Anag) {
                        db.anagrafica[indice].rapporti.push(backup.rapporti[i])
                        return true; // stop searching
                    }
                })
            }
        }
        if (backup.version == 1) {
            console.log("Versione 1")
            db = backup
        }
        try {
            result = await writeFile(null, 'db', db)
            return { succ: true, msg: 'Dati importati con successo' }
        } catch (err) {
            return { succ: false, msg: err }
        }
    }
}

async function saveBackup() {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (canceled) {
        return
    } else {
        db = await readFile(null, 'db')
        try {
            d = new Date()
            nomeFile = 'backup_' +
                d.getFullYear() + '-' +
                ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
                ('0' + d.getDate()).slice(-2) + '-' +
                d.getHours() + '-' +
                d.getMinutes() + '.json'
            fs.writeFileSync(path.join(filePaths[0], nomeFile),
                JSON.stringify(db, null, 2), (err) => {
                    log.info(err)
                    throw err;
                })
            return { succ: true, msg: 'Backup effettuato' }
        } catch (err) {
            console.log(err)
            return { succ: false, msg: err }
        }
    }
}

async function readFile(event, tableName) {
    let fname = path.join(userData, tableName + '.json')
    let exists = fs.existsSync(fname)

    if (exists) {
        try {
            let table = JSON.parse(fs.readFileSync(fname))
            return table[tableName]
        } catch (e) {
            return []
        }
    } else {
        throw [1, 'Table file does not exist!']
    }
}

async function writeFile(event, tableName, tableObject) {
    let fname = path.join(userData, tableName + '.json')
    try {
        let obj = new Object();
        obj[tableName] = tableObject
        fs.writeFileSync(fname, JSON.stringify(obj, null, 2), (err) => {
            throw err
        })
        return "File write"
    } catch (e) {
        throw e
    }
}

function unescapeHtml(safe) {
    return safe
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
}

function mesiAnnoTeocratico(anno) {
    let mesi = []
    let mese = new Date((Number(anno) - 1) + "-09")
    for (let x = 0; x < 12; x++) {
        mesi.push(`${mese.toLocaleString('it-IT', {
            year: 'numeric'
        })}-${mese.toLocaleString('it-IT', {
            month: '2-digit'
        })}`)
        mese.setMonth(mese.getMonth() + 1);
    }
    return mesi
}

async function fpdfAnagrafica() {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (canceled) {
        return
    } else {
        const pdf = new FPDF('P', 'mm', 'A4');
        pdf.SetTextColor(0, 0, 0);
        pdf.SetAutoPageBreak(1, 3);

        pdf.SetMargins(3, 3);
        pdf.SetY(3);

        border = 1;
        row = 4.2;

        db = await readFile(null, 'db')
        db.gruppi.sort(function (a, b) {
            return a.Num - b.Num
        })

        for (gruppo of db.gruppi) {
            pdf.AddPage();
            pdf.SetFont('Arial', '', 12);
            pdf.Cell(204, row + 1, `Gruppo N.${gruppo["Num"]} ${gruppo["Sorv_Gr"]}`, border, 1, 'C');
            pdf.SetFont('Arial', '', 10);
            if (db.sorvegliante[0] != null) {
                pdf.Cell(68, row, "Sorvegliante: " + unescapeHtml(db.sorvegliante[0].Nome_CO), border, 0, 'C');
                pdf.Cell(68, row, "Cellulare: " + db.sorvegliante[0].Cel_CO, border, 0, 'C');
                pdf.Cell(68, row, "Email: " + db.sorvegliante[0].Email_CO, border, 0, 'C');
                pdf.Ln(row + 1);
            }
            c = 1;
            proclamatori = db.anagrafica.filter(item => ((item.Gr == gruppo.id) && (!item.Eliminato)))

            proclamatori.sort(function (a, b) {
                if (a.Nome < b.Nome)
                    return -1
                if (a.Nome > b.Nome)
                    return 1
                return 0
            })
            for (proc of proclamatori) {
                if (c % 2 != 0) {
                    pdf.SetFillColor(200, 200, 200);
                } else {
                    pdf.SetFillColor(255, 255, 255);
                }
                pdf.SetDrawColor(0, 0, 0);
                pdf.SetTextColor(0, 0, 0);
                c1 = 6;
                c2 = 55;
                c3 = 45;
                c4 = 30;
                c5 = 204 - c1 - c2 - c3 - c4;
                pdf.Cell(c1, row * 3, c, border, 0, 'C', true);
                nome = proc["Nome"];
                if (proc["Nome2"] != "") {
                    nome += ' (' + proc["Nome2"] + ')';
                }
                pdf.Cell(c2, row * 3, unescapeHtml(nome), border, 0, 'L', true);
                var optionData = { day: 'numeric', month: 'numeric', year: 'numeric' }
                if (proc["D_Nasc"] != "") {
                    var D_Nasc = new Date(proc["D_Nasc"]);
                    pdf.Cell(c3, row, "Data nascita: " + D_Nasc.toLocaleString('it-IT', optionData), border, 0, 'L', true);
                } else {
                    pdf.Cell(c3, row, "Data nascita:", border, 0, 'L', true);
                }
                x = pdf.GetX();
                y = pdf.GetY();
                pdf.Ln(row);
                pdf.Cell(c1 + c2, row, "", 0, 0, 'L', false);
                if (proc["D_Batt"] != "") {
                    var D_Batt = new Date(proc["D_Batt"]);
                    pdf.Cell(c3, row, "Data battesimo: " + D_Batt.toLocaleString('it-IT', optionData), border, 0, 'L', true);
                } else {
                    pdf.Cell(c3, row, "Data battesimo:", border, 0, 'L', true);
                }
                pdf.SetXY(x, y);

                pdf.Cell(c4, row, "Cel: " + proc["Cel"], border, 0, 'L', true);
                x = pdf.GetX();
                y = pdf.GetY();
                pdf.Ln(row);
                pdf.Cell(c1 + c2 + c3, row, '', 0, 0, 'L', false);
                pdf.Cell(c4, row, "Tel: " + proc["Tel"], border, 0, 'L', true);
                pdf.SetXY(x, y);

                pdf.Cell(c5, row, "Email: " + proc["Email"], border, 0, 'L', true);
                x = pdf.GetX();
                y = pdf.GetY();
                pdf.Ln(row);
                pdf.Cell(c1 + c2 + c3 + c4, row, "", 0, 0, 'L', false);
                pdf.Cell(c5, row, unescapeHtml(proc["Emerg"]), border, 0, 'L', true);
                pdf.Ln(row);
                pdf.Cell(c1 + c2, row, '', 0, 0, 'L', false);
                pdf.Cell(204 - c1 - c2, row, "Ind: " + proc["Ind"], border, 0, 'L', true);
                pdf.Ln(row);
                c++;
            }
        }
        try {
            pdf.Output('F', path.join(filePaths[0], 'anagrafica.pdf'))
            return { succ: true, msg: "File creato" }
        } catch (e) {
            return { succ: false, msg: 'Errore: ' + e }
        }
    }
}

async function fpdfRapporti(event, mese) {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (canceled) {
        return
    } else {
        db = await readFile(null, 'db')
        var keys = ['Ore', 'Studi']
        const pdf = new FPDF('P', 'mm', 'A4');
        pdf.SetTextColor(0, 0, 0);
        pdf.SetAutoPageBreak(1, 3);
        pdf.SetMargins(3, 3);
        pdf.SetY(3);
        pdf.AddPage();

        border = 1;
        row = 4.6;

        mese_date = new Date(mese)
        pdf.SetFont('Arial', 'B', 12);
        pdf.Cell(204, row + 2,
            "Rapporti " + mese_date.toLocaleString('it-IT', { month: 'long', year: 'numeric' }), border, 0, 'C');
        pdf.Ln(row + 2);
        pdf.SetFont('Arial', 'B', 10);
        c0 = 7
        c1 = 48 + 16;
        c2 = 16;
        c5 = 16;
        c7 = 16;
        c8 = 53 + 16 + 16;
        pdf.Cell(c0, row, '#', border, 0, 'C');
        pdf.Cell(c1, row, 'Nome proclamatore', border, 0, 'L');
        pdf.Cell(c2, row, 'Inc', border, 0, 'C');
        pdf.Cell(c5, row, 'Ore', border, 0, 'C');
        pdf.Cell(c7, row, 'Studi', border, 0, 'C');
        pdf.Cell(c8, row, 'Note', border, 0, 'L');
        pdf.Ln(row);

        pdf.SetFont('Arial', '', 10);
        x = 1;
        totP = { N: 0, Ore: 0, Studi: 0 }
        totPA = { N: 0, Ore: 0, Studi: 0 }
        totPR = { N: 0, Ore: 0, Studi: 0 }
        ir = 0

        for (proc of db.anagrafica) {
            rapporto = proc.rapporti.find(item => item.Mese == mese)
            if (rapporto) {
                if (x % 2 != 0) {
                    pdf.SetFillColor(200, 200, 200);
                } else {
                    pdf.SetFillColor(255, 255, 255);
                }
                pdf.Cell(c0, row, x, border, 0, 'C', true);
                pdf.Cell(c1, row, unescapeHtml(proc['Nome']), border, 0, 'L', true);
                pdf.Cell(c2, row, rapporto['Inc'], border, 0, 'C', true);
                pdf.Cell(c5, row, rapporto['Ore'] ? rapporto['Ore'] : '', border, 0, 'C', true);
                pdf.Cell(c7, row, rapporto['Studi'] ? rapporto['Studi'] : '', border, 0, 'C', true);
                pdf.Cell(c8, row, rapporto['Note'] ? unescapeHtml(rapporto['Note']) : '', border, 0, 'L', true);
                pdf.Ln(row);
                x++;
                if (rapporto['Inc'] == 'p') {
                    totP['N']++
                    totP['Studi'] += Number(rapporto['Studi'])
                }
                if (rapporto['Inc'] == 'pa') {
                    totPA['N']++
                    for (key of keys) {
                        totPA[key] += Number(rapporto[key])
                    }
                }
                if (rapporto['Inc'] == 'pr') {
                    totPR['N']++
                    for (key of keys) {
                        totPR[key] += Number(rapporto[key])
                    }
                }
                if (rapporto['Inc'] == 'ir') {
                    ir++
                }
            }
        }

        pdf.Ln(10);
        pdf.SetFillColor(255, 255, 255);
        row = 6;

        pdf.Cell(20, row, "", 0, 0, 'L', true);
        pdf.Cell(c1, row, "Incarico", border, 0, 'L', true);
        pdf.Cell(c2, row, "N.", border, 0, 'C', true);
        pdf.Cell(c5, row, "Ore", border, 0, 'C', true);
        pdf.Cell(c7, row, "Studi", border, 0, 'C', true);
        pdf.Ln(row);

        pdf.Cell(20, row, "", 0, 0, 'L', true);
        pdf.Cell(c1, row, 'Proclamatori', border, 0, 'L', true);
        pdf.Cell(c2, row, totP['N'], border, 0, 'C', true);
        pdf.Cell(c2, row, '', border, 0, 'C', true);
        pdf.Cell(c2, row, totP['Studi'], border, 0, 'C', true);
        pdf.Ln(row);

        pdf.Cell(20, row, "", 0, 0, 'L', true);
        pdf.Cell(c1, row, 'Pionieri ausiliari', border, 0, 'L', true);
        pdf.Cell(c2, row, totPA['N'], border, 0, 'C', true);
        for (key of keys) {
            pdf.Cell(c2, row, totPA[key], border, 0, 'C', true);
        }
        pdf.Ln(row);

        pdf.Cell(20, row, "", 0, 0, 'L', true);
        pdf.Cell(c1, row, 'Pionieri regolari', border, 0, 'L', true);
        pdf.Cell(c2, row, totPR['N'], border, 0, 'C', true);
        for (key of keys) {
            pdf.Cell(c2, row, totPR[key], border, 0, 'C', true);
        }
        pdf.Ln(row);

        pdf.Cell(20, row, "", 0, 0, 'L', true);
        pdf.Cell(c1, row, "Totale rapporti", border, 0, 'L', true);
        pdf.Cell(c2, row, totP['N'] + totPA['N'] + totPR['N'], border, 0, 'C', true);
        for (key of keys) {
            pdf.Cell(c2, row, totP[key] + totPA[key] + totPR[key], border, 0, 'C', true);
        }
        pdf.Ln(row);

        pdf.Cell(20, row, "", 0, 0, 'L', true);
        pdf.Cell(c1, row, 'Irregolari', border, 0, 'L', true);
        pdf.Cell(c2, row, ir, border, 0, 'C', true);
        pdf.Ln(row);
        try {
            pdf.Output('F', path.join(filePaths[0],
                `rapporti ${mese_date.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}.pdf`))
            return { succ: true, msg: "File creato" }
        } catch (e) {
            return { succ: false, msg: 'Errore: ' + e }
        }
    }
}

async function cartolinaFPDF(pdf, proc, cartolina, link_pdf, link_first_page = null) {
    if (link_pdf != null) {
        pdf.SetLink(link_pdf);
    }

    pdf.SetFont('Arial', 'B', 10);
    pdf.Cell(187, 10, "REGISTRAZIONE DEL PROCLAMATORE DI CONGREGAZIONE", 0, 0, 'C');
    if (link_first_page != null) {
        pdf.SetFont('ZapfDingbats', '', 11);
        pdf.Cell(10, 10, "s", 0, 0, 'C', false, 1);
    }
    pdf.Ln(10);

    //Intestazione
    if (isNaN(proc.id)) {
        pdf.SetFont('Arial', '', 11);
        pdf.Cell(130, 8, "Cognome e Nome:  " + proc["Nome"], 0, 0, 'L');
        pdf.Ln(24)
    } else {
        pdf.SetFont('Arial', '', 11);
        let nome = "Cognome e Nome:  " + proc["Nome"];
        if (proc["Nome2"] != "") {
            nome += ' (' + proc["Nome2"] + ')';
        }
        pdf.Cell(130, 8, unescapeHtml(nome), 0, 0, 'L');
        let check
        if (proc["S"] == "M") {
            check = "4";
        } else {
            check = "";
        }
        pdf.SetFont('ZapfDingbats', '', 11);
        let x = pdf.GetX();
        let y = pdf.GetY();
        pdf.SetXY(x, y + 2);
        pdf.Cell(4, 4, check, 1, 0);

        x = pdf.GetX();
        pdf.SetXY(x, y);
        pdf.SetFont('Arial', '', 11);
        pdf.Cell(25, 8, " Maschio", 0, 0, 'L');

        if (proc["S"] == "F") {
            check = "4";
        } else {
            check = "";
        }
        pdf.SetFont('ZapfDingbats', '', 11);
        x = pdf.GetX();
        y = pdf.GetY();
        pdf.SetXY(x, y + 2);
        pdf.Cell(4, 4, check, 1, 0);

        x = pdf.GetX();
        pdf.SetXY(x, y);
        pdf.SetFont('Arial', '', 11);
        pdf.Cell(25, 8, " Femmina", 0, 0, 'L');
        pdf.Ln(8);

        if (proc["D_Nasc"] != "") {
            var D_Nasc = new Date(proc["D_Nasc"]);
            pdf.Cell(130, 8, "Data nascita: " +
                D_Nasc.toLocaleString("it-IT", { day: "numeric", month: 'long', year: 'numeric' }), 0, 0, 'L');
        } else {
            pdf.Cell(130, 8, "Data nascita:", 0, 0, 'L');
        }

        if (proc["U_AP"] == "U") {
            check = "4";
        } else {
            check = "";
        }
        pdf.SetFont('ZapfDingbats', '', 11);
        x = pdf.GetX();
        y = pdf.GetY();
        pdf.SetXY(x, y + 2);
        pdf.Cell(4, 4, check, 1, 0);

        x = pdf.GetX();
        pdf.SetXY(x, y);
        pdf.SetFont('Arial', '', 11);
        pdf.Cell(25, 8, " Unto", 0, 0, 'L');

        if (proc["U_AP"] == "P") {
            check = "4";
        } else {
            check = "";
        }
        pdf.SetFont('ZapfDingbats', '', 11);
        x = pdf.GetX();
        y = pdf.GetY();
        pdf.SetXY(x, y + 2);
        pdf.Cell(4, 4, check, 1, 0);

        x = pdf.GetX();
        pdf.SetXY(x, y);
        pdf.SetFont('Arial', '', 11);
        pdf.Cell(25, 8, " Altre pecore", 0, 0, 'L');
        pdf.Ln(8);

        if (proc["D_Batt"] != "") {
            var D_Batt = new Date(proc["D_Batt"]);
            pdf.Cell(85, 8, "Data di immersione: " +
                D_Batt.toLocaleString("it-IT", { day: "numeric", month: 'long', year: 'numeric' }), 0, 0, 'L');
        } else {
            pdf.Cell(85, 8, "Data di immersione:", 0, 0, 'L');
        }

        if (proc["SM_AN"] == "AN") {
            check = "4";
        } else {
            check = "";
        }
        pdf.SetFont('ZapfDingbats', '', 11);
        x = pdf.GetX();
        y = pdf.GetY();
        pdf.SetXY(x, y + 2);
        pdf.Cell(4, 4, check, 1, 0);

        x = pdf.GetX();
        pdf.SetXY(x, y);
        pdf.SetFont('Arial', '', 11);
        pdf.Cell(25, 8, " Anziano", 0, 0, 'L');

        if (proc["SM_AN"] == "SM") {
            check = "4";
        } else {
            check = "";
        }
        pdf.SetFont('ZapfDingbats', '', 11);
        x = pdf.GetX();
        y = pdf.GetY();
        pdf.SetXY(x, y + 2);
        pdf.Cell(4, 4, check, 1, 0);

        x = pdf.GetX();
        pdf.SetXY(x, y);
        pdf.SetFont('Arial', '', 11);
        pdf.Cell(35, 8, " Servitore di m.", 0, 0, 'L');

        if (proc["PR_PS"] == "PR") {
            check = "4";
        } else {
            check = "";
        }
        pdf.SetFont('ZapfDingbats', '', 11);
        x = pdf.GetX();
        y = pdf.GetY();
        pdf.SetXY(x, y + 2);
        pdf.Cell(4, 4, check, 1, 0);

        x = pdf.GetX();
        pdf.SetXY(x, y);
        pdf.SetFont('Arial', '', 11);
        pdf.Cell(25, 8, " Pioniere regolare", 0, 0, 'L');
        pdf.Ln(8);
    }

    var c1 = 45
    var c24 = 25
    var c5 = 70
    //tabella
    pdf.Cell(c1, 7, "Mese", 1, 0, 'C');
    if (isNaN(proc.id)) {
        pdf.Cell(c24, 7, "N", 1, 0, 'C');
    } else {
        pdf.Cell(c24, 7, "Inc", 1, 0, 'C');
    }
    pdf.Cell(c24, 7, "Studi", 1, 0, 'C');
    pdf.Cell(c24, 7, "Ore", 1, 0, 'C');
    pdf.Cell(c5, 7, "Note", 1, 0, 'C');
    pdf.Ln(7);

    var somma = 0
    for (let rapporto of cartolina) {
        pdf.Cell(c1, 7,
            new Date(rapporto.Mese).toLocaleString("it-IT", { year: 'numeric', month: 'long' }), 1, 0, 'L');
        if (rapporto.hasOwnProperty('Inc')) {
            pdf.Cell(c24, 7, rapporto.Inc, 1, 0, 'C')
            pdf.Cell(c24, 7, rapporto.Studi ? rapporto.Studi : '', 1, 0, 'C');
            if (rapporto.Inc == "pa" || rapporto.Inc == "pr" || rapporto.Inc == "ps") {
                somma += Number(rapporto.Ore)
                pdf.Cell(c24, 7, rapporto.Ore, 1, 0, 'C');
            } else {
                pdf.Cell(c24, 7, '', 1, 0, 'C');
            }
            pdf.Cell(c5, 7, unescapeHtml(rapporto.Note || ''), 1, 0, 'L');
        } else if (rapporto.hasOwnProperty('N') && rapporto.N != 0) {
            pdf.Cell(c24, 7, rapporto.N, 1, 0, 'C');
            pdf.Cell(c24, 7, rapporto.Studi || '', 1, 0, 'C');
            if (proc.id != 'p') {
                somma += Number(rapporto.Ore)
                pdf.Cell(c24, 7, rapporto.Ore, 1, 0, 'C');
            } else {
                pdf.Cell(c24, 7, '', 1, 0, 'C');
            }
            pdf.Cell(c5, 7, unescapeHtml(rapporto.Note || ''), 1, 0, 'L');
        } else {
            pdf.Cell(c24, 7, '', 1, 0, 'C');
            pdf.Cell(c24, 7, '', 1, 0, 'C');
            pdf.Cell(c24, 7, '', 1, 0, 'C');
            pdf.Cell(c5, 7, '', 1, 0, 'L');
        }
        pdf.Ln(7);
    }

    pdf.Cell(c1 + c24, 7, "", 0, 0, 'L');
    pdf.Cell(c24, 7, "Totale", 1, 0, 'C');
    if (somma != 0) {
        pdf.Cell(c24, 7, somma, 1, 0, 'C');
    } else {
        pdf.Cell(c24, 7, '', 1, 0, 'C');
    }
    pdf.Cell(c5, 7, "", 1, 0, 'L');
    pdf.Ln(7)
}

async function fpdfS21Singola(event, anno, id_proc) {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (canceled) {
        return
    } else {
        const pdf = new FPDF('L', 'mm', 'A5');
        pdf.SetFont('Arial', '', 10);
        pdf.SetTextColor(0, 0, 0);
        pdf.SetAutoPageBreak(1, 3);
        pdf.SetY(3);
        pdf.AddPage();

        db = await readFile(null, 'db')
        if (isNaN(id_proc)) {
            proc = { id: id_proc }
            if (proc.id == "p") {
                proc.Nome = 'Proclamatori congregazione'
            }
            if (proc.id == "pa") {
                proc.Nome = "Pionieri ausiliari congregazione"
            }
            if (proc.id == "pr") {
                proc.Nome = "Pionieri regolari e speciali congregazione"
            }
            if (proc.id == "tt") {
                proc.Nome = "Totali congregazione"
            }
            if (proc.id.length > 2) {
                gruppoStraniero = id_proc.split('-')
                if (gruppoStraniero[1] == 'ita') {
                    if (gruppoStraniero[0] == 'p') {
                        proc.Nome = 'Proclamatori italiani'
                    }
                    if (gruppoStraniero[0] == 'pa') {
                        proc.Nome = 'Pionieri ausiliari italiani'
                    }
                    if (gruppoStraniero[0] == 'pr') {
                        proc.Nome = 'Pionieri regolari italiani'
                    }
                } else {
                    if (gruppoStraniero[0] == 'p') {
                        proc.Nome = 'Proclamatori gruppo ' +
                            db.gruppi.find(item => item.id == Number(gruppoStraniero[1])).Sorv_Gr
                    }
                    if (gruppoStraniero[0] == 'pa') {
                        proc.Nome = 'Pionieri ausiliari gruppo ' +
                            db.gruppi.find(item => item.id == Number(gruppoStraniero[1])).Sorv_Gr
                    }
                    if (gruppoStraniero[0] == 'pr') {
                        proc.Nome = 'Pionieri regolari gruppo ' +
                            db.gruppi.find(item => item.id == Number(gruppoStraniero[1])).Sorv_Gr
                    }
                }
            }
        } else {
            proc = db.anagrafica.find(item => item.id == Number(id_proc))
        }

        cartolina = []
        var mesi = mesiAnnoTeocratico(anno)
        for (indice = 0; indice < 12; indice++) {
            if (isNaN(id_proc)) {
                rapporto = { 'Mese': mesi[indice] }
                if (id_proc == 'p' || id_proc == 'pa') {
                    rap = db.anagrafica.filter(p => p.rapporti.findIndex(r => r.Mese == mesi[indice] && r.Inc == id_proc) != -1)
                    note = ''
                }
                if (id_proc == 'pr') {
                    rap = db.anagrafica.filter(p => p.rapporti.findIndex(r => r.Mese == mesi[indice] && (r.Inc == id_proc || r.Inc == 'ps')) != -1)
                    note = ''
                }
                if (id_proc == 'tt') {
                    rap = db.anagrafica.filter(p => p.rapporti.findIndex(r => r.Mese == mesi[indice]) != -1)
                    let p = db.anagrafica.filter(p => p.rapporti.findIndex(r => r.Mese == mesi[indice] && r.Inc == 'p') != -1).length
                    let pa = db.anagrafica.filter(p => p.rapporti.findIndex(r => r.Mese == mesi[indice] && r.Inc == 'pa') != -1).length
                    let pr = db.anagrafica.filter(p => p.rapporti.findIndex(r => r.Mese == mesi[indice] && r.Inc == 'pr') != -1).length
                    let ps = db.anagrafica.filter(p => p.rapporti.findIndex(r => r.Mese == mesi[indice] && r.Inc == 'ps') != -1).length
                    let ir = db.anagrafica.filter(p => p.rapporti.findIndex(r => r.Mese == mesi[indice] && r.Inc == 'ir') != -1).length
                    note = `P:${p} PA:${pa} PR:${pr} PS:${ps} IR:${ir}`
                }
                if (id_proc.length > 2) {
                    gruppoStraniero = id_proc.split('-')
                    if (gruppoStraniero[1] == 'ita') {
                        gruppiStranieri = db.gruppi.filter(item => item.straniero).map(item => item.id)
                        rap = db.anagrafica.filter(
                            p => p.rapporti.findIndex(
                                r => r.Mese == mesi[indice] && r.Inc == gruppoStraniero[0] && !gruppiStranieri.includes(r.Gr)) != -1
                        )
                    } else {
                        rap = db.anagrafica.filter(
                            p => p.rapporti.findIndex(
                                r => r.Mese == mesi[indice] && r.Inc == gruppoStraniero[0] && r.Gr == gruppoStraniero[1]) != -1
                        )
                    }
                    note = ''
                }
                if (rap.length > 0) {
                    rapporto = {
                        N: rap.length,
                        Studi: rap.map(p => {
                            iRap = p.rapporti.findIndex(r => r.Mese == mesi[indice])
                            return p.rapporti[iRap].Studi ? p.rapporti[iRap].Studi : 0
                        }).reduce((p, n) => p + n),
                        Ore: rap.map(p => {
                            iRap = p.rapporti.findIndex(r => r.Mese == mesi[indice])
                            return p.rapporti[iRap].Ore ? p.rapporti[iRap].Ore : 0
                        }).reduce((p, n) => p + n),
                        Note: note
                    }
                } else {
                    rapporto = {
                        N: 0,
                        Studi: 0,
                        Ore: 0
                    }
                }
            } else {
                iRap = proc.rapporti.findIndex(item => item.Mese == mesi[indice])
                rapporto = proc.rapporti[iRap]
            }
            cartolina.push(rapporto)
        }

        await cartolinaFPDF(pdf, proc, cartolina, null)

        try {
            pdf.Output('F', path.join(filePaths[0], `S-21 ${proc.Nome} ${anno}.pdf`))
            return { succ: true, msg: "File creato" }
        } catch (e) {
            return { succ: false, msg: 'Errore: ' + e }
        }
    }
}

async function fpdfS21Tutte(event, anno) {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (canceled) {
        return
    } else {
        var mesi = mesiAnnoTeocratico(anno)
        var keys = ['Studi', 'Ore']
        let mm_colonna = 48;
        let mm_x = 0;
        let link_pdf = {}
        let link_pdf_tot = {}
        db = await readFile(null, 'db')

        pionieri = db.anagrafica.filter(item => ((item.PR_PS == 'PR') && (item.Attivo) && (!item.Eliminato)))
        pionieri.sort(function (a, b) {
            if (a.Nome < b.Nome)
                return -1
            if (a.Nome > b.Nome)
                return 1
            return 0
        })

        let proclamatori = []
        let n = 0
        for (gruppo of db.gruppi) {
            proclamatori[n] = db.anagrafica.filter(item => (
                (item.PR_PS == '') &&
                (item.Attivo) &&
                (!item.Eliminato) &&
                (item.Gr == gruppo.id)))
            proclamatori[n].sort(function (a, b) {
                if (a.Nome < b.Nome)
                    return -1
                if (a.Nome > b.Nome)
                    return 1
                return 0
            })
            n++
        }

        inattivi = db.anagrafica.filter(item => ((!item.Attivo) && (!item.Eliminato)))
        inattivi.sort(function (a, b) {
            if (a.Nome < b.Nome)
                return -1
            if (a.Nome > b.Nome)
                return 1
            return 0
        })

        const pdf = new FPDF('L', 'mm', 'A5');
        pdf.SetTextColor(0, 0, 0);
        pdf.SetAutoPageBreak(1, 3);
        pdf.AddPage();
        pdf.SetFont('Arial', 'B', 20);
        pdf.SetY(3);
        //utilizzato come workaround bug primo link
        link0 = pdf.AddLink()
        pdf.SetLink(link0)

        link_first_page = pdf.AddLink()
        pdf.SetLink(link_first_page)
        pdf.Cell(mm_colonna * 4, 10, "Cartoline anno " + anno, 0, 0, 'C', false)
        pdf.Ln(10);
        pdf.SetFont('Arial', '', 16);
        pdf.Cell(mm_colonna * 4, 8, "Pionieri", 1, 1, 'C');
        pdf.SetFont('Arial', '', 10);
        for (pioniere of pionieri) {
            if (mm_x >= mm_colonna * 4) {
                pdf.Ln(8);
                mm_x = 0;
            }
            link_pdf[pioniere["id"]] = pdf.AddLink();
            pdf.Cell(mm_colonna, 8, unescapeHtml(pioniere["Nome"]), 0, 0, 'L', false, link_pdf[pioniere['id']]);
            mm_x += mm_colonna;
        }
        pdf.Ln(8);

        for (proc_filter of proclamatori) {
            pdf.SetFont('Arial', '', 16);
            gruppo = db.gruppi.find(item => item.id === proc_filter[0].Gr)
            pdf.Cell(mm_colonna * 4, 8, `Proclamatori - Gruppo ${gruppo['Num']} ${gruppo["Sorv_Gr"]}`, 1, 1, 'C');
            pdf.SetFont('Arial', '', 10);
            mm_x = 0;
            for (proc of proc_filter) {
                if (mm_x >= mm_colonna * 4) {
                    pdf.Ln(8);
                    mm_x = 0;
                }
                link_pdf[proc["id"]] = pdf.AddLink();
                pdf.Cell(mm_colonna, 8, unescapeHtml(proc["Nome"]), 0, 0, 'L', false, link_pdf[proc["id"]]);
                mm_x += mm_colonna;
            }
            pdf.Ln(8);
        }

        pdf.SetFont('Arial', '', 16);
        pdf.Cell(mm_colonna * 4, 8, "Inattivi", 1, 1, 'C');
        pdf.SetFont('Arial', '', 10);
        mm_x = 0;
        for (inattivo of inattivi) {
            if (mm_x >= mm_colonna * 4) {
                pdf.Ln(8);
                mm_x = 0;
            }
            link_pdf[inattivo["id"]] = pdf.AddLink();
            pdf.Cell(mm_colonna, 8, unescapeHtml(inattivo["Nome"]), 0, 0, 'L', false, link_pdf[inattivo["id"]]);
            mm_x += mm_colonna;
        }
        pdf.Ln(8);

        gruppiStranieri = db.gruppi.filter(item => item.straniero)
        if (gruppiStranieri.length > 0) {
            pdf.SetFont('Arial', '', 16);
            pdf.Cell(mm_colonna * 4, 8, "Parziali", 1, 1, 'C');
            pdf.SetFont('Arial', '', 10);
            for (gruppo of gruppiStranieri) {
                link_pdf_tot['p-' + gruppo.id] = pdf.AddLink();
                pdf.Cell(mm_colonna, 8, 'Proclamatori gr. ' + gruppo.Sorv_Gr, 0, 0, 'L', false,
                    link_pdf_tot['p-' + gruppo.id])

                link_pdf_tot['pa-' + gruppo.id] = pdf.AddLink();
                pdf.Cell(mm_colonna, 8, 'P. ausiliari gr. ' + gruppo.Sorv_Gr, 0, 0, 'L', false,
                    link_pdf_tot['pa-' + gruppo.id])

                link_pdf_tot['pr-' + gruppo.id] = pdf.AddLink();
                pdf.Cell(mm_colonna, 8, 'P. regolari gr. ' + gruppo.Sorv_Gr, 0, 0, 'L', false,
                    link_pdf_tot['pr-' + gruppo.id])
                pdf.Ln(8)
            }
            link_pdf_tot['p-ita'] = pdf.AddLink();
            pdf.Cell(mm_colonna, 8, 'Proclamatori italiani', 0, 0, 'L', false,
                link_pdf_tot['p-ita'])

            link_pdf_tot['pa-ita'] = pdf.AddLink();
            pdf.Cell(mm_colonna, 8, 'P. ausiliari italiani', 0, 0, 'L', false,
                link_pdf_tot['pa-ita'])

            link_pdf_tot['pr-ita'] = pdf.AddLink();
            pdf.Cell(mm_colonna, 8, 'P. regolari italiani', 0, 0, 'L', false,
                link_pdf_tot['pr-ita'])
            pdf.Ln(8)
        }

        pdf.SetFont('Arial', '', 16);
        pdf.Cell(mm_colonna * 4, 8, "Totali", 1, 1, 'C');
        pdf.SetFont('Arial', '', 10);

        link_pdf_tot['p'] = pdf.AddLink()
        pdf.Cell(mm_colonna, 8, 'Proclamatori', 0, 0, 'L', false, link_pdf_tot['p']);
        link_pdf_tot['pa'] = pdf.AddLink()
        pdf.Cell(mm_colonna, 8, 'Pionieri Ausiliari', 0, 0, 'L', false, link_pdf_tot['pa']);
        link_pdf_tot['pr'] = pdf.AddLink()
        pdf.Cell(mm_colonna, 8, 'Pionieri Regolari e Speciali', 0, 0, 'L', false, link_pdf_tot['pr']);
        link_pdf_tot['tt'] = pdf.AddLink()
        pdf.Cell(mm_colonna, 8, 'Totali congregazione', 0, 0, 'L', false, link_pdf_tot['tt']);
        pdf.Ln(8)

        for (riga of pionieri) {
            pdf.AddPage()
            pdf.SetY(3)
            cartolina = []
            for (let mese of mesi) {
                rapporto = { 'Mese': mese }
                iRap = riga.rapporti.findIndex(item => item.Mese == mese)
                if (iRap != -1)
                    rapporto = riga.rapporti[iRap]
                cartolina.push(rapporto)
            }
            console.log(cartolina);
            await cartolinaFPDF(pdf, riga, cartolina, link_pdf[riga["id"]], link_first_page);
        }
        for (proc_filter of proclamatori) {
            for (riga of proc_filter) {
                pdf.AddPage()
                pdf.SetY(3)
                cartolina = []
                for (let mese of mesi) {
                    rapporto = { 'Mese': mese }
                    iRap = riga.rapporti.findIndex(item => item.Mese == mese)
                    if (iRap != -1)
                        rapporto = riga.rapporti[iRap]
                    cartolina.push(rapporto)
                }
                await cartolinaFPDF(pdf, riga, cartolina, link_pdf[riga["id"]], link_first_page);
            }
        }
        for (riga of inattivi) {
            pdf.AddPage()
            pdf.SetY(3)
            cartolina = []
            for (let mese of mesi) {
                rapporto = { 'Mese': mese }
                iRap = riga.rapporti.findIndex(item => item.Mese == mese)
                if (iRap != -1)
                    rapporto = riga.rapporti[iRap]
                cartolina.push(rapporto)
            }
            await cartolinaFPDF(pdf, riga, cartolina, link_pdf[riga["id"]], link_first_page);
        }
        if (gruppiStranieri.length > 0) {
            for (gruppo of gruppiStranieri) {
                pdf.AddPage()
                pdf.SetY(3)
                cartolina = []
                for (let mese of mesi) {
                    rap = db.anagrafica.filter(
                        p => p.rapporti.findIndex(
                            r => r.Mese == mese && r.Inc == 'p' && r.Gr == gruppo.id) != -1
                    )
                    if (rap.length > 0) {
                        rapporto = {
                            N: rap.length,
                            Studi: rap.map(p => {
                                iRap = p.rapporti.findIndex(r => r.Mese == mese)
                                return p.rapporti[iRap].Studi ? p.rapporti[iRap].Studi : 0
                            }).reduce((p, n) => p + n),
                            Ore: rap.map(p => {
                                iRap = p.rapporti.findIndex(r => r.Mese == mese)
                                return p.rapporti[iRap].Ore ? p.rapporti[iRap].Ore : 0
                            }).reduce((p, n) => p + n),
                            Mese: mese
                        }
                    } else {
                        rapporto = {
                            N: 0,
                            Studi: 0,
                            Ore: 0,
                            Mese: mese
                        }
                    }
                    cartolina.push(rapporto)
                }
                await cartolinaFPDF(pdf, { id: 'p', Nome: 'Proclamatori gr. ' + gruppo.Sorv_Gr }, cartolina,
                    link_pdf_tot['p-' + gruppo.id], link_first_page)

                pdf.AddPage()
                pdf.SetY(3)
                cartolina = []
                for (let mese of mesi) {
                    rap = db.anagrafica.filter(
                        p => p.rapporti.findIndex(
                            r => r.Mese == mese && r.Inc == 'pa' && r.Gr == gruppo.id) != -1
                    )
                    if (rap.length > 0) {
                        rapporto = {
                            N: rap.length,
                            Studi: rap.map(p => {
                                iRap = p.rapporti.findIndex(r => r.Mese == mese)
                                return p.rapporti[iRap].Studi ? p.rapporti[iRap].Studi : 0
                            }).reduce((p, n) => p + n),
                            Ore: rap.map(p => {
                                iRap = p.rapporti.findIndex(r => r.Mese == mese)
                                return p.rapporti[iRap].Ore ? p.rapporti[iRap].Ore : 0
                            }).reduce((p, n) => p + n),
                            Mese: mese
                        }
                    } else {
                        rapporto = {
                            N: 0,
                            Studi: 0,
                            Ore: 0,
                            Mese: mese
                        }
                    }
                    cartolina.push(rapporto)
                }
                await cartolinaFPDF(pdf, { id: 'pa', Nome: 'Pionieri ausiliari gr. ' + gruppo.Sorv_Gr }, cartolina,
                    link_pdf_tot['pa-' + gruppo.id], link_first_page)

                pdf.AddPage()
                pdf.SetY(3)
                cartolina = []
                for (let mese of mesi) {
                    rap = db.anagrafica.filter(
                        p => p.rapporti.findIndex(
                            r => r.Mese == mese && r.Inc == 'pr' && r.Gr == gruppo.id) != -1
                    )
                    if (rap.length > 0) {
                        rapporto = {
                            N: rap.length,
                            Studi: rap.map(p => {
                                iRap = p.rapporti.findIndex(r => r.Mese == mese)
                                return p.rapporti[iRap].Studi ? p.rapporti[iRap].Studi : 0
                            }).reduce((p, n) => p + n),
                            Ore: rap.map(p => {
                                iRap = p.rapporti.findIndex(r => r.Mese == mese)
                                return p.rapporti[iRap].Ore ? p.rapporti[iRap].Ore : 0
                            }).reduce((p, n) => p + n),
                            Mese: mese
                        }
                    } else {
                        rapporto = {
                            N: 0,
                            Studi: 0,
                            Ore: 0,
                            Mese: mese
                        }
                    }
                    cartolina.push(rapporto)
                }
                await cartolinaFPDF(pdf, { id: 'pr', Nome: 'Pionieri regolari gr. ' + gruppo.Sorv_Gr }, cartolina,
                    link_pdf_tot['pr-' + gruppo.id], link_first_page)
            }

            pdf.AddPage()
            pdf.SetY(3)
            cartolina = []
            idGruppiStranieri = db.gruppi.filter(item => item.straniero).map(item => item.id)
            for (let mese of mesi) {
                rap = db.anagrafica.filter(
                    p => p.rapporti.findIndex(
                        r => r.Mese == mese && r.Inc == 'p' && !idGruppiStranieri.includes(r.Gr)) != -1
                )
                if (rap.length > 0) {
                    rapporto = {
                        N: rap.length,
                        Studi: rap.map(p => {
                            iRap = p.rapporti.findIndex(r => r.Mese == mese)
                            return p.rapporti[iRap].Studi ? p.rapporti[iRap].Studi : 0
                        }).reduce((p, n) => p + n),
                        Ore: rap.map(p => {
                            iRap = p.rapporti.findIndex(r => r.Mese == mese)
                            return p.rapporti[iRap].Ore ? p.rapporti[iRap].Ore : 0
                        }).reduce((p, n) => p + n),
                        Mese: mese
                    }
                } else {
                    rapporto = {
                        N: 0,
                        Studi: 0,
                        Ore: 0,
                        Mese: mese
                    }
                }
                cartolina.push(rapporto)
            }
            await cartolinaFPDF(pdf, { id: 'p', Nome: 'Proclamatori italiano' }, cartolina,
                link_pdf_tot['p-ita'], link_first_page)

            pdf.AddPage()
            pdf.SetY(3)
            cartolina = []
            for (let mese of mesi) {
                rap = db.anagrafica.filter(
                    p => p.rapporti.findIndex(
                        r => r.Mese == mese && r.Inc == 'pa' && !idGruppiStranieri.includes(r.Gr)) != -1
                )
                if (rap.length > 0) {
                    rapporto = {
                        N: rap.length,
                        Studi: rap.map(p => {
                            iRap = p.rapporti.findIndex(r => r.Mese == mese)
                            return p.rapporti[iRap].Studi ? p.rapporti[iRap].Studi : 0
                        }).reduce((p, n) => p + n),
                        Ore: rap.map(p => {
                            iRap = p.rapporti.findIndex(r => r.Mese == mese)
                            return p.rapporti[iRap].Ore ? p.rapporti[iRap].Ore : 0
                        }).reduce((p, n) => p + n),
                        Mese: mese
                    }
                } else {
                    rapporto = {
                        N: 0,
                        Studi: 0,
                        Ore: 0,
                        Mese: mese
                    }
                }
                cartolina.push(rapporto)
            }
            await cartolinaFPDF(pdf, { id: 'pa', Nome: 'Pionieri ausiliari italiano' }, cartolina,
                link_pdf_tot['pa-ita'], link_first_page)

            pdf.AddPage()
            pdf.SetY(3)
            cartolina = []
            for (let mese of mesi) {
                rap = db.anagrafica.filter(
                    p => p.rapporti.findIndex(
                        r => r.Mese == mese && r.Inc == 'pr' && !idGruppiStranieri.includes(r.Gr)) != -1
                )
                if (rap.length > 0) {
                    rapporto = {
                        N: rap.length,
                        Studi: rap.map(p => {
                            iRap = p.rapporti.findIndex(r => r.Mese == mese)
                            return p.rapporti[iRap].Studi ? p.rapporti[iRap].Studi : 0
                        }).reduce((p, n) => p + n),
                        Ore: rap.map(p => {
                            iRap = p.rapporti.findIndex(r => r.Mese == mese)
                            return p.rapporti[iRap].Ore ? p.rapporti[iRap].Ore : 0
                        }).reduce((p, n) => p + n),
                        Mese: mese
                    }
                } else {
                    rapporto = {
                        N: 0,
                        Studi: 0,
                        Ore: 0,
                        Mese: mese
                    }
                }
                cartolina.push(rapporto)
            }
            await cartolinaFPDF(pdf, { id: 'pr', Nome: 'Pionieri regolari italiano' }, cartolina,
                link_pdf_tot['pr-ita'], link_first_page)
        }

        pdf.AddPage()
        pdf.SetY(3)
        cartolina = []
        for (let mese of mesi) {
            rap = db.anagrafica.filter(p => p.rapporti.findIndex(r => r.Mese == mese && r.Inc == 'p') != -1)
            if (rap.length > 0) {
                rapporto = {
                    N: rap.length,
                    Studi: rap.map(p => {
                        iRap = p.rapporti.findIndex(r => r.Mese == mese)
                        return p.rapporti[iRap].Studi ? p.rapporti[iRap].Studi : 0
                    }).reduce((p, n) => p + n),
                    Ore: rap.map(p => {
                        iRap = p.rapporti.findIndex(r => r.Mese == mese)
                        return p.rapporti[iRap].Ore ? p.rapporti[iRap].Ore : 0
                    }).reduce((p, n) => p + n),
                    Mese: mese
                }
            } else {
                rapporto = {
                    N: 0,
                    Studi: 0,
                    Ore: 0
                }
            }
            cartolina.push(rapporto)
        }
        await cartolinaFPDF(pdf, { id: 'p', Nome: "Proclamatori congregazione" }, cartolina,
            link_pdf_tot['p'], link_first_page);

        pdf.AddPage()
        pdf.SetY(3)
        cartolina = []
        for (let mese of mesi) {
            rap = db.anagrafica.filter(p => p.rapporti.findIndex(r => r.Mese == mese && r.Inc == 'pa') != -1)
            if (rap.length > 0) {
                rapporto = {
                    N: rap.length,
                    Studi: rap.map(p => {
                        iRap = p.rapporti.findIndex(r => r.Mese == mese)
                        return p.rapporti[iRap].Studi ? p.rapporti[iRap].Studi : 0
                    }).reduce((p, n) => p + n),
                    Ore: rap.map(p => {
                        iRap = p.rapporti.findIndex(r => r.Mese == mese)
                        return p.rapporti[iRap].Ore ? p.rapporti[iRap].Ore : 0
                    }).reduce((p, n) => p + n),
                    Mese: mese
                }
            } else {
                rapporto = {
                    N: 0,
                    Studi: 0,
                    Ore: 0
                }
            }
            cartolina.push(rapporto)
        }
        await cartolinaFPDF(pdf, { id: 'pa', Nome: "Pionieri ausiliari congregazione" }, cartolina,
            link_pdf_tot['pa'], link_first_page);

        pdf.AddPage()
        pdf.SetY(3)
        cartolina = []
        for (let mese of mesi) {
            rap = db.anagrafica.filter(p => p.rapporti.findIndex(r => r.Mese == mese && r.Inc == 'p') != -1)
            if (rap.length > 0) {
                rapporto = {
                    N: rap.length,
                    Studi: rap.map(p => {
                        iRap = p.rapporti.findIndex(r => r.Mese == mese)
                        return p.rapporti[iRap].Studi ? p.rapporti[iRap].Studi : 0
                    }).reduce((p, n) => p + n),
                    Ore: rap.map(p => {
                        iRap = p.rapporti.findIndex(r => r.Mese == mese)
                        return p.rapporti[iRap].Ore ? p.rapporti[iRap].Ore : 0
                    }).reduce((p, n) => p + n),
                    Mese: mese
                }
            } else {
                rapporto = {
                    N: 0,
                    Studi: 0,
                    Ore: 0
                }
            }
            cartolina.push(rapporto)
        }
        await cartolinaFPDF(pdf, { id: 'pr', Nome: "Pionieri regolari congregazione" }, cartolina,
            link_pdf_tot['pr'], link_first_page)

        pdf.AddPage()
        pdf.SetY(3)
        cartolina = []
        for (let mese of mesi) {
            rap = db.anagrafica.filter(p => p.rapporti.findIndex(r => r.Mese == mese) != -1)
            let p = db.anagrafica.filter(p => p.rapporti.findIndex(r => r.Mese == mese && r.Inc == 'p') != -1).length
            let pa = db.anagrafica.filter(p => p.rapporti.findIndex(r => r.Mese == mese && r.Inc == 'pa') != -1).length
            let pr = db.anagrafica.filter(p => p.rapporti.findIndex(r => r.Mese == mese && r.Inc == 'pr') != -1).length
            let ps = db.anagrafica.filter(p => p.rapporti.findIndex(r => r.Mese == mese && r.Inc == 'ps') != -1).length
            let ir = db.anagrafica.filter(p => p.rapporti.findIndex(r => r.Mese == mese && r.Inc == 'ir') != -1).length
            note = `P:${p} PA:${pa} PR:${pr} PS:${ps} IR:${ir}`
            if (rap.length > 0) {
                rapporto = {
                    N: rap.length,
                    Studi: rap.map(p => {
                        iRap = p.rapporti.findIndex(r => r.Mese == mese)
                        return p.rapporti[iRap].Studi ? p.rapporti[iRap].Studi : 0
                    }).reduce((p, n) => p + n),
                    Ore: rap.map(p => {
                        iRap = p.rapporti.findIndex(r => r.Mese == mese)
                        return p.rapporti[iRap].Ore ? p.rapporti[iRap].Ore : 0
                    }).reduce((p, n) => p + n),
                    Note: note,
                    Mese: mese
                }
            } else {
                rapporto = {
                    N: 0,
                    Studi: 0,
                    Ore: 0
                }
            }
            cartolina.push(rapporto)
        }
        await cartolinaFPDF(pdf, { id: 'tt', Nome: "Totali congregazione" }, cartolina,
            link_pdf_tot['tt'], link_first_page)

        try {
            pdf.Output('F', path.join(filePaths[0], `S-21 complete ${anno}.pdf`))
            return { succ: true, msg: "File creato" }
        } catch (e) {
            return { succ: false, msg: 'Errore: ' + e }
        }
    }
}

async function fpdfS88(event, anno) {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (canceled) {
        return
    } else {
        var keysI = ['i1', 'i2', 'i3', 'i4', 'i5']
        var keysF = ['f1', 'f2', 'f3', 'f4', 'f5',]
        const pdf = new FPDF('L', 'mm', 'A5');
        pdf.SetFont('Arial', '', 10);
        pdf.SetTextColor(0, 0, 0);
        pdf.SetAutoPageBreak(1, 3);
        pdf.SetY(3);
        pdf.AddPage();

        pdf.SetY(3);
        pdf.Cell(190, 10, "REGISTRAZIONE DEI PRESENTI ALLE ADUNANZE DI CONGREGAZIONE", 0, 0, 'C');
        pdf.Ln(10);


        pdf.Cell(98, 8, "Adunanza infrasettimanale", 0, 0, 'L');
        pdf.Cell(98, 8, "Adunanza del fine settimana", 0, 0, 'L');
        pdf.Ln(8);

        pdf.Cell(32, 8, "Mese", 1, 0, 'L');
        pdf.Cell(18, 8, "N. adun", 1, 0, 'C');
        pdf.Cell(20, 8, "Totale pres", 1, 0, 'C');
        pdf.Cell(20, 8, "Media pres", 1, 0, 'C');
        pdf.Cell(8, 8, "", 0, 0, 'C');
        pdf.Cell(32, 8, "Mese", 1, 0, 'L');
        pdf.Cell(18, 8, "N. adun", 1, 0, 'C');
        pdf.Cell(20, 8, "Totale pres", 1, 0, 'C');
        pdf.Cell(20, 8, "Media pres", 1, 0, 'C');
        pdf.Ln(8);

        pdf.SetFont('Arial', '', 10);

        mesi = mesiAnnoTeocratico(anno)
        sommaI = contaI = 0
        sommaF = contaF = 0
        db = await readFile(null, 'db')
        for (x = 0; x < 12; x++) {
            presenti = db.presenti.filter(item => item.Mese == mesi[x])
            totI = cI = 0
            totF = cF = 0
            if (presenti.length > 0) {
                for (key of keysI) {
                    if (presenti[0][key] != null && presenti[0][key] != '') {
                        totI += Number(presenti[0][key])
                        cI++
                    }
                }
                if (cI > 0) {
                    contaI++
                    sommaI += Number(totI / cI)
                }
                for (key of keysF) {
                    if (presenti[0][key] != null && presenti[0][key] != '') {
                        totF += Number(presenti[0][key])
                        cF++
                    }
                }
                if (cF > 0) {
                    contaF++
                    sommaF += Number(totF / cF)
                }
                mI = Number(totI / cI).toFixed(0)
                mF = Number(totF / cF).toFixed(0)
            } else {
                cI = ''
                totI = ''
                cF = ''
                totF = ''
                mI = ''
                mF = ''
            }
            pdf.Cell(32, 8, new Date(mesi[x]).toLocaleString('it-IT', {
                year: 'numeric',
                month: 'long'
            }), 1, 0, 'L');
            pdf.Cell(18, 8, cI, 1, 0, 'C');
            pdf.Cell(20, 8, totI, 1, 0, 'C');
            pdf.Cell(20, 8, mI, 1, 0, 'C');
            pdf.Cell(8, 8, "", 0, 0, 'C');

            pdf.Cell(32, 8, new Date(mesi[x]).toLocaleString('it-IT', {
                year: 'numeric',
                month: 'long'
            }), 1, 0, 'L');
            pdf.Cell(18, 8, cF, 1, 0, 'C');
            pdf.Cell(20, 8, totF, 1, 0, 'C');
            pdf.Cell(20, 8, mF, 1, 0, 'C');
            pdf.Ln(8);
        }

        pdf.Cell(70, 8, "Media dei presenti ogni mese", 1, 0, 'R');
        pdf.Cell(20, 8, Number(sommaI / contaI).toFixed(0), 1, 0, 'C');
        pdf.Cell(8, 8, "", 0, 0, 'C');
        pdf.Cell(70, 8, "Media dei presenti ogni mese", 1, 0, 'R');
        pdf.Cell(20, 8, Number(sommaF / contaF).toFixed(0), 1, 0, 'C');

        try {
            pdf.Output('F', path.join(filePaths[0], `S-88 ${anno}.pdf`))
            return { succ: true, msg: "File creato" }
        } catch (e) {
            return { succ: false, msg: 'Errore: ' + e }
        }
    }
}