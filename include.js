function navbar(pagina) {
  $("body").prepend(`
  <nav class="navbar fixed-top navbar-expand-md navbar-dark bg-dark" id="navbar">
    <div class="container-fluid">
      <a class="navbar-brand text-info" href="../home/index.html">Home</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarSupportedContent">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
        
    		  <li class="nav-item">
    			  <a class="nav-link" href="../anagrafica/index.html" id="nav_anagrafica">Anagrafica</a>
      		</li>

      		<li class="nav-item">
        		<a class="nav-link" href="../rapporti/index.html" id="nav_rapporti">Rapporto mensile</a>
      		</li>

          <li class="nav-item">
        		<a class="nav-link" href="../presenti/index.html" id="nav_presenti">Presenti adunanze</a>
      		</li>

          <li class="nav-item">
        		<a class="nav-link" href="../S_1/index.html" id="nav_S-1">S-1</a>
      		</li>
        
          <li class="nav-item">
        		<a class="nav-link" href="../S_21/index.html" id="nav_S-21">S-21 Cartoline</a>
      		</li>

          <li class="nav-item">
        		<a class="nav-link" href="../S_88/index.html" id="nav_S-88">S-88 Presenti</a>
      		</li>
        
          <li class="nav-item">
        		<a class="nav-link" href="../pionieri/index.html" id="nav_pionieri">Pionieri</a>
      		</li>

          <li class="nav-item">
        		<a class="nav-link" href="../dati/index.html" id="nav_dati">Dati</a>
      		</li>
          <!--
          <li class="nav-item">
        		<a class="nav-link" href="../S_10/index.html" id="nav_S-10">S-10</a>
      		</li>
          -->
        </ul>
      </div>
    <!--
    <form class="d-flex justify-content-end" name="logout" action="/rapporti/index.php" method="post">
        <input type="hidden" name="logout" value="esci">
        <button class="btn btn-outline-danger btn-sm" type="submit">Logout</button>
    </form>
    -->
    </div>
  </nav>
        `);
  $('#nav_' + pagina).addClass('active')
  marginBody()
}

function marginBody() {
  document.body.style.marginTop =
    document.getElementById("navbar").offsetHeight + "px";
}

function toast(id, colore, testo, tempo = 5000) {
  switch (colore) {
    case "verde":
      colore = "success"
      break

    case "rosso":
      colore = "danger"
      break
  }
  $(".toast-container").append(`
  <div class="toast border-0" id="${id}" data-bs-delay="${tempo}">
    <div class="d-flex alert alert-${colore} m-0 p-0">
      <div class="toast-body my-3 ms-1">
        ${testo}
      </div>
      <button type="button" class="btn-close ms-auto me-2 mt-2" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  </div>`)
  $(`#${id}`).toast("show");
}

function getMese() {
  m = sessionStorage.getItem('mese')
  if (!m) {
    d = new Date()
    d.setMonth(d.getMonth() - 1)
    m = d.getFullYear() + '-' + ("0" + (d.getMonth() + 1)).slice(-2)
  }
  return m
}

function getAnno() {
  a = sessionStorage.getItem('anno')
  if (!a) {
    oggi = new Date()
    primo_set = new Date(`${oggi.getFullYear()}-09-${("0" + oggi.getDate()).slice(-2)}`)
    if (oggi >= primo_set) {
      a = oggi.getFullYear() + 1
    } else {
      a = oggi.getFullYear()
    }
  }
  return a
}

function ordinaTabella(th) {
  $(th).siblings().children("span").html(``);
  var table = $(th).parents("table").eq(0);
  var rows = table
    .find("tr:gt(0)")
    .toArray()
    .sort(function (a, b) {
      var valA = $(a).children("td").eq($(th).index()).text()
      var valB = $(b).children("td").eq($(th).index()).text()
      return isNaN(valA) && isNaN(valB) ?
        valA.toUpperCase().localeCompare(valB) :
        valA - valB
    })
  th.asc = !th.asc;
  $(th).children("span").html(`<i class="bi bi-sort-alpha-down"></i>`)
  if (!th.asc) {
    $(th)
      .children("span")
      .html(`<i class="bi bi-sort-alpha-down-alt"></i>`)
    rows = rows.reverse();
  }
  for (var i = 0; i < rows.length; i++) {
    table.append(rows[i]);
  }
}

function getAnnoTeocratico() {
  let data = new Date()
  let primoSet = new Date(data.getFullYear() + "-09-01")
  if (data < primoSet) {
    return data.getFullYear()
  }
  if (data >= primoSet) {
    return data.getFullYear() + 1
  }
}

function mesiAnnoTeocratico(anno) {
  let mesi = []
  let mese = new Date((parseInt(anno) - 1) + "-09")
  for (x = 0; x < 12; x++) {
    mesi.push(`${mese.toLocaleString('it-IT', {
      year: 'numeric'
    })}-${mese.toLocaleString('it-IT', {
      month: '2-digit'
    })}`)
    mese.setMonth(mese.getMonth() + 1);
  }
  return mesi
}

function unescapeHtml(safe) {
  return safe
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function modalAvviso(avviso, nomeFunzione) {
  if ($('#ModalAvviso').length == 0) {
    $('body').prepend($(`
      <div class="modal fade" id="ModalAvviso">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <!-- Modal Header -->
            <div class="modal-header border-bottom-0">
              <button
                type="button"
                class="btn-close"
                data-bs-dismiss="modal"
              ></button>
            </div>
            <!-- Modal body -->
            <div class="modal-body pt-1 text-center">
              <span id="testoAvviso">${avviso}</span>
            </div>
            <!-- Modal footer -->
            <div class="modal-footer pt-0 border-top-0">
              <button
                type="button"
                class="btn btn-sm btn-secondary"
                data-bs-dismiss="modal"
              >
                Annulla
              </button>
              <button 
                type="button"
                class="btn btn-sm btn-danger"
                id="buttonModal"
                onclick="${nomeFunzione}"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      </div>
  `))
  } else {
    $("#testoAvviso").html(avviso)
    $("#buttonModal").attr('onclick', nomeFunzione)
  }
  $("#ModalAvviso").modal("show")
}