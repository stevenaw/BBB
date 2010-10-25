/*
 * 	BBB v0.1
 * 		By Steven Weerdenburg and Kevin Lasconia
 * 		Last Modification: 10/22/2010
 */
function Bookmark(src, title, description, startTime, endTime){
    this.title = title;
    this.description = description;
    this.src = src;
	
	startTime = parseInt(startTime);
	endTime = parseInt(endTime);
	
    if (startTime < 0 || endTime < 0)
		throw "Start and end times must be positive!";
	else if (startTime < endTime) {
        this.startTime = startTime;
        this.endTime = endTime;
    } else {
        this.endTime = startTime;
        this.startTime = endTime;
    }
}

Bookmark.prototype.title = "";
Bookmark.prototype.src = "";
Bookmark.prototype.startTime = 0;
Bookmark.prototype.endTime = 0;
Bookmark.prototype.description = "";
Bookmark.prototype.toString = function(){
    return "Source: " + this.src + "\nTitle: " + this.title + "\Description: " + this.description + "\nStart Time: " + this.startTime + "\nEnd Time: " + this.endTime;
}

Bookmark.prototype.toJSON = function(){
    return '{ "src": "' + this.src + '", "title": "' + this.title + '", "description": "' + this.description + '", "startTime": ' + this.startTime + ', "endTime": ' + this.endTime + ' }';
}

Bookmark.prototype.fromJSON = function(str){
    //var obj = jsonParse(str);
    
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
    
    return new Bookmark(obj.src, obj.title, obj.description, obj.startTime, obj.endTime);
}

var Mgr = (function(){
    var _chapters = []; // Array of Chapters/Bookmarks
    var _vid = 0, _toc = 0; // id to store the table of contents and video player
    var _hasMadeToc = false;
    var _hasTocChanged = false;
    
    var _curr = -1;
    var currChap = 0;
    var _playSeq = 0;
    
    return {
        // (Re-)initialize all values except internal element pointers
        init: function(vidId, tocId){
            _chapters = [];
            _hasMadeToc = false;
            _hasTocChanged = true; // In event TOC has been output before calling init, this will redraw table
            _curr = -1;
            
            this.setVideoId(vidId);
            this.setTOCId(tocId);
        },
        // Add a chapter
        addChapter: function(_c){
            _chapters.push(_c);
            _hasTocChanged = true;
        },
		// Add a chapter
        removeChapter: function(_idx){
            _chapters.splice(_idx, 1);
            _hasTocChanged = true;
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
            if (_id && (!this._vid || this._vid.id !== _id)) { // valid id given and No id supplied yet or different id supplied
                // Store locally for easy reference for event setup
                var vid = this._vid = document.getElementById(_id);
                var sequential = this._playSeq;
                
                vid.addEventListener('loadedmetadata', function(){
                    vid.currentTime = currChap.startTime;
                }, true);
                
                vid.addEventListener('canplay', function(){
                    vid.play();
                }, true);
                
                vid.addEventListener('timeupdate', function(){
                    if (vid.currentTime >= currChap.endTime) {
                        if (sequential) {
                            Mgr.playChapter(idx++, sequential);
                        } else {
                            vid.pause();
                        }
                    }
                }, true);
            }
        },
        
        // output the TOC
        printTOC: function(){
            if (this._toc) {                
                if (!_hasMadeToc) {
                    var tr = this._toc.insertRow(0);
                    
                    // DOM approach for tables (IE doesn't like tr.innerHTML)
                    var th = document.createElement('th');
                    th.innerHTML = "Chapter Title";
                    tr.appendChild(th);
                    
                    var th = document.createElement('th');
                    th.innerHTML = "Description";
                    tr.appendChild(th);
                    
                    var th = document.createElement('th');
                    th.innerHTML = "Start Time";
                    tr.appendChild(th);
                    
                    var th = document.createElement('th');
                    th.innerHTML = "End Time";
                    tr.appendChild(th);
					
					var th = document.createElement('th');
                    th.innerHTML = 'Delete';
                    tr.appendChild(th);
					
                    _hasMadeToc = true;
                }
                
                // Delete existing rows
                for (var i = this._toc.rows.length - 1; i > 0; i--) 
                    this._toc.deleteRow(i);
                
                if (_hasTocChanged) {
                    for (var i = _chapters.length - 1; i >= 0; i--) {
                        var tr = this._toc.insertRow(1);
                        
                        var srcElem = document.createElement('a');
                        srcElem.href = 'javascript:Mgr.playChapter(' + i + ');';
                        srcElem.innerHTML = _chapters[i].title;
                        tr.insertCell(0).appendChild(srcElem);
                        tr.insertCell(1).appendChild(document.createTextNode(_chapters[i].description));
                        tr.insertCell(2).appendChild(document.createTextNode(_chapters[i].startTime));
                        tr.insertCell(3).appendChild(document.createTextNode(_chapters[i].endTime));
                        tr.insertCell(4).innerHTML = '<input type="checkbox" onclick="Mgr.removeChapter('+i+'); Mgr.printTOC();" />';
                    }
                    
                    var tr = this._toc.insertRow(1);
                    tr.colspan = 4;
                    
                    var srcElem = document.createElement('a');
                    srcElem.href = 'javascript:Mgr.playChapter(0, 1);';
                    srcElem.innerHTML = 'Play All';
                    tr.insertCell(0).appendChild(srcElem);
                    
                    _hasTocChanged = false;
                }
            }
        },
        
        playChapter: function(idx, sequential){
            if (idx !== _curr && idx >= 0 && idx < _chapters.length) {
                this._playSeq = sequential;
                
                _curr = idx;
                currChap = _chapters[_curr];
                
                this._vid.src = currChap.src;
                this._vid.load();
                this._vid.play();
            }
        }
    };
})();
