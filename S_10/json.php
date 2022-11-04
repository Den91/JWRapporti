<?php
session_start();
include '../include.php';
access();
$_SESSION["anno"] = $_POST["anno"];
$dati = [];

echo json_encode($dati);
