/*
* BBB v0.3
* By Steven Weerdenburg and Kevin Lasconia
* Last Modification: 12/08/2010
*/
var bbb = (function () {
    var _chapters = []; // Array of Chapters/Bookmarks
    var _recommended = []; // Array of recommended videos
    var _tocRows = []; // Array for the table of contents table rows
    var _video;
    var _stats; // Statistics object
    var _vid = 0,
        _toc = 0; // id to store the table of contents and video player
    var _hasMadeToc = false;
    var _hasTocChanged = false;

    var _curr = -1;
    var currChap = 0;
    var _playSeq = 0;

    var canVideo = !! document.createElement('video').play;
    var endPoint = {
        root: "",
        service: "",
        fullUri: function () {
            return endPoint.root + endPoint.service;
        }
    };

    if (typeof XMLHttpRequest == "undefined") {
        XMLHttpRequest = function () {
            try {
                return new ActiveXObject("Msxml2.XMLHTTP.6.0");
            } catch (e) {}
            try {
                return new ActiveXObject("Msxml2.XMLHTTP.3.0");
            } catch (f) {}
            try {
                return new ActiveXObject("Msxml2.XMLHTTP");
            } catch (g) {}
            // Impossible to support XHR
            throw new Error("This browser does not support XMLHttpRequest.");
        };
    }

    function addEvent(owner, event, func) {
        if (owner.addEventListener) owner.addEventListener(event, func, false); // Follow standards if possible
        else if (owner.attachEvent) owner.attachEvent(event, func); // IE
        else owner["on" + event] = func; // No DOM 2 support, go old school DOM 0
    }

    return {
        // A module for local storage (Cookies and HTML 5 Local Storage)
        storage: (function () {
            // Add prototype method to Object that allow it to set and get JSON objects
            Storage.prototype.setObject = function (key, value) {
                this.setItem(key, JSON.stringify(value));
            }
            Storage.prototype.getObject = function (key) {
                return this.getItem(key) && JSON.parse(this.getItem(key));
            }
            return {
                setCookie: function (name, value, expDays) {
                    var sDate = "";

                    if (!name.length) throw "name can't be empty";
                    else {
                        if (expDays) {
                            var oDate = new Date();
                            oDate.setTime(oDate.getTime() + (days * 24 * 60 * 60 * 1000));
                            sDate = "; expires=" + date.toGMTString();
                        }

                        document.cookie = name + "=" + value + sDate;
                    }
                },
                // return string
                getCookie: function (name) {
                    if (document.cookie.length > 0) {
                        var start = document.cookie.indexOf(name + "=");
                        if (start !== -1) {
                            start += name.length + 1;
                            var end = document.cookie.indexOf(";", start);
                            if (end === -1) end = document.cookie.length;
                            return unescape(document.cookie.substring(start, end));
                        }
                    }
                    return "";
                },
                setLocalStorage: function () {
                    if (!Storage.prototype.getObject) {
                        Storage.prototype.setObject = function (key, value) {
                            this.setItem(key, JSON.stringify(value));
                        }
                    }
                    localStorage.clear(); // remove later			
                    if (typeof(localStorage) == 'undefined') {
                        alert('Your browser does not supper HTML5 Local Storage. Please upgrade.');
                    }
                    else {
                        try {
                            localStorage.clear(); //remove this later
                            for (var i = 0, l = _chapters.length; i < l; i++) {
                                localStorage.setObject('BBB-Bookmark-Obj-' + i, _chapters[i]);
                            }
                        }
                        catch (e) {
                            if (e == QUOTA_EXCEEDED_ERR) {
                                alert('Data cannot be saved, quote exceeded.');
                            }
                        }
                    }
                },
                getLocalStorage: function () {
                    if (!Storage.prototype.getObject) {
                        Storage.prototype.getObject = function (key) {
                            return this.getItem(key) && JSON.parse(this.getItem(key));
                        }
                    }
                    for (var i = 0, l = localStorage.length - 1; i <= l; i++) {
                        var value = localStorage.getObject('BBB-Bookmark-Obj-' + i);
                        alert(value);
                    }
                }
            }
        })(),

        // A Bookmark object for the manager to work with
        Bookmark: function (params) {
            var params = params || {};

            var title = params["title"] || "";
            var description = params["description"] || "";
            var src = params["src"] || "";
            var startTime = parseFloat(params["startTime"] || 0);
            var endTime = parseFloat(params["endTime"] || 0);

            if (startTime < 0 || endTime < 0) throw "Start and end times must be positive!";
            else if (startTime == endTime) throw "Start and end times can not be the same!";
            else if (startTime < endTime) {
                startTime = startTime;
                endTime = endTime;
            } else {
                endTime = startTime;
                startTime = endTime;
            }

            this.getTitle = function () {
                return title;
            }, this.getDescription = function () {
                return description;
            }, this.getSrc = function () {
                return src;
            }, this.getStartTime = function () {
                return startTime;
            }, this.getEndTime = function () {
                return endTime;
            }, this.toString = function () {
                return "Source: " + src + "\nTitle: " + title + "\nDescription: " + description + "\nStart Time: " + startTime + "\nEnd Time: " + endTime;
            }, this.toJSON = function () {
                return '{ "src": "' + src + '", "title": "' + title + '", "description": "' + description + '", "startTime": ' + startTime + ', "endTime": ' + endTime + ' }';
            }
        },
        // A Video object for the manager to work with
        Video: function (params) {
            var id = 0;
            var title = "";
            var description = "";
            var duration = "";
            var src = "";
            var rating = "";
            var thumbnailSrc = "";
            var tags = [];

            if (params) {
                id = params['id'];
                title = params['title'];
                description = params['description'];
                duration = params['duration'];
                src = params['src'];
                rating = params['rating'];
                thumbnailSrc = params['thumbnailSrc'];
            }

            return {
                getId: function () {
                    return id;
                },
                getTitle: function () {
                    return title;
                },
                getDescription: function () {
                    return description;
                },
                getDuration: function () {
                    return duration;
                },
                getSrc: function () {
                    return src;
                },
                getRating: function () {
                    return rating;
                },
                getThumbnailSrc: function () {
                    return thumbnailSrc;
                }
            }
        },
        // A Statistics object for the manager to work with
        Statistics: function (params) {
            var ip = 0;
            var onLoad = false;
            var _25 = false;
            var _50 = false;
            var _75 = false;
            var _90 = false;
            var _100 = false;
            var cc_on = false;
            var cc_off = false;
            var ad_on = false;
            var ad_off = false;

            if (params) {
                ip = params['ip'];
                onLoad = params['onLoad'];
                _25 = params['_25'];
                _50 = params['_50'];
                _75 = params['_75'];
                _90 = params['_90'];
                _100 = params['_100'];
                //cc_on = params['cc_on'];
                //cc_off = params['cc_off'];
                //ad_on = params['ad_on'];
                //ad_off = params['ad_off'];
            }

            return {
                getIp: function () {
                    return ip;
                },
                getOnLoad: function () {
                    return onLoad;
                },
                get25: function () {
                    return _25;
                },
                get50: function () {
                    return _50;
                },
                get75: function () {
                    return _75;
                },
                get90: function () {
                    return _90;
                },
                get100: function () {
                    return _100;
                }
            }
        },
        fetchVideos: function () {
            // Eventually be replaced by server calls			
            bbb.addRecVideo({
                id: 1,
                title: 'Green Screen',
                description: 'Demo',
                duration: '0:10',
                src: 'http://matrix.senecac.on.ca/~kclascon/DPS909/d4/video.ogv',
                rating: 'G',
                thumbnailSrc: 'video.jpg',
                tags: ['test']
            });
            bbb.addRecVideo({
                id: 2,
                title: 'Big Buck Bunny',
                description: 'An animated video',
                duration: '0:32',
                src: 'http://upload.wikimedia.org/wikipedia/commons/7/75/Big_Buck_Bunny_Trailer_400p.ogg',
                rating: 'G',
                thumbnailSrc: 'bunny.jpg',
                tags: ['test']
            });
            bbb.addRecVideo({
                id: 3,
                title: 'Indy',
                description: 'Cars on the track',
                duration: '0:24',
                src: 'http://jbuckley.ca/~hoops/indy.ogv',
                rating: 'G',
                thumbnailSrc: 'indy.jpg',
                tags: ['test']
            });
            bbb.addRecVideo({
                id: 4,
                title: 'Dire Wolf Fanclub',
                description: '???',
                duration: '2:28',
                src: 'http://jbuckley.ca/~hoops/DireWolfFanClub.ogv',
                rating: 'G',
                thumbnailSrc: 'dwfc.jpg',
                tags: ['test']
            });
        },
        // (Re-)initialize all values except internal element pointers
        // (Re-)initialize all values
        init: function (params) {
            params = params || {};

            if (canVideo) {
                this.setVideoId(params.playerId);
                this.setTOCId(params.tocId);

                // Default search directory "BBB" for callPage
                // Careful, cross-origin issues may result if specified
                endPoint.root = params.remoteServer || location.href.substring(0, location.href.lastIndexOf("/BBB/") + 5);
                endPoint.service = params.chapterStorage || "";

                this.fetchVideos();
                this.fetchChapters(endPoint.fullUri());

                if (params.statistics) bbb.trackStatistics();

                if (params.watermark) {
                    bbb.displayWatermark();
                }

                if (params.formDivId) {
                    bbb.popcornGenerator.setupWhenReady(params.formDivId);
                }
            }
        },

        setupWhenReady: function (params) {
            var self = this;

            addEvent(document, "DOMContentLoaded", function () {
                self.init(params);
            });
        },

        fetchChapters: function (endPoint) {
            var request = new XMLHttpRequest();

            _chapters = [];
            _hasMadeToc = false;
            _hasTocChanged = true; // In event TOC has been output before calling init, this will redraw table
            _curr = -1;

            request.open("GET", endPoint);
            request.onreadystatechange = function () {
                var arr = [];
                var i = 0,
                    numItems = 0;

                if (request.readyState == 4 && request.status == 200) {
                    arr = JSON.parse(request.responseText);
                    numItems = arr.length;
                    for (i = 0; i < numItems; i++) {
                        bbb.addChapter(arr[i]);
                    }

                    bbb.printTOC();
                    bbb.onReady();
                }
            };
            request.send();
        },

        // Add a chapter
        addChapter: function (_c) {
            _chapters.push(new bbb.Bookmark(_c));
            _hasTocChanged = true;
        },
        // Add a chapter
        removeChapter: function (_idx) {
            _chapters.splice(_idx, 1);
            _hasTocChanged = true;
        },

        // Chapters module
        chapters: (function () {
            var tempIn = 0;
            var tempOut = 0;

            return {
                setStartEnd: function (timeToSet, isStart) {
                    if (isStart) tempIn = timeToSet;
                    else tempOut = timeToSet;
                },

                getTempIn: function () {
                    return tempIn;
                },

                getTempOut: function () {
                    return tempOut;
                },

                // obj contains title, description, source
                // Compliments tempIn and tempOut to produce all information for a chapter
                makeChapter: function (obj) {
                    obj.startTime = tempIn;
                    obj.endTime = tempOut;

                    // May throw error if params are invalid
                    bbb.addChapter(obj, true);

                    tempIn = 0;
                    tempOut = 0;
                }
            }
        })(),

        // Add a video
        addRecVideo: function (_v) {
            _recommended.push(bbb.Video(_v));
        },
        // Set initial video
        setVideo: function (_v) {
            _video = (bbb.Video(_v));
        },
        // Get initial video
        getVideo: function () {
            return _video;
        },
        // Output video info
        printVideoInfo: function (_c) {
            if (_c === true) {
                var info = document.createElement('div');
                info.setAttribute('id', 'vidInfo');
                info.innerHTML = '<b>Video Information</b><br/>Title: ' + _video.getTitle() + '<br/>Description: ' + _video.getDescription() + '<br/>Duration: ' + _video.getDuration() + ' sec' + '<br/>Rating: ' + _video.getRating();
                document.body.appendChild(info);
            }
            else {
                var existing = document.getElementById('vidInfo');
                document.body.removeChild(existing);
            }
        },
        // Set statistics
        setStatistics: function (_s) {
            _stats = (bbb.Statistics(_s));
        },
        // Output video stats
        printVideoStats: function () {
            var vidStats = document.createElement('div');
            vidStats.setAttribute('id', 'vidStats');
            vidStats.innerHTML = '<b>Stats</b><br/>IP: ' + _stats.getIp() + '<br/>Reached 25%: ' + _stats.get25() + '<br/>Reached 50%: ' + _stats.get50() + '<br/>Reached 75%: ' + _stats.get75() + '<br/>Reached 90%: ' + _stats.get90() + '<br/>Reached 100%: ' + _stats.get100();
            document.body.appendChild(vidStats);
        },
        // Set the table of contents (<table>) and player (<video>) elements based on id
        // Only set them if the currently stored element is null or has a differing id
        setTOCId: function (_id) {
            if (_id && (!this._toc || this._toc.id !== _id)) { // Valid id given and No id supplied yet or different id supplied
                this._toc = document.getElementById(_id);
                _hasTocChanged = true;
            }
        },
        setVideoId: function (_id) {
            if (canVideo) {
                if (_id && (!this._vid || this._vid.id !== _id)) { // valid id given and No id supplied yet or different id supplied
                    // Store locally for easy reference for event setup
                    this._vid = document.getElementById(_id);
                }
            }
        },
        // output the TOC
        printTOC: function () {
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

                        // Adding in class attribute for tr.
                        // The nodrop nodrag class is required to disable the tr from being dragable.
                        // Since it is tr that contains the titles it should not move
                        tr.setAttribute('class', 'nodrop nodrag');

                        _hasMadeToc = true;
                    }

                    if (_hasTocChanged) {
                        // Delete existing rows
                        for (var i = this._toc.rows.length - 1; i > 0; i--)
                        this._toc.deleteRow(i);

                        for (var i = _chapters.length - 1; i >= 0; i--) {
                            tr = this._toc.insertRow(1);
                            srcElem = document.createElement('a');
                            var item = _chapters[i];
                            // Adding in id attribute for tr, required for drag and drop sorting
                            tr.setAttribute('id', i);
                            srcElem.href = 'javascript:bbb.playChapter(' + i + ');';
                            srcElem.innerHTML = item.getTitle();
                            tr.insertCell(0).appendChild(srcElem);
                            tr.insertCell(1).appendChild(document.createTextNode(item.getDescription()));
                            tr.insertCell(2).appendChild(document.createTextNode(item.getStartTime().toFixed(2)));
                            tr.insertCell(3).appendChild(document.createTextNode(item.getEndTime().toFixed(2)));
                            tr.insertCell(4).innerHTML = '<input type="checkbox" onclick="bbb.removeChapter(' + i + '); bbb.printTOC();" />';
                        }

                        tr = this._toc.insertRow(1);
                        tr.colspan = 4;

                        srcElem = document.createElement('a');
                        srcElem.href = 'javascript:bbb.playChapter(0, 1);';
                        srcElem.innerHTML = 'Play All';
                        tr.insertCell(0).appendChild(srcElem);
                        // Adding in class attribute for tr.
                        // The nodrop nodrag class is required to disable the tr from being dragable.
                        // Since it is tr that contains the play all button it should not move					
                        tr.setAttribute('class', 'nodrop nodrag');

                        _hasTocChanged = false;

                        $("#tblOfContents").tableDnD({
                            onDragClass: "myDragClass",
                            onDrop: function (table, row) {
                                _tocRows = table.tBodies[0].rows;
                            }
                        });
                    }
                }
            }
        },
        playChapter: function (idx, sequential) {
            if (canVideo) {
                if (idx !== _curr && idx >= 0 && idx < _chapters.length) {
                    var vid = this._vid;
                    bbb.popcornGenerator.setActiveVideo(vid);
                    _curr = idx;
                    currChap = _chapters[_curr];
                    bbb.onChangeVideo(currChap);

                    vid.addEventListener('loadedmetadata', function () {
                        vid.currentTime = currChap.getStartTime();
                    }, true);

                    vid.addEventListener('canplay', function () {
                        vid.play();
                    }, true);

                    vid.addEventListener('timeupdate', function () {
                        if (vid.currentTime >= currChap.getEndTime()) {
                            if (sequential) {
                                bbb.playChapter(idx + 1, sequential);
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
        checkOrder: function () {
            if (_tocRows) {
                // i starts at 2 to ignore the first 2 rows (titles and play all rows)
                for (var i = 2, rows = _tocRows.length; i < rows; i++) {
                    alert(_tocRows[i].id + " ");
                }
            }
        },
        changeOrder: function () {
            Array.prototype.ordered = function (order) {
                var arr = this;
                order = order || this.order;
                return order.map(function (itm) {
                    return arr[itm];
                });
            };

            // Re-factor this
            if (_tocRows.length != 0) {
                var j = 0;
                var rows = [];
                // i starts are due to ignore the first 2 rows (title row, and play all row)				
                for (var i = 2, r = _tocRows.length; i < r; i++) {
                    rows[j] = _tocRows[i].id;
                    j++;
                }

                var bms = _chapters;
                bms.order = rows;
                _chapters = bms.ordered();
                _hasTocChanged = true;
                bbb.printTOC();
            }
        },
        trackStatistics: function (ip) {
            var stats = {
                ip: 0,
                onLoad: false,
                _25: false,
                _50: false,
                _75: false,
                _90: false,
                _100: false,
                cc_on: false,
                cc_off: false,
                ad_on: false,
                ad_off: false
            };

            var vid = this._vid;
            var duration = vid.duration;
            $.getJSON("http://jsonip.appspot.com?callback=?", function (data) {
                stats.ip = data.ip;
            });
            var durationListener = function () {
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

            var endListener = function () {
                stats._100 = true;
                //Debugging purposes
                alert('[Statistics]\nIP: ' + stats.ip + '\n25%: ' + stats._25 + '\n50%: ' + stats._50 + '\n75%: ' + stats._75 + '\n90%: ' + stats._90 + '\n100%: ' + stats._100);
                //Add in cc and add stuff later
                bbb.setStatistics({
                    ip: stats.ip,
                    _25: stats._25,
                    _50: stats._50,
                    _75: stats._75,
                    _90: stats._90,
                    _100: stats._100
                });
                var s = document.getElementById('vidStats');
                if (s) {
                    document.body.removeChild(s);
                }
                //bbb.printVideoStats();
                if (_stats) {
                    _stats = null;
                }
                bbb.displayRecommendedVideos();
            }
            vid.addEventListener('timeupdate', durationListener, false);
            vid.addEventListener('ended', endListener, false);
        },
        // Stub method to send stats to BBB server
        sendStatistics: function () {
            // Probably convert statistics object into JSON and send it
        },
        // Displays rec'd videos
        displayRecommendedVideos: function () {
            var numVids = _recommended.length;
            var i;
            var recCont = document.createElement('div');
            recCont.setAttribute('id', 'container');
            recCont.style.position = "absolute";
            document.body.appendChild(recCont);
            var cont = document.getElementById('container');
            for (i = 0; i < numVids; ++i) {
                // Generate thumbnails
                var image = document.createElement('img');
                image.src = _recommended[i].getThumbnailSrc();
                image.style.width = 70 + 'px';
                image.style.height = 70 + 'px';
                cont.appendChild(image);
                // Generate title and duration links that will play the video
                var info = document.createElement('div');
                info.href = 'javascript:bbb.test();';
                info.innerHTML = '<a href="javascript:bbb.playVideo(' + i + ');">' + _recommended[i].getTitle() + ' - ' + _recommended[i].getDuration(); + '</a>';
                cont.appendChild(info);
            }
        },
        // Will play a video using an index from an array of videos
        // Will need to refactor to support tags to retrieve related videos
        playVideo: function (idx) {
            var vid = this._vid;
            vid.src = _recommended[idx].getSrc();
            vid.load();
            vid.play();
            var cont = document.getElementById('container');
            document.body.removeChild(cont);
            _video = _recommended[idx];
            //This is a hack, fix later
            bbb.printVideoInfo(false);
            bbb.printVideoInfo(true);
        },
        displayWatermark: function (src, opacity, alpha) {
            //Try and clean up code later :(
            var vid = this._vid;
            // Position of video player
            var videoTop = parseInt(vid.style.top);
            var videoLeft = parseInt(vid.style.left);
            // Create div element
            var watermarkDiv = document.createElement('div');
            // Set div attributes
            watermarkDiv.setAttribute('id', 'watermark');
            watermarkDiv.className = 'watermark';
            watermarkDiv.style.position = 'absolute';
            watermarkDiv.style.left = videoLeft + 5 + 'px';
            watermarkDiv.style.top = videoTop + 5 + 'px';
            // Width and height will be hard-coded for now, will re-factor later
            watermarkDiv.style.width = 150 + 'px';
            watermarkDiv.style.height = 70 + 'px';
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
            watermarkDiv.style.filter = "alpha(opacity=" + alpha + ")";
            document.body.appendChild(watermarkDiv);
        },
        popcornGenerator: (function () {
            var SERVER = "popcornServer.php"; // Should be const, var for IE support
            var doc = document;
            var formMod = "",
                recMod = "",
                current = "",
                timeDisplay = "";
            var currentIn = 0,
                currentOut = 0;
            var vid = 0;
            //var activeVid = _vid;
            // Still working on, will be workaround for DOM input element creation in IE
/*var isInputTypeQuirk = (function() {
try {
var elem = doc.createElement("input");
elem["type"] = "text";
return false;
} catch (e) {
return true;
}
})();*/

            // Factory of command object generators \\
            // ------------------------------------ \\
            var types = {
                videotag: (function () {
                    var txtTag = makeInput("text", "txtVideoTag");

                    return {
                        outputHTML: function () {
                            clearChildren(formMod);
                            showTimelineEntry('inthisvideo');
                            recMod.style.display = "none";

                            formMod.appendChild(bindLabel(txtTag, 'Tag: '));
                            //formMod.innerHTML = 'Note: <input id="footText" name="footText" type="text" /><br />';
                        },

                        buildManifest: function () {
                            var timelineEntry = new TimelineEntry();

                            return {
                                manifestCat: '',
                                timelineCat: 'resources',
                                manifestXML: '',
                                timelineXML: '<videotag in="' + timelineEntry["in"] + '" out="' + timelineEntry.out + '" target="' + timelineEntry.target + '">' + txtTag.value + '</videotag>'
                            };
                        }
                    }
                })(),
                footnote: (function () {
                    var txtNote = makeInput("text", "footText");

                    return {
                        outputHTML: function () {
                            clearChildren(formMod);
                            showTimelineEntry('footnotediv');
                            recMod.style.display = "none";

                            formMod.appendChild(bindLabel(txtNote, 'Note: '));
                            //formMod.innerHTML = 'Note: <input id="footText" name="footText" type="text" /><br />';
                        },

                        buildManifest: function () {
                            var timelineEntry = new TimelineEntry();

                            return {
                                manifestCat: '',
                                timelineCat: 'footnotes',
                                manifestXML: '',
                                timelineXML: '<footnote in="' + timelineEntry["in"] + '" out="' + timelineEntry.out + '" target="' + timelineEntry.target + '">' + txtNote.value + '</footnote>'
                            };
                        }
                    }
                })(),
                lastfm: (function () {
                    var txtArtist = makeInput("text", "lastFMArtist");

                    return {
                        outputHTML: function () {
                            clearChildren(formMod);
                            showTimelineEntry('lastfmdiv');
                            recMod.style.display = "none";

                            formMod.appendChild(bindLabel(txtArtist, 'Artist: '));
                            //formMod.innerHTML = 'Artist: <input id="lastFMArtist" name="lastFMArtist" type="text" /><br />';
                        },

                        buildManifest: function () {
                            var timelineEntry = new TimelineEntry();

                            return {
                                manifestCat: '',
                                timelineCat: 'resources',
                                manifestXML: '',
                                timelineXML: '<wiki in="' + timelineEntry["in"] + '" out="' + timelineEntry.out + '" target="' + timelineEntry.target + '" artist="' + txtArtist.value + '"/>'
                            };
                        }
                    }
                })(),
                twitter: (function () {
                    var controls = {
                        title: makeInput("text", "twitterTitle"),
                        source: makeInput("text", "twitterSource"),
                        width: makeInput("text", "twitterWidth"),
                        height: makeInput("text", "twitterHeight")
                    };

                    return {
                        outputHTML: function () {
                            clearChildren(formMod);
                            showTimelineEntry('personaltwitter');
                            recMod.style.display = "none";

                            var frag = newLine(bindLabel(controls.title, 'Title: '));
                            frag.appendChild(newLine(bindLabel(controls.source, 'Source: ')));
                            frag.appendChild(newLine(bindLabel(controls.width, 'Width: ')));
                            frag.appendChild(newLine(bindLabel(controls.height, 'Height: ')));

                            formMod.appendChild(frag);
                            //formMod.innerHTML = 'Artist: <input id="lastFMArtist" name="lastFMArtist" type="text" /><br />';
                        },

                        buildManifest: function () {
                            var timelineEntry = new TimelineEntry();

                            return {
                                manifestCat: '',
                                timelineCat: 'resources',
                                manifestXML: '',
                                timelineXML: '<wiki in="' + timelineEntry["in"] + '" out="' + timelineEntry.out + '" target="' + timelineEntry.target + '"/>' + '" title="' + controls.title.value + '" source="' + controls.source.value + '" width="' + controls.width.value + '"/>' + '" height="' + controls.height.value + '"/>'
                            };
                        }
                    }
                })(),
                googlenews: (function () {
                    var txtTopic = makeInput("text", "gNewsTopic");

                    return {
                        outputHTML: function () {
                            clearChildren(formMod);
                            showTimelineEntry('googlenewsdiv');
                            recMod.style.display = "none";

                            formMod.appendChild(bindLabel(txtTopic, 'Topic: '));
                            //formMod.innerHTML = 'Topic: <input id="gNewsTopic" name="gNewsTopic" type="text" /><br />';
                        },

                        buildManifest: function () {
                            var timelineEntry = new TimelineEntry();

                            return {
                                manifestCat: '',
                                timelineCat: 'resources',
                                manifestXML: '',
                                timelineXML: '<wiki in="' + timelineEntry["in"] + '" out="' + timelineEntry.out + '" target="' + timelineEntry.target + '" topic="' + txtTopic.value + '"/>'
                            };
                        }
                    }
                })(),
                wiki: (function () {
                    var txtNumWords = makeInput("number", "wikiNumWords");
                    txtNumWords.step = 1;
                    txtNumWords.min = 1;

                    return {
                        outputHTML: function () {
                            clearChildren(formMod);
                            showTimelineEntry('wikidiv');
                            recMod.style.display = "block";

                            formMod.appendChild(bindLabel(txtNumWords, 'Number of Words: '));

                            //formMod.innerHTML = '# Words: <input id="wikiNumWords" name="wikiNumWords" type="number" step="1" min="1" /><br />';
                        },

                        buildManifest: function () {
                            var reSrc = new ManifestEntry();
                            var timelineEntry = new TimelineEntry();

                            return {
                                manifestCat: 'articles',
                                timelineCat: 'resources',
                                manifestXML: '<resource id="' + reSrc.id.value + '" src="' + reSrc.src.value + '" description="' + reSrc.description.value + '"/>',
                                timelineXML: '<wiki in="' + timelineEntry["in"] + '" out="' + timelineEntry.out + '" target="' + timelineEntry.target + '" resourceid="' + reSrc.id.value + '" numberOfWords="' + txtNumWords.value + '"/>'
                            };
                        }
                    }
                })(),
                flickr: (function () {
                    var controls = {
                        numberofimages: makeInput("number", "flickrNumImgs"),
                        userid: makeInput("text", "flickrUserId"),
                        padding: makeInput("number", "flickrPadding")
                    };

                    controls.numberofimages.step = controls.padding.step = 1;
                    controls.numberofimages.min = controls.padding.min = 1;

                    return {
                        outputHTML: function () {
                            clearChildren(formMod);
                            showTimelineEntry('personalflickr');
                            recMod.style.display = "none";

                            var frag = newLine(bindLabel(controls.numberofimages, '# Images: '));
                            frag.appendChild(newLine(bindLabel(controls.userid, 'User ID: ')));
                            frag.appendChild(newLine(bindLabel(controls.padding, 'Padding: ')));

                            formMod.appendChild(frag);

                            //formMod.innerHTML = '# Images: <input id="flickrNumImgs" name="flickrNumImgs" type="number" step="1" min="1" /><br />'
                            // +'User ID: <input id="flickrUserId" name="flickrUserId" type="text" /><br />'
                            // +'Padding: <input id="flickrPadding" name="flickrPadding" type="number" step="1" min="1" /><br />';
                        },
                        buildManifest: function () {
                            var timelineEntry = new TimelineEntry();

                            return {
                                manifestCat: '',
                                timelineCat: 'resources',
                                manifestXML: '',
                                timelineXML: '<flickr in="' + timelineEntry["in"] + '" out="' + timelineEntry.out + '" target="' + timelineEntry.target + '" numberofimages="' + controls.numberofimages.value + '" userid="' + controls.userid.value + '" padding="' + controls.padding.value + 'px"/>'
                            };
                        }
                    }
                })()
            };

            // Formatting \\
            // ---------- \\


            function formatTime(t) {
                var sec = Math.floor(t);

                // hh:mm:ss:ms
                return padNum(Math.floor(sec / 3600), 2) + ":" + padNum(Math.floor(sec / 60), 2) + ":" + padNum(sec, 2) + ":" + padNum(Math.round((t - sec) * 100), 2);
            }

            function padNum(num, len) {
                var str = '' + num;
                for (var i = str.length; i < len; i++) {
                    str = '0' + str;
                }

                return str;
            }

            // Basic Objects \\
            // ------------- \\


            function ManifestEntry() {
                this.id = doc.getElementById("resrcId");
                this.src = doc.getElementById("resrcSrc");
                this.description = doc.getElementById("resrcDesc");
            }

            function TimelineEntry() {
                this.target = doc.getElementById("timelineTarget").value;
                this["in"] = formatTime(currentIn);
                this.out = formatTime(currentOut);
            }

            // DOM Maniplation Functions \\
            // ------------------------- \\


            function makeInput(inputType, id, value) {
                var input = doc.createElement("input");
                input["type"] = inputType; // Will crash in IE 8, but HTML5 video not supported anyways!
                input.id = input.name = id;

                if (value) input.value = value;

                return input;
            }

            function bindLabel(input, labelText) {
                var frag = doc.createDocumentFragment();
                var lbl = doc.createElement('label');

                lbl["for"] = input.id;
                lbl.style.display = "block";
                lbl.style.cssFloat = "left";
                lbl.style.width = "200px";
                lbl.appendChild(doc.createTextNode(labelText));

                frag.appendChild(lbl);
                frag.appendChild(input);
                return frag;
            }

            function newLine(frag) {
                if (!frag || !frag.nodeType) return doc.createElement('br');

                switch (frag.nodeType) {
                case 1:
                    // Element Node
                case 3:
                    // Text Node
                    var fgmt = doc.createDocumentFragment();
                    fgmt.appendChild(frag);
                    fgmt.appendChild(doc.createElement('br'));
                    return fgmt;
                    break;

                case 11:
                    // Doc Fragment
                    frag.appendChild(doc.createElement("br"));
                    return frag;
                    break;

                default:
                    return doc.createElement('br');
                    break;
                }

            }

            function clearChildren(node) {
                while (node.hasChildNodes()) {
                    node.removeChild(node.lastChild);
                }
            }

            // XHR, Remoting and Events \\
            // ------------------------ \\


            function sendDataToServer(endPoint, manifestData, actionType) {
                var xhr = new XMLHttpRequest();
                var params = [];

                // Build query string
                params.push('action=' + actionType);

                for (obj in manifestData) {
                    params.push("&" + obj + "=" + encodeURIComponent(manifestData[obj]));
                }

                xhr.open("POST", endPoint);
                xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                xhr.onreadystatechange = function () {
                    if (xhr.readyState == 4 && xhr.status == 200) {
                        if (xhr.responseText) alert(xhr.responseText);
                    }
                };

                xhr.send(params.join(''));
            }

            // Form Display \\
            // ------------ \\


            function showTimelineEntry(targetDiv) {
                var frag = doc.createDocumentFragment();
                var btnSetStart = makeInput("button", "timelineIn", "Set Start");
                var btnSetEnd = makeInput("button", "timelineOut", "Set End");
                var gen = bbb.popcornGenerator;

                addEvent(btnSetStart, "click", function () {
                    gen.setTimeFromVideo(true);
                    showStartEnd();
                });
                addEvent(btnSetEnd, "click", function () {
                    gen.setTimeFromVideo(false);
                    showStartEnd();
                });

                if (!timeDisplay) {
                    timeDisplay = doc.createElement('span');
                }

                showStartEnd();
                frag.appendChild(btnSetStart);
                frag.appendChild(btnSetEnd);
                frag.appendChild(timeDisplay);
                frag.appendChild(doc.createElement('br'));
                frag.appendChild(makeInput("hidden", "timelineTarget", targetDiv));
                formMod.appendChild(frag);

/*formMod.innerHTML = 'TIMELINE<br />'+
'<input type="button" id="timelineIn" name="timelineIn" value="Set Start" />'+
'<input type="button" id="timelineOut" name="timelineOut" value="Set End" /><br />'+
'Target: <input type="text" id="timelineTarget" name="timelineTarget" /><br />';*/
            }

            function showStartEnd() {
                timeDisplay.innerHTML = "Chapter from: " + currentIn.toFixed(2) + " to " + currentOut.toFixed(2);
            }

            function showResourceEntry() {
                // Output generic data entry
                var frag = doc.createDocumentFragment();
                frag.appendChild(newLine(bindLabel(makeInput("text", "resrcId"), "Resource ID: ")));
                frag.appendChild(newLine(bindLabel(makeInput("text", "resrcSrc"), "URL: ")));
                frag.appendChild(newLine(bindLabel(makeInput("text", "resrcDesc"), "Description: ")));
                recMod.appendChild(frag);

/*doc.getElementById(mainEntryDivId).innerHTML = 'RESOURCE<br />'+
'ID: <input type="text" id="resrcId" name="resrcId" /><br />'+
'Source: <input type="text" id="resrcSrc" name="resrcSrc" /><br />'+
'Description: <input type="text" id="resrcDesc" name="resrcDesc" /><br />';*/
            }
            // Publically Returned Object \\
            // -------------------------- \\
            return {
                setActive: function (key, updateUI) {
                    current = types[key];
                    if (updateUI) current.outputHTML();
                },
                setActiveVideo: function (v) {
                    vid = v;
                },
                setTimeFromVideo: function (isStart) {
                    if (isStart) currentIn = vid.currentTime;
                    else currentOut = vid.currentTime;
                },
                savePopcorn: function () {
                    if (currentIn == currentOut) throw new Error("Start and end time must be different!");

                    sendDataToServer(endPoint.root + SERVER, current.buildManifest(), "add");
                },
                setupWhenReady: function (formDivId) {
                    var self = bbb.popcornGenerator;
                    var frag = doc.createDocumentFragment();
                    var mainForm = doc.createElement('form');
                    var btnSubmit = makeInput("button", "metadataSubmit", "ADD");
                    var selElem = doc.createElement("select");

                    mainForm.id = "metadataForm";
                    mainForm.method = "post";
                    mainForm.action = "?action=add";

                    formMod = doc.createElement('div');
                    formMod.id = formMod.name = 'popMetadataEntry';

                    recMod = doc.createElement('div');
                    recMod.id = formMod.name = 'popMainDataEntry';
                    selElem.id = selElem.name = "selMetaType";

                    // Build selection box and hook in events
                    selElem.innerHTML = '<option value="wiki">Wikipedia</option>' + '<option value="flickr">Flickr</option>' + '<option value="googlenews">Google News</option>' + '<option value="lastfm">LastFM</option>' + '<option value="twitter">Twitter</option>' + '<option value="videotag">Video Tag</option>' + '<option value="footnote">Footnote</option>';

                    frag.appendChild(bindLabel(selElem, "Type: "));
                    frag.appendChild(recMod);
                    frag.appendChild(formMod);
                    frag.appendChild(btnSubmit);
                    mainForm.appendChild(frag);

                    showResourceEntry();
                    addEvent(btnSubmit, "click", function () {
                        try {
                            self.savePopcorn();
                        } catch (e) {
                            alert(e);
                        }
                    });
                    addEvent(selElem, "change", function () {
                        self.setActive(selElem.value, true);
                    });

                    // Add to document and set active
                    doc.getElementById(formDivId).appendChild(mainForm);
                    self.setActive(selElem.value, true);
                }
            };
        })()
    };
})();

bbb.onReady = function () {};
bbb.onChangeVideo = function (currChap) {};

bbb.Bookmark.prototype = {
    fromJSON: function (str) {
        if (JSON) return new bbb.Bookmark(JSON.parse(str));
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
                                if (foundType === 2) foundType = 3;
                            } else {
                                if (str[currEnd] === ' ') {
                                    if (foundType === 2 || foundType === 3) { // Check for end of numeric data
                                        if (foundType === 2) // Integer
                                        obj[attrName] = parseInt(str.substring(currStart, currEnd));
                                        else if (foundType === 3) // Float
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

            return new bbb.Bookmark(obj);
        }
    },
    equals: function (bkmrk) {
        return this.getSrc() === bkmrk.getSrc() && this.getTitle() === bkmrk.getTitle() && this.getDescription() === bkmrk.getDescription() && this.getStartTime() === bkmrk.getStartTime() && this.getEndTime() === bkmrk.getEndTime();
    }
};