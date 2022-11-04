<?php
session_start();
include '../include.php';
login();
access();
$anno = anno();
?>
<!DOCTYPE HTML>
<html>

<head>
    <?php
    head();
    ?>
    <script>
        <?php
        echo "
        var annoUltimo = '" . $anno . "'";
        ?>

        var anni = [
            getAnnoTeocratico(),
            getAnnoTeocratico() - 1,
            getAnnoTeocratico() - 2
        ];

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

        $(document).ready(function() {
            anni.forEach(function(anno, indice) {
                $('[name="selectAnno"]').append(`<option value="${anno}">${anno}</option>`)
            })
            $('[name="selectAnno"]').val(annoUltimo)
            htmlPionieri($('[name="selectAnno"]').val())
        });

        function html(anno) {
            $('#Card').addClass('d-none')
            $('#Table tbody').html(``)
            if (anno != '') {
                $('#Card').removeClass('d-none')
                $.ajax({
                        type: 'POST',
                        url: 'json.php',
                        data: {
                            anno: anno
                        }
                    })
                    .done(function(dati) {

                    })
                    .fail(function() {
                        alert("errore JSON");
                    })
            }
        }
    </script>
</head>

<body>
    <?php
    navbar('S_10');
    ?>
    <div class="container-fluid pt-3">
        <div class="row mb-3">
            <div class="col-2">
                <div class="form-floating mb-2">
                    <select class="form-select" name="selectAnno" id="selectAnno" onchange="htmlPionieri(selectAnno.value)">
                    </select>
                    <label>Anno teocratico</label>
                </div>
            </div>
            <div class="col">
                <div class="card d-none" id="Card">
                    <div class="card-header d-flex">
                        <span class="me-auto my-auto">Pionieri</span>
                    </div>
                    <div class="card-body py-0">
                        <table class="table mb-0" id="Table">
                            <thead>
                                <tr>
                                </tr>
                            </thead>
                            <tbody>
                            </tbody>
                            <tfoot>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <?php
    foot();
    ?>
</body>

</html>