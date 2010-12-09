<?php

switch ($_POST["action"]) {
  case "add":
    file_put_contents("serverMessages.log", $_SERVER["REMOTE_ADDR"]." ".date("c")." Added: ".$_POST["data"].chr(13), FILE_APPEND); // For debugging
  break;
  
  case "delete":
    file_put_contents("serverMessages.log", $_SERVER["REMOTE_ADDR"]." ".date("c")." Deleted: ".$_POST["data"].chr(13), FILE_APPEND); // For debugging
  break;
  
  // For if GET request or unrecognized POST request
  case "getAll":
  default:
  echo <<<HEREDOC
[
{
"src": "http://upload.wikimedia.org/wikipedia/commons/7/75/Big_Buck_Bunny_Trailer_400p.ogg",
"title": "Big Buck Bunny",
"description": "An animated video",
"startTime": 5,
"endTime": 14
},{
"src": "http://www.archive.org/download/deadmandirewolffanclub/DireWolfFanClub.ogv",
"title": "Dire Wolf Fan Club",
"description": "An unusual video",
"startTime": 10,
"endTime": 29
},{
"src": "http://jbuckley.ca/~hoops/elephant.ogv",
"title": "Elephants Dream",
"description": "Elephants",
"startTime": 145,
"endTime": 200
},{
"src": "http://www.archive.org/download/Kinetic_Art_Demo_Video/nym.ogv",
"title": "Kinetic Art",
"description": "Domino fun",
"startTime": 60,
"endTime": 66
},{
"src": "http://ftp.gnu.org/video/Stephen_Fry-Happy_Birthday_GNU-hq_600px_780kbit.ogv",
"title": "Freedom Fry",
"description": "Happy B-Day",
"startTime": 1,
"endTime": 60
}
]
HEREDOC;
break;
}
?>