<?php

header('Content-Type: text/plain');

echo 'Data:', "\n";
print_r($_POST);

if(array_key_exists('file', $_FILES) && $_FILES['file']['error'] == 0 && $_FILES['file']['size'] < 2048)
{
    echo "\n\n";
    
    echo 'File:', "\n";
    echo file_get_contents($_FILES['file']['tmp_name']);
}
