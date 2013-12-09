<?php

setcookie('test_cookie', 'foobar', time() + 60);

if(count($_COOKIE) > 0)
{
    foreach($_COOKIE as $name => $value)
    {
        echo $name, "=", $value, "\n";
    }
}

?>