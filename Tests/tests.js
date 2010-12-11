bbb.testing = (function() {
  var tests = [];
  
  return {
    addTest: function(_title, _func) {
      tests.push({title: _title, func: _func});
    },
    
    test: function() {
      var l = tests.length;
      var success = true;
      var noPassed = 0;
      var currTest = 0;
      
      for(var i=0;i<l; i++) {
        currTest = tests[i];
        
        try {
          success = currTest.func();
          
          if (success) noPassed++;
          else alert(success.title+" failed");
        } catch (e) {
          alert(e);
        }
      }
      
      alert(noPassed+"/"+l+" tests passed");
    }
  }
})();

bbb.testing.addTest("JSON Serialization", function(){
  var book1 = new bbb.Bookmark({
      src: "localhost",
      title: "Test1",
      description: "",
      startTime: 0,
      endTime: 500});
      
  var book2 = new bbb.Bookmark({
      src: "google",
      title: "Test 2",
      description: "",
      startTime: 603,
      endTime: 1220});
  
  var ser = book1.toJSON();
  var book3 = bbb.Bookmark.prototype.fromJSON(ser);
  var book4;
  
  ser = book2.toJSON();
  book4 = bbb.Bookmark.prototype.fromJSON(ser);
  
  var assertEquals = function(obj1, obj2) {
      if (!obj1.equals(obj2)) {
          alert("Object 1 and 2 not equal!\n\nObj 1:\n"+
              obj1.toString() + "\n\n ===> \n\n" +
              obj2.toString());
              
          return false;
      }
      
      return true;
  }
  
  return assertEquals(book1, book3) && assertEquals(book2, book4);
});

bbb.testing.addTest("Table of Contents Output", function(){
    try {
        bbb.printTOC();
        return true;
    } catch (e) {
        alert("Could not output Table of Contents!\n\n Error: \n\n"+e);
        return false;
    }
});
bbb.testing.addTest("Table of Contents Modification", function(){
  try {
      bbb.printTOC();
      
      bbb.addChapter({
        src: "Some new source",
        title: "Some new title",
        description: "Some new description",
        startTime: 8,
        endTime: 10});
        
      bbb.printTOC();
      
      return true;
  } catch (e) {
      alert("Could not modify Table of Contents!\n\n Error: \n\n"+e);
      return false;
  }
});

bbb.testing.addTest("Cookie Storage", function(){
    try {
        bbb.storage.setCookie("testCookie", "Hello");
        return bbb.storage.getCookie("testCookie") === "Hello";
    } catch (e) {
        alert("Could not Set or Retrieve Cookies!\n\n Error: \n\n"+e);
        return false;
    }
});
