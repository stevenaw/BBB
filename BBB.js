/*
 * 	BBB v0.1
 * 		By Steven Weerdenburg and Kevin Lasconia
 * 		Last Modification: 11/08/2010
 */
if (typeof XMLHttpRequest == "undefined") {
    XMLHttpRequest = function () {
        try { return new ActiveXObject("Msxml2.XMLHTTP.6.0"); } catch (e) {}
        try { return new ActiveXObject("Msxml2.XMLHTTP.3.0"); } catch (f) {}
        try { return new ActiveXObject("Msxml2.XMLHTTP"); } catch (g) {}
        // Impossible to support XHR
        throw new Error("This browser does not support XMLHttpRequest.");
    };
}

var Mgr = (function(){
    var _chapters = []; // Array of Chapters/Bookmarks
    var _vid = 0, _toc = 0; // id to store the table of contents and video player
    var _hasMadeToc = false;
    var _hasTocChanged = false;
    
    var _curr = -1;
    var currChap = 0;
    var _playSeq = 0;
    var serverRoot = "";
    var serverEnd = "";
    
    var canVideo = !!document.createElement('video').play;
    
    return {
        // A Bookmark object for the manager to work with
        Bookmark: function(params) {
            var params = params || {};
            
            var title = params["title"] || "";
            var description = params["description"] || "";
            var src = params["src"] || "";
            var startTime = parseInt(params["startTime"] || 0);
            var endTime = parseInt(params["endTime"] || 0);
            
            if (startTime < 0 || endTime < 0)
                throw "Start and end times must be positive!";
            else if (startTime < endTime) {
                startTime = startTime;
                endTime = endTime;
            } else {
                endTime = startTime;
                startTime = endTime;
            }
            
            this.getTitle = function() { return title; },
            this.getDescription= function() { return description; },
            this.getSrc = function() { return src; },
            this.getStartTime = function() { return startTime; },
            this.getEndTime = function() { return endTime; },
            this.toString = function(){
                return "Source: " + src + "\nTitle: " + title + "\nDescription: " + description + "\nStart Time: " + startTime + "\nEnd Time: " + endTime;
            },
            this.toJSON = function(){
                return '{ "src": "' + src + '", "title": "' + title + '", "description": "' + description + '", "startTime": ' + startTime + ', "endTime": ' + endTime + ' }';
            }
        },
        // (Re-)initialize all values
        init: function(params){
            this.setVideoId(params.playerId);
            this.setTOCId(params.tocId);
            
            // Default search directory "BBB" for callPage
            // Careful, cross-origin issues may result if specified
            serverRoot = params.remoteServer || location.href.substring(0, location.href.lastIndexOf("/BBB/")+5);
            serverEnd = params.chapterStorage || "";
            this.fetchChapters(serverRoot+serverEnd);
        },
        fetchChapters: function(endPoint) {
            var request = new XMLHttpRequest();
            
            _chapters = [];
            _hasMadeToc = false;
            _hasTocChanged = true; // In event TOC has been output before calling init, this will redraw table
            _curr = -1;
            
            request.open("GET",endPoint);
            request.onreadystatechange = function() {
                var arr = [];
                var i=0, numItems = 0;
                
                if (request.readyState == 4 && request.status == 200) {
                    arr = JSON.parse(request.responseText);
                    numItems = arr.length;
                    for(i=0; i<numItems; i++) {
                        Mgr.addChapter(arr[i]);
                    }
                    
                    Mgr.printTOC();
                }
            };
            request.send();
        },
        
        // Add a chapter
        addChapter: function(_c, isNew){
            var bkmrk = new Mgr.Bookmark(_c);
            _chapters.push(bkmrk);
            _hasTocChanged = true;
            
            if (isNew) {
              // Update at server
              var request = new XMLHttpRequest();
              var params = "action=add&data="+bkmrk.toJSON();
              
              request.open("POST",serverRoot+serverEnd);
              request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
              request.onreadystatechange = function() {
                  
              };
              
              request.send(params);
            }
        },
        // Add a chapter
        removeChapter: function(_idx){
            var bkmrk = _chapters[_idx];
            _chapters.splice(_idx, 1);
            _hasTocChanged = true;
            
            // Update at server
            var request = new XMLHttpRequest();
            var params = "action=delete&data="+bkmrk.toJSON();
            
            request.open("POST",serverRoot+serverEnd);
            request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            request.onreadystatechange = function() {
            };
            
            request.send(params);
        },
		
        // Set the table of contents (<table>) and player (<video>) elements based on id
        // Only set them if the currently stored element is null or has a differing id
        setTOCId: function(_id){
            if (_id && (!this._toc || this._toc.id !== _id)) { // Valid id given and No id supplied yet or different id supplied
                this._toc = document.getElementById(_id);
                _hasTocChanged = true;
            }
        },
        
        setVideoId: function(_id){
            if (canVideo) {
                if (_id && (!this._vid || this._vid.id !== _id)) { // valid id given and No id supplied yet or different id supplied
                    // Store locally for easy reference for event setup
                    this._vid = document.getElementById(_id);
                }
            }
        },
        
        // output the TOC
        printTOC: function(){
            if (canVideo) {
                if (this._toc) {
                    var tr = 0;
                    var srcElem = 0;
                    var th = 0;
                    if (!_hasMadeToc) {
                        tr = this._toc.insertRow(0);
                        
                        // DOM approach for tables (IE doesn't like tr.innerHTML)
                        th = document.createElement('th');
                        th.innerHTML = "Chapter Title";
                        tr.appendChild(th);
                        
                        th = document.createElement('th');
                        th.innerHTML = "Description";
                        tr.appendChild(th);
                        
                        th = document.createElement('th');
                        th.innerHTML = "Start Time";
                        tr.appendChild(th);
                        
                        th = document.createElement('th');
                        th.innerHTML = "End Time";
                        tr.appendChild(th);
              
                        th = document.createElement('th');
                        th.innerHTML = 'Delete';
                        tr.appendChild(th);
              
                        _hasMadeToc = true;
                    }
                    
                    // Delete existing rows
                    for (var i = this._toc.rows.length - 1; i > 0; i--) 
                        this._toc.deleteRow(i);
                    
                    if (_hasTocChanged) {
                        for (var i = _chapters.length - 1; i >= 0; i--) {
                            tr = this._toc.insertRow(1);
                            srcElem = document.createElement('a');
                            var item = _chapters[i];
                            
                            srcElem.href = 'javascript:Mgr.playChapter(' + i + ');';
                            srcElem.innerHTML = item.getTitle();
                            tr.insertCell(0).appendChild(srcElem);
                            tr.insertCell(1).appendChild(document.createTextNode(item.getDescription()));
                            tr.insertCell(2).appendChild(document.createTextNode(item.getStartTime()));
                            tr.insertCell(3).appendChild(document.createTextNode(item.getEndTime()));
                            tr.insertCell(4).innerHTML = '<input type="checkbox" onclick="Mgr.removeChapter('+i+'); Mgr.printTOC();" />';
                        }
                        
                        tr = this._toc.insertRow(1);
                        tr.colspan = 4;
                        
                        srcElem = document.createElement('a');
                        srcElem.href = 'javascript:Mgr.playChapter(0, 1);';
                        srcElem.innerHTML = 'Play All';
                        tr.insertCell(0).appendChild(srcElem);
                        
                        _hasTocChanged = false;
                    }
                }
            }
        },
        
        playChapter: function(idx, sequential){
            if (canVideo) {
                if (idx !== _curr && idx >= 0 && idx < _chapters.length) {
                    var vid = this._vid;
                    
                    _curr = idx;
                    currChap = _chapters[_curr];
                    
                    vid.addEventListener('loadedmetadata', function(){
                        vid.currentTime = currChap.getStartTime();
                    }, true);
                    
                    vid.addEventListener('canplay', function(){
                        vid.play();
                    }, true);
                    
                    vid.addEventListener('timeupdate', function(){
                        if (vid.currentTime >= currChap.getEndTime()) {
                            if (sequential) {
                                Mgr.playChapter(idx+1, sequential);
                            }
                            else {
                                vid.pause();
                            }
                        }
                    }, true);
                    
                    vid.src = currChap.getSrc();
                    vid.load();
                    vid.play();
                }
            }
        }
    };
})();

