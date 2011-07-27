/*!
 * Portions of this code adapted from:
 *
 * Open Elm Project v1.0
 * http://www.openelm.org.im/
 *
 * Copyright 2011, Red Robot Studios Ltd
 * Licensed under GPL Version 3 license.
 * http://www.gnu.org/licenses/gpl.html
 */

var app = function() {
  var mapPins =[];
  var database = "public_art";
  var couch = "x.ic.ht";
  var default_location = {latitude: 37.78415, longitude: -122.43113};
  var current_location = default_location;
  var is_saving = false;
  var nearby_watch;
  var add_record_watch;
  
  var bind = function() {
    handle_username_options();
    $("#add_record").bind("pagebeforeshow", configure_add_form);
    $("#nearby_map").bind("pagebeforeshow", function() {
      geo.getPosition().then(function(position) {
        geo.putMap(position.coords);
        //configure_nearby_map();
      })
    });
    $("#nearby_map").bind("pagehide", function() {
      geo.deleteMap();
    });
    $("#add_record").bind("pagehide", function() {
      navigator.geolocation.clearWatch(add_record_watch);
    });
    present_agreement();
  }

  function handle_username_options() {
    if (get_username() === 'anonymous') {
      $('#set_username_list').show();
    }
    $('#set_username_form').unbind('submit').bind('submit', function (e) {
      e.preventDefault();
      var val = $('#id_username').val();
      window.localStorage['username'] = (val) ? val : 'anonymous';
      if (val) {
        $('#set_username_list').hide();
      }
      history.back();
      return false;
    });
  }

  function get_username() {
    return (window.localStorage['username']) ? window.localStorage['username'] : 'anonymous';
  }

  function present_agreement() {
    if (!window.localStorage['terms_agreed'] || window.localStorage['terms_agreed'] === 'false') {
      $.mobile.changePage($('#agree_terms'), 'pop', false, false);
      $('#id_agreement_checkbox').bind('change', function () {
        window.localStorage['terms_agreed'] = true;
        $.mobile.changePage($('#home'), 'pop', true, false);
      })
    }
  }

  function configure_add_form() {
    var user_selected_location = false;
    var geocoded_address = null;
    var record_markers = {};
    var current_map_location = new google.maps.LatLng(current_location.latitude, current_location.longitude);
    var map_options = {
      zoom: 10,
      mapTypeId: google.maps.MapTypeId.HYBRID,
      center: current_map_location,
      mapTypeControl: false
    };
    var map = new google.maps.Map(document.getElementById("small_map_canvas"), map_options);
    var marker = new google.maps.Marker({
      map: map,
      draggable: true,
      animation: google.maps.Animation.DROP,
      position: current_map_location
    });

    google.maps.event.addListener(marker, 'dragend', function (location) {
      current_location = {
        latitude: location.latLng.lat(),
        longitude: location.latLng.lng()
      };
      user_selected_location = true;
      navigator.geolocation.clearWatch(add_record_watch);
      reverse_geocode_location(location.latLng);
    });

    google.maps.event.addListener(map, 'dragend', function () {
      load_records_for_map_bounds(map, record_markers);
    });

    var info_window = new google.maps.InfoWindow();

    function reverse_geocode_location(location) {
      new google.maps.Geocoder().geocode({
        'latLng': location
      }, function (results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          if (results[0]) {
            if (!user_selected_location) {
              map.setCenter(location);
              map.setZoom(18);
              marker.setPosition(location);
            }
            geocoded_address = results
            info_window.setContent(geocoded_address[0].formatted_address);
            google.maps.event.addListener(marker, 'click', function (location) {
              info_window.open(map, marker);
            });
            load_records_for_map_bounds(map, record_markers);
          }
        }
      });
    }

    add_record_watch = navigator.geolocation.watchPosition(function (pos) {
      current_location = pos.coords
      reverse_geocode_location(new google.maps.LatLng(current_location.latitude, current_location.longitude));
    }, function () {
      if(navigator.notification.alert) {
        navigator.notification.alert("Geolocation service failed. Drag the map marker to indicate your location.", null, "GPS Failure");
      } else {
        alert("Geolocation service failed. Drag the map marker to indicate your location.");
      }
    }, {
      enableHighAccuracy: true,
      maximumAge: 30000
    });

    $('#id_take_photo,#id_choose_library').unbind('click').bind('click', function (e) {
      e.preventDefault();
      var source_type = navigator.camera.PictureSourceType.CAMERA;
      if ($(this).attr('id') === "id_choose_library") {
        source_type = navigator.camera.PictureSourceType.PHOTOLIBRARY;
      }
      navigator.camera.getPicture(function (uri) {
        $('#id_camera_image').attr('src', uri).removeClass('placeholder');
        history.back();
      }, function (error) {
        navigator.notification.alert(error, null, "Camera Error");
        history.back();
      }, {
        quality: 50,
        destinationType: Camera.DestinationType.FILE_URI,
        sourceType: source_type
      });
      return false;
    });

    $('#add_record_form').unbind('submit').bind('submit', function (e) {
      e.preventDefault();
      if (is_saving) return false;
      is_saving = true;
      navigator.geolocation.clearWatch(add_record_watch);
      if ($('#id_camera_image').hasClass('placeholder')) {
        navigator.notification.alert("Please take a photo of the tree", $.noop, "Error");
        is_saving = false;
        return false;
      }
      if ($('#id_new_record_health').val() === 'choose') {
        navigator.notification.alert("Please select the health of the tree", $.noop, "Error");
        is_saving = false;
        return false;
      }
      $.mobile.pageLoading();
      var doc = {
        doc_type: 'Record',
        geometry: {
          type: 'Point',
          'coordinates': [current_location.latitude, current_location.longitude]
        },
        street_address: geocoded_address[0].formatted_address,
        notes: $('#id_new_record_notes').val(),
        status: $('#id_new_record_health').val(),
        username: get_username(),
        source: window.device.platform.toLowerCase(),
        creation_date: (new Date()).format('isoUtcDateTime')
      };

      if (typeof current_location.accuracy !== 'undefined') {
        doc.loc_accuracy = current_location.accuracy;
        doc.loc_altitude_accuracy = current_location.altitudeAccuracy;
        doc.loc_altitude = current_location.altitude;
        doc.loc_heading = current_location.heading;
      }

      function handle_photo_upload(doc, success, fail) {
        var photo_uri = $('#id_camera_image').attr('src');
        var platform = window.device.platform.toLowerCase();
        if (platform.match(/iphone/)) {
          window.plugins.CouchDBAttachmentUploader.upload(photo_uri, $.couch.authUrlPrefix + '/' + database, doc.id, doc.rev, success, fail, {
            contentType: 'image/jpeg',
            method: 'put',
            attachmentName: 'photo.jpg'
          });
        } else if (platform.match(/android/)) {
          var options = new FileUploadOptions();
          options.mimeType = "image/jpeg";
          var path = $.couch.authUrlPrefix + '/' + database + '/' + doc.id + '/photo.jpg?rev=' + doc.rev;
          new FileTransfer().upload(photo_uri, path, success, fail, options);
        } else {
          navigator.notification.alert('Unsuported platform.', $.noop, 'Upload Error');
        }
      }

      $.couch.login({
        name: credentials.name,
        password: credentials.password,
        success: function () {
          $db.saveDoc(doc, {
            success: function (doc) {
              handle_photo_upload(doc, function () {
                $('#id_camera_image').attr('src', '').addClass('placeholder');
                //reset form and field values
                $('#id_new_record_notes').val('');
                $('#id_new_record_health').val('choose').selectmenu('refresh');
                $.mobile.pageLoading(true);
                history.back();
                is_saving = false;
              }, function (error) {
                $('#id_camera_image').attr('src', '').addClass('placeholder');
                $.mobile.pageLoading(true);
                is_saving = false;
                navigator.notification.alert('Could not upload the photo. Please try again.', $.noop, 'Upload Error');
              });
            },
            error: function (status, error, reason) {
              is_saving = false;
              $.mobile.pageLoading(true);
              navigator.notification.alert(reason, $.noop, error);
            }
          });
        },
        error: function (status, error, reason) {
          $.mobile.pageLoading(true);
          is_saving = false;
          navigator.notification.alert(reason, $.noop, error);
        }
      });
      return false;
    });
  }
  
  return {
    mapPins: mapPins,
    database: database,
    couch: couch,
    bind: bind
  };

}();


  

 
$(document).ready(function() {
  app.bind();
});