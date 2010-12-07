<?php
    define("DEBUG", $_SERVER['SERVER_NAME'] == 'localhost');
    define("XML_FILE", "webMadeMovies.xml");
    
    if (DEBUG)
      define("XML_OUTPUT", DEBUG ? "output.xml" : XML_FILE);
    
    $resources = (array)NULL;
    $resourceTimeline = (array)NULL;
    /*
    
    http://recursive-design.com/blog/2007/04/05/format-xml-with-php/
    
    function formatXmlString($xml) {
  
      // add marker linefeeds to aid the pretty-tokeniser (adds a linefeed between all tag-end boundaries)
      $xml = preg_replace('/(>)(<)(\/*)/', "$1\n$2$3", $xml);
      
      // now indent the tags
      $token      = strtok($xml, "\n");
      $result     = ''; // holds formatted version as it is built
      $pad        = 0; // initial indent
      $matches    = array(); // returns from preg_matches()
      
      // scan each line and adjust indent based on opening/closing tags
      while ($token !== false) : 
      
        // test for the various tag states
        
        // 1. open and closing tags on same line - no change
        if (preg_match('/.+<\/\w[^>]*>$/', $token, $matches)) : 
          $indent=0;
        // 2. closing tag - outdent now
        elseif (preg_match('/^<\/\w/', $token, $matches)) :
          $pad--;
        // 3. opening tag - don't pad this one, only subsequent tags
        elseif (preg_match('/^<\w[^>]*[^\/]>.*$/', $token, $matches)) :
          $indent=1;
        // 4. no indentation needed
        else :
          $indent = 0; 
        endif;
        
        // pad the line with the required number of leading spaces
        $line    = str_pad($token, strlen($token)+$pad, ' ', STR_PAD_LEFT);
        $result .= $line . "\n"; // add to the cumulative result, with linefeed
        $token   = strtok("\n"); // get the next token
        $pad    += $indent; // update the pad size for subsequent lines    
      endwhile; 
      
      return $result;
    }*/
    
    function addToManifest($doc, $domElement, $category, $createIfMissing = false) {
      $parent = $doc->getElementsByTagName('manifest')->item(0);
      $child = $parent->firstChild;
      $found = false;
      
      while ($child) {
        if ($child->nodeType == XML_ELEMENT_NODE && $child->nodeName == $category) {
          $child->appendChild($domElement);
          $found = true;
          break;
        }
        $child = $child->nextSibling;
      }
      
      if (!$found && $createIfMissing) {
        $parent->appendChild($doc->createElement($category));
        addToTimeline($doc, $domElement, $category);
      }
    }
    
    function addToTimeline($doc, $domElement, $category, $createIfMissing = false) {
      $parent = $doc->getElementsByTagName('timeline')->item(0);
      $child = $parent->firstChild;
      $found = false;
      
      while ($child) {
        if ($child->nodeType == XML_ELEMENT_NODE && $child->nodeName == $category) {
          $child->appendChild($domElement);
          $found = true;
          break;
        }
        $child = $child->nextSibling;
      }
      
      if (!$found && $createIfMissing) {
        $parent->appendChild($doc->createElement($category));
        addToTimeline($doc, $domElement, $category);
      }
    }
    
    switch($_POST["action"]) {
      case "add":
        //echo "ADDING:";
        $resourceXML = $_POST["manifestXML"]; // raw xml
        $timelineXML = $_POST["timelineXML"]; // raw xml
        $resourceCat = $_POST["manifestCat"];
        $timelineCat = $_POST["timelineCat"];
        
        $doc = DOMDocument::load(XML_FILE);
        
        // Add the manifest entry if not already there
        $frag = $doc->createDocumentFragment();
        $frag->appendXML($resourceXML);
        addToManifest($doc, $frag, $resourceCat);
        
        // Add the timeline entry if not already there
        $frag = $doc->createDocumentFragment();
        $frag->appendXML($timelineXML);
        addToTimeline($doc, $frag, $timelineCat);
        
        $doc->save(XML_OUTPUT);
        
        if (DEBUG) {
          $dbgString = "Added: ".date("c")."\n---------------\nManifest: {$resourceXML} \nParent: {$resourceCat} \n\nTimeline: {$timelineXML} \nTimelineParent: {$timelineCat}";
          file_put_contents("debug.txt", $dbgString.'\n\n', FILE_APPEND);
          echo $dbgString;
        } else
          echo "ADDED";
      break;
    }
?>