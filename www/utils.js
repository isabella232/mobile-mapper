var Utils = function() {
  
  var titleCase = function(str) {
    return str.toLowerCase().replace(/\b[a-z]/g, function() { return arguments[0].toUpperCase(); } );
  }
  
  return {
    titleCase : titleCase
  };
  
}();