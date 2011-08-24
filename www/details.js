(function(m){
  m.Details = function(options) {
    var _options = $.extend({
      detailTarget: '.detail-container',
      detailHeader: '.detail-header',
      commentTarget:'.comments-container'
    }, options),
    _id;
    
    var ignoreFields = ['title','geometry','id','_id','_rev','_attachments','comments'];

    function _refreshDetail(id) {
        var $container = $('div[data-url*="details.html?id='+id+'"]'),
            $detailTarget = $(_options.detailTarget, $container).html('Loading...');
            $commentTarget = $(_options.commentTarget, $container);
        
        $.mobile.showPageLoadingMsg();
        $.getJSON('http://'+app.couch+'/'+app.database+'/'+id+'?callback=?', function(artData) {
          var imagePath = '',
              imageHtml = '',
              detailsHtml = '',
              commentsHtml = '';
          
          $.mobile.hidePageLoadingMsg();

          // Set the page title
          $(_options.detailHeader, $container).html(artData.title);
        
          detailsHtml += '<div class="details_title">'+artData.title+'</div>';

          if(artData._attachments) {
              for(img in artData._attachments) {
                if(artData._attachments.hasOwnProperty(img)) {
                  imagePath = 'http://'+app.couch+'/'+app.database+'/'+id+'/'+img;
                  detailsHtml += '<div class="img-wrapper"><img src="'+imagePath+'" /></div>';
                }
              }
          }
          detailsHtml += '<ul>';
          // Dump everything else onto the page
          $.each(artData, function(i, n) {
              // HACK - the following if could be done more gracefully
              if(n != '' && ignoreFields.indexOf(i) == -1) {
                  detailsHtml += '<li><strong>'+i+'</strong>'+n+'</li>';
              }
          });
          detailsHtml += '<ul>';
          detailsHtml += imageHtml;
          detailsHtml = '<div class="details_wrapper">'+detailsHtml+'</div>';
          $detailTarget.html(detailsHtml);
          
          // Build the comments area
          commentsHtml += '<h3>Comments</h3>';
          if(artData.comments && artData.comments.length > 0) {
            $.each(artData.comments, function(i, n) {
              commentsHtml += '<div class="comment"><span class="commenter">'+n.commenter+'</span>'+n.comment+'</div>';              
            });
          }          
          commentsHtml += '<form action="" id="add_comment"><div data-role="fieldcontain"><label for="new_comment">Your comment</label><textarea cols="40" rows="8" name="new_comment" id="new_comment"></textarea></div></form>';
          $commentTarget.html(commentsHtml);
          $commentTarget.page();
          
        });
    };
    
    //http://stackoverflow.com/questions/901115/get-querystring-values-in-javascript
    function _getParameterByName( name )
    {
      name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
      var regexS = "[\\?&]"+name+"=([^&#]*)";
      var regex = new RegExp( regexS );
      var results = regex.exec( window.location.href );
      if( results == null )
        return "";
      else
        return decodeURIComponent(results[1].replace(/\+/g, " "));
    }
    
    //http://stackoverflow.com/questions/27928/how-do-i-calculate-distance-between-two-latitude-longitude-points
    function _calcDistance(point1, point2) {
        var R = 6371; // Radius of the earth in km
        var dLat = (point2[0]-point1[0]).toRad();  // Javascript functions in radians
        var dLon = (point2[1]-point1[1]).toRad(); 
        var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(point1[0].toRad()) * Math.cos(point2[0].toRad()) * 
                Math.sin(dLon/2) * Math.sin(dLon/2); 
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        var d = R * c; // Distance in km
        
        return d;
    }
    
    
    //Init this page
    (function init() {
       //Get the id from the url
       _id = _getParameterByName('id');
       _refreshDetail(_id);
    })();
  };
})(ArtFinder);