Mgr.Bookmark.prototype = {
  fromJSON: function(str){
    if (JSON)
        return new Mgr.Bookmark(JSON.parse(str));
    else {
        var currStart = -1;
        var currEnd = 0;
        var obj = {};
        
        while ((currStart = str.indexOf('"', currEnd + 1)) !== -1 && (currEnd = str.indexOf('"', currStart + 1)) !== -1) {
            // Has found another attribute
            
            var attrName = str.substring(currStart + 1, currEnd);
            var foundAttr = false;
            var foundSemi = false;
            var foundType = 0; // 0 = none, 1 = string, 2 = numeric, 3 = float
            var currItem;
            
            // Process value, eagerly assume comma follows when value found
            while ((currItem = str[++currEnd]) !== '"' || !foundAttr) {
                if (str[currEnd] === ':') {
                    foundSemi = true;
                } else {
                    if (str[currEnd] === '"') { // Check for strings
                        if (foundSemi && str[currEnd - 1] !== '\\') {
                            if (!foundType) {
                                foundType = 1;
                                currStart = currEnd;
                            } else {
                                obj[attrName] = str.substring(currStart + 1, currEnd);
                                foundAttr = true;
                                break; // Go into outer loop to find next attribute
                            }
                        }
                    } else {
                        if (str[currEnd] === '.') { // Check for decimal for numeric->float data
                            if (foundType === 2) 
                                foundType = 3;
                        } else {
                            if (str[currEnd] === ' ') {
                                if (foundType === 2 || foundType === 3) { // Check for end of numeric data
                                    if (foundType === 2) // Integer
                                        obj[attrName] = parseInt(str.substring(currStart, currEnd));
                                    else 
                                        if (foundType === 3) // Float
                                            obj[attrName] = parseFloat(str.substring(currStart, currEnd));
                                    
                                    foundAttr = true;
                                    break;
                                }
                            } else {
                                if (!foundType) {
                                    if (!isNaN(str[currEnd])) {
                                        currStart = str[currEnd - 1] === '-' ? currEnd - 1 : currEnd;
                                        foundType = 2; // Numeric, may be upgraded to float later
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        return new Mgr.Bookmark(obj);
    }
  },
  equals: function(bkmrk) {
      return this.getSrc() === bkmrk.getSrc() && this.getTitle() === bkmrk.getTitle() && this.getDescription() === bkmrk.getDescription() &&
          this.getStartTime() === bkmrk.getStartTime() && this.getEndTime() === bkmrk.getEndTime();
  }
};
