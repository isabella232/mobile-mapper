(function(m){
  m.Details = function(options) {
    var _options = $.extend({
      detailTarget: '.detail-container',
      detailHeader: '.detail-header',
      commentTarget:'.comments-container'
    }, options),
    _id;
    
    // Array of fields to ignore when dumping all the data to the screen
    var ignoreFields = [
      'title','artist','description','image_urls','geometry','id','_id','_rev',
      '_attachments','comments','doc_type','data_source'
    ];
    
    // Setup DB stuff for writing
    var server = new Couch.Server('http://'+Config.couchhost, Config.couchuser, Config.couchpword);
    var db = new Couch.Database(server, Config.couchdb);
    

    function _refreshDetail(id) {
        var $container = $('div[data-url*="details.html?id='+id+'"]'),
            $detailTarget = $(_options.detailTarget, $container).html('Loading...');
            $commentTarget = $(_options.commentTarget, $container);
        
        $.mobile.showPageLoadingMsg();
        $.getJSON('http://'+app.couch+'/'+app.database+'/'+id+'?callback=?', function(artData) {
          var imagePath = '',
              imageHtml = '',
              detailsHtml = '',
              commentsHtml = '',
              imgIdx = 0;
          
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
                    
          if(artData.image_urls && artData.image_urls.length) {
            for(; imgIdx < artData.image_urls.length; imgIdx += 1) {
              detailsHtml += '<div class="img-wrapper"><img src="'+artData.image_urls[imgIdx]+'" /></div>';
            }
          }
          
          if(artData.artist) {
            detailsHtml += '<div class="artist-name">A piece by '+artData.artist+'</div>';
          }
          
          if(artData.description) {
            detailsHtml += '<div class="piece-description">'+artData.description+'</div>';
          }
          
          detailsHtml += '<h3>Details</h3>';
          detailsHtml += '<dl class="piece-details">';
          // Dump everything else onto the page
          $.each(artData, function(i, n) {
              if(n != '' && ignoreFields.indexOf(i) == -1) {
                  detailsHtml += '<dt>'+Utils.titleCase(i.replace('_',' '))+'</dt><dd>'+n+'</dd>';
              }
          });
          detailsHtml += '<dl>';
          detailsHtml += imageHtml;
          
          if(artData.data_source) {
            detailsHtml += '<div class="piece-data-source">This data was provided by '+artData.data_source+'</div>';
          }
          
          detailsHtml = '<div class="details_wrapper">'+detailsHtml+'</div>';
          $detailTarget.html(detailsHtml);
          
          // Build the comments area
          commentsHtml += '<h3>Comments</h3>';
          $.getJSON('http://'+app.couch+'/'+app.database+'/_design/pafCouchapp/_list/jsonp/commentsbyart?key="'+id+'"&callback=?', function(commentData) {
            if(commentData.length > 0) {
              $.each(commentData, function(i, n) {
                commentsHtml += '<div class="comment">'+n.comment+'<span class="commenter">'+n.username+'</span></div>';              
              });
            } else {
              commentsHtml += '<div class="no-comments">There is currently no discussion on this piece.</div>';
            }
            $commentTarget.html(commentsHtml);
            $commentTarget.page();
          });
          
          _bindFormHandler();
        });
    };
    
    function _bindFormHandler() {
      var $newCommentForm = $('#add_comment');
      
      $newCommentForm.unbind('submit').bind('submit', function(ev) {
        ev.preventDefault();
        
        var curUser = app.getUsername();
        
        var newCommentObj = {
          artwork : _id,
          comment   : $("#new_comment").val(),
          comment_ts: Date.now()
        };
 
        $.getJSON('http://'+app.couch+'/'+app.database+'/_design/pafCouchapp/_list/jsonp/usersbyname?key="'+curUser+'"&callback=?', function(userData) {
          if(userData.length > 0) {
            userData = userData[0];
              if(userData.comments) {
                userData.comments.push(newCommentObj);
              } else {
                userData.comments = [newCommentObj];
              }
              
              // Update db
              db.put(userData._id, userData, function(resp) { 
                if(resp.ok) {
                  // Update html
                  $(_options.commentTarget).append('<div class="comment">'+newCommentObj.comment+'<span class="commenter">'+curUser+'</span></div>');
                  $(_options.commentTarget).page();
                  // Clear form
                  $("#new_comment").val('');
                } else {
                  alert('There was an error saving, please try again.');
                }
              });
            }
          });
          
          return false;
       });
    }
    
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