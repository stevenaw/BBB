/*
 * 	BBB v0.2
 * 		By Steven Weerdenburg and Kevin Lasconia
 * 		Last Modification: 11/16/2010
 */
var Mgr = (function () {
    var _chapters = []; // Array of Chapters/Bookmarks
    var _recommended = []; // Array of recommended videos
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

    return {
        // A Bookmark object for the manager to work with
        Bookmark: function (params) {
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

                if (startTime < 0 || endTime < 0) throw "Start and end times must be positive!";
                else if (startTime < endTime) {
                    startTime = startTime;
                    endTime = endTime;
                } else {
                    endTime = startTime;
                    startTime = endTime;
                }
            }

            return {
                getTitle: function () {
                    return title;
                },
                getDescription: function () {
                    return description;
                },
                getSrc: function () {
                    return src;
                },
                getStartTime: function () {
                    return startTime;
                },
                getEndTime: function () {
                    return endTime;
                },
                toString: function () {
                    return "Source: " + src + "\nTitle: " + title + "\nDescription: " + description + "\nStart Time: " + startTime + "\nEnd Time: " + endTime;
                },
                toJSON: function () {
                    return '{ "src": "' + src + '", "title": "' + title + '", "description": "' + description + '", "startTime": ' + startTime + ', "endTime": ' + endTime + ' }';
                },
                equals: function (bkmrk) {
                    return src === bkmrk.getSrc() && title === bkmrk.getTitle() && description === bkmrk.getDescription() && startTime === bkmrk.getStartTime() && endTime === bkmrk.getEndTime();
                },
                fromJSON: function (str) {
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

                    return Mgr.Bookmark(obj);
                }
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
        fetchBookmarks: function () {
            // Stub code, will eventually get bookmarks from server call
        },
        fetchVideos: function () {
            // Eventually be replaced by server calls
            Mgr.addRecVideo({
                id: 1,
                title: 'Green Screen',
                description: 'Demo',
                duration: '0:10',
                src: 'http://matrix.senecac.on.ca/~kclascon/DPS909/d4/video.ogv',
                rating: 'G',
                thumbnailSrc: 'video.jpg',
                tags: ['test']
            });
            Mgr.addRecVideo({
                id: 2,
                title: 'Big Buck Bunny',
                description: 'An animated video',
                duration: '0:32',
                src: 'http://upload.wikimedia.org/wikipedia/commons/7/75/Big_Buck_Bunny_Trailer_400p.ogg',
                rating: 'G',
                thumbnailSrc: 'bunny.jpg',
                tags: ['test']
            });
            Mgr.addRecVideo({
                id: 3,
                title: 'Indy',
                description: 'Cars on the track',
                duration: '0:24',
                src: 'http://jbuckley.ca/~hoops/indy.ogv',
                rating: 'G',
                thumbnailSrc: 'indy.jpg',
                tags: ['test']
            });
            Mgr.addRecVideo({
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
        init: function (vidId, tocId, updateEvent, canPlayEvent, ip) {
            _chapters = [];
            _hasMadeToc = false;
            _hasTocChanged = true; // In event TOC has been output before calling init, this will redraw table
            _curr = -1;

            this.setVideoId(vidId, updateEvent, canPlayEvent);
            this.setTOCId(tocId);
            Mgr.fetchBookmarks();
            Mgr.fetchVideos();
        },
        // Add a chapter
        addChapter: function (_c) {
            _chapters.push(Mgr.Bookmark(_c));
            _hasTocChanged = true;
        },
        // Add a chapter
        removeChapter: function (_idx) {
            _chapters.splice(_idx, 1);
            _hasTocChanged = true;
        },
        // Add a video
        addRecVideo: function (_v) {
            _recommended.push(Mgr.Video(_v));
        },
        // Set initial video
        setVideo: function (_v) {
            _video = (Mgr.Video(_v));
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
            _stats = (Mgr.Statistics(_s));
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
                            tr.insertCell(4).innerHTML = '<input type="checkbox" onclick="Mgr.removeChapter(' + i + '); Mgr.printTOC();" />';
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

        playChapter: function (idx, sequential) {
            if (canVideo) {
                if (idx !== _curr && idx >= 0 && idx < _chapters.length) {
                    var vid = this._vid;

                    _curr = idx;
                    currChap = _chapters[_curr];

                    vid.addEventListener('loadedmetadata', function () {
                        vid.currentTime = currChap.getStartTime();
                    }, true);

                    vid.addEventListener('canplay', function () {
                        vid.play();
                    }, true);

                    vid.addEventListener('timeupdate', function () {
                        if (vid.currentTime >= currChap.getEndTime()) {
                            if (sequential) {
                                Mgr.playChapter(idx + 1, sequential);
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
                Mgr.setStatistics({
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
                //Mgr.printVideoStats();
                if (_stats) {
                    _stats = null;
                }
                Mgr.displayRecommendedVideos();
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
                info.href = 'javascript:Mgr.test();';
                info.innerHTML = '<a href="javascript:Mgr.playVideo(' + i + ');">' + _recommended[i].getTitle() + ' - ' + _recommended[i].getDuration(); + '</a>';
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
            Mgr.printVideoInfo(false);
            Mgr.printVideoInfo(true);
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
        }
    };
})();