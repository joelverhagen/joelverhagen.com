<?php

header('Content-Type: text/plain');

$method = $_SERVER['REQUEST_METHOD'];

echo $method, " ";

if($method == 'GET')
    echo $_SERVER['QUERY_STRING'];
else if($method == 'POST' || $method == 'PUT')
    echo file_get_contents('php://input');

?>