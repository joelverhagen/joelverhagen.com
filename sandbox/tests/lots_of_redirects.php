<?php

if(!array_key_exists('count', $_GET))
    $count = 0;
else
    $count = intval($_GET['count']);

    if(!array_key_exists('max', $_GET))
    $max = 5;
else
    $max = intval($_GET['max']);

if($count < $max)
{
    header('Location: lots_of_redirects.php?max=' . $max . '&count=' . ($count + 1));
    die;
}

?>
You made it through <?php echo $max ?> redirects.