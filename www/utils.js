var Utils = function() {
  
  var titleCase = function(str) {
    return str.toLowerCase().replace(/\b[a-z]/g, function() { return arguments[0].toUpperCase(); } );
  }
  
  var getImage = function(piece) {
    var image_path = 'images/noimage.png';
    
    if(piece._attachments) {
      imgs = getKeys(piece._attachments);
      image_path = 'http://'+ArtFinder.App().couch+'/'+ArtFinder.App().database+'/'+piece._id+'/'+imgs[0];
    } else if(piece.image_urls) {
      image_path = piece.image_urls[0];
    }
    
    return image_path;
  }
  
  // Helper function that returns all the keys for a given object
  var getKeys = function(obj){
     var keys = [];
     for(var key in obj){
       if (obj.hasOwnProperty(key)) {
         keys.push(key);
       }
     }
     return keys;
  }
  
  return {
    titleCase : titleCase,
    getImage  : getImage,
    getKeys   : getKeys
  };
  
}();