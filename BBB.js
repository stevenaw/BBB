/*
 * 	BBB v0.2
 * 		By Steven Weerdenburg and Kevin Lasconia
 * 		Last Modification: 11/16/2010
 */
var Mgr = (function(){
    var _chapters = []; // Array of Chapters/Bookmarks
    var _vid = 0, _toc = 0; // id to store the table of contents and video player
    var _hasMadeToc = false;
    var _hasTocChanged = false;
    
    var _curr = -1;
    var currChap = 0;
    var _playSeq = 0;
	    
    var canVideo = !!document.createElement('video').play;
    
    return {
        // A Bookmark object for the manager to work with
        Bookmark: function(params) {
            var title = "";
            var description = "";
            var src = "";
            var startTime = 0;
            var endTime = 0;
            
            if (params) {
                title = params["title"];
                description = params["description"];
                src = params["src"];
                startTime = parseInt(params["startTime"]);
                endTime = parseInt(params["endTime"]);
              
                if (startTime < 0 || endTime < 0)
                    throw "Start and end times must be positive!";
                else if (startTime < endTime) {
                    startTime = startTime;
                    endTime = endTime;
                } else {
                    endTime = startTime;
                    startTime = endTime;
                }
            }
            
            return {
                getTitle: function() { return title; },
                getDescription: function() { return description; },
                getSrc: function() { return src; },
                getStartTime: function() { return startTime; },
                getEndTime: function() { return endTime; },
                toString: function(){
                    return "Source: " + src + "\nTitle: " + title + "\nDescription: " + description + "\nStart Time: " + startTime + "\nEnd Time: " + endTime;
                },
                toJSON: function(){
                    return '{ "src": "' + src + '", "title": "' + title + '", "description": "' + description + '", "startTime": ' + startTime + ', "endTime": ' + endTime + ' }';
                },
                equals: function(bkmrk) {
                    return src === bkmrk.getSrc() && title === bkmrk.getTitle() && description === bkmrk.getDescription() &&
                        startTime === bkmrk.getStartTime() && endTime === bkmrk.getEndTime();
                },
                fromJSON: function(str){
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
                    
                    return Mgr.Bookmark(obj);
                }
            }
        },
        // A Statistics object for the manager to work with		
		Statistics: function() {
			var a = "";
			
			return {
				
			}
		},
        fetchBookmarks: function() {
            // Stub code, will eventually get bookmarks from server call
            
            Mgr.addChapter({
                src: 'http://upload.wikimedia.org/wikipedia/commons/7/75/Big_Buck_Bunny_Trailer_400p.ogg',
                title: 'Big Buck Bunny',
                description: 'An animated video',
                startTime: 5,
                endTime: 14});
                
            Mgr.addChapter({
                src: 'http://www.archive.org/download/deadmandirewolffanclub/DireWolfFanClub.ogv',
                title: 'Dire Wolf Fan Club',
                description: 'An unusual video',
                startTime: 10,
                endTime: 29});
                
            Mgr.addChapter({
                src: 'http://jbuckley.ca/~hoops/elephant.ogv',
                title: 'Elephants Dream',
                description: 'Elephants',
                startTime: 145,
                endTime: 200});
                
            Mgr.addChapter({
                src: 'http://www.archive.org/download/Kinetic_Art_Demo_Video/nym.ogv',
                title: 'Kinetic Art',
                description: 'Domino fun',
                startTime: 60,
                endTime: 66});
                
            Mgr.addChapter({
                src: 'http://ftp.gnu.org/video/Stephen_Fry-Happy_Birthday_GNU-hq_600px_780kbit.ogv',
                title: 'Freedom Fry',
                description: 'Happy B-Day',
                startTime: 1,
                endTime: 60});
        },
        // (Re-)initialize all values except internal element pointers
        init: function(vidId, tocId, updateEvent, canPlayEvent, ip){
            _chapters = [];
            _hasMadeToc = false;
            _hasTocChanged = true; // In event TOC has been output before calling init, this will redraw table
            _curr = -1;
            
            this.setVideoId(vidId, updateEvent, canPlayEvent);
            this.setTOCId(tocId);
            Mgr.fetchBookmarks();
			//Mgr.trackStatistics();
        },
        // Add a chapter
        addChapter: function(_c){
            _chapters.push(Mgr.Bookmark(_c));
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
        },
		
        trackStatistics: function(ip) {
			var stats = {ip : 0, onLoad : false, _25 : false, _50 : false, _75 : false, _90 : false, _100 : false, cc_on : false, cc_off : false, ad_on : false, ad_off : false};				
			var vid = this._vid;
            var duration = vid.duration;
			
			stats.ip = ip;
			
            var durationListener = function() {
                if (parseInt(vid.currentTime, 10) === parseInt(duration * 0.25, 10)) {
                    vid.removeEventListener('timeupdate', durationListener, false);
					stats._25 = true;
                }
                else if (parseInt(vid.currentTime, 10) === parseInt(duration * 0.50, 10)) {
                	vid.removeEventListener('timeupdate', durationListener, false);
                    stats._50 = true;
                }
                else if (parseInt(vid.currentTime, 10) === parseInt(duration * 0.75, 10)) {
                	vid.removeEventListener('timeupdate', durationListener, false);
                    stats._75 = true;
                }
                else if (parseInt(vid.currentTime, 10) === parseInt(duration * 0.90, 10)) {
                	vid.removeEventListener('timeupdate', durationListener, false);
                    stats._90 = true;
                }
                vid.addEventListener('timeupdate', durationListener, false);	
            }
            
            var endListener = function(){
                stats._100 = true;
				//Debugging purposes
				alert(stats._25 + ' ' + stats._50 + ' ' + stats._75 + ' ' + stats._90 + ' ' + stats._100);	
            }
			
            vid.addEventListener('timeupdate', durationListener, false);
            vid.addEventListener('ended', endListener, false);		
        },
		
		displayWatermark: function(src, opacity, alpha) {
			//Try and clean up code later :(
			var vid = this._vid;
			// Position of video player
			var videoTop = parseInt(vid.clientTop);
			var videoLeft = parseInt(vid.clientLeft);			
			// Create div element
			var watermarkDiv = document.createElement('div');
			// Set div attributes
			watermarkDiv.setAttribute('id', 'watermark');
			watermarkDiv.className = 'watermark';
			watermarkDiv.style.position= 'absolute';       
			watermarkDiv.style.left = videoLeft + 5 + 'px';
			watermarkDiv.style.top = videoTop + 5 + 'px';
			// Width and height will be hard-coded for now, will re-factor later
			watermarkDiv.style.width = 150 + 'px';
			watermarkDiv.style.height = 70 + 'px' ;
			// If image source is not specificed, default image will be used
			if (!src) {
				watermarkDiv.style.backgroundImage = 'url("watermark.png")';				
			}
			else {
				watermarkDiv.style.backgroundImage = 'url("' + src + '")';
			}
			watermarkDiv.style.backgroundRepeat = "no-repeat";
			// Arbitrary zIndex value to ensure watermark is above video player
			watermarkDiv.style.zIndex = 100;
			watermarkDiv.style.opacity = 0.4;
			var alpha = 40;
			watermarkDiv.style.filter  = "alpha(opacity=" + alpha + ")";
			document.body.appendChild(watermarkDiv);			
		}
    };
})();
