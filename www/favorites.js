(function(m){
  m.Favorites = function(options) {
    var _options = $.extend({
      favoritesTarget: '#favorites_ul',
      detailHeader: '.favorites-header'
    }, options),
    _id;

    var _refreshFavorites = function(id) {
    //function _refreshFavorites(id) {
      var $container = $('div[data-url*="favorites-page"]'),
          $favoritesTarget = $(_options.favoritesTarget, $container).html('Loading...'),
          detailsHtml = '';
          
      console.log('check 1');
          
      // Reset the list of pieces
      //$(_options.favoritesTarget).css('margin-left','0');
        
      $.mobile.showPageLoadingMsg();
      
      // Get the favorites for this user
      $.getJSON('http://'+app.couch+'/'+app.database+'/_design/pafCouchapp/_list/jsonp/favorites?key="'+_id+'"&callback=?', function(theFavorites) {
        $.mobile.hidePageLoadingMsg();
console.log('check 2');
console.log(theFavorites);
        if(theFavorites.length) {
          // Set the page title
          $(_options.detailHeader, $container).html('Your Favorites');
          
          // Loop through the favorites array, creating panels for the list view
          $.each(theFavorites, function (idx, el) {
            if(el._attachments) {
              imgs = Utils.getKeys(el._attachments);
              image_path = 'http://'+app.couch+'/'+app.database+'/'+el._id+'/'+imgs[0];
            } else {
              image_path = 'images/noimage.png';
            }
console.log(image_path);
            detailsHtml += '<li class="piece" id="'+el._id+'"><h3>'+el.title+'</h3>' +
                        '<span class="street_address">'+el.address+'</span>'+
                        '<a href="details.html?id='+el._id+'" data-role="button" data-inline="true" data-icon="arrow-r">more</a>'+
                        '<div class="img-wrapper"><img src="'+image_path+'" /></div>'+
                        '<div data-role="controlgroup" data-type="horizontal">'+
                          '<a href="index.html" data-role="button">Flag</a>'+
                          '<a href="index.html" data-role="button">Comment</a>'+
                          '<a href="#" class="unlike-btn" data-role="button">Unlike</a>'+
                        '</div>'+
                       '</li>';
          });
        } else {
          detailsHtml += 'You have not &quot;liked&quot; any pieces of art yet!';
        }
        
        // Inject the html
        $favoritesTarget.html(detailsHtml);
        // Refresh the list (to get the jqm styles)
        $(_options.favoritesTarget+' li.piece').page();
        
        // Add swipe handlers
        $(_options.favoritesTarget+' li.piece').live('swipeleft swiperight', function(ev) {
          var delta = $(this).outerWidth();
          var cur_pos = parseInt($(this).parent().css('margin-left'), 10);
          var new_pos = (ev.type === 'swipeleft') ? cur_pos - delta : cur_pos + delta;
          var dir_func = (ev.type === 'swipeleft') ? $(this).next() : $(this).prev();
          
          if(dir_func.length > 0) {  
            $(this).parent().animate({'margin-left': (new_pos) +'px'} , 500, function() { });
          }
        });
                
      });
    };
    
    //Init this page
    (function init() {
       //Get the username of the current user
       _id = m.App().getUsername();
       // Kick off the rest of the function
       _refreshFavorites(_id);
    })();
  };
})(ArtFinder);