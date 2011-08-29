var geo = function() {
  var map;
  var user_moved_map = false;
  var current_loc_icon = new google.maps.MarkerImage('images/current_location_icon.png', null, null, null, new google.maps.Size(12, 12));
  var current_location_marker = null;
  var record_markers = {};

  function getPosition(callback) {
    var dfd = $.Deferred();
    navigator.geolocation.getCurrentPosition(
      function(coords) { dfd.resolve(coords); } ,
      function(error) { console.log(error); dfd.resolve({coords: {latitude: 37.7749295, longitude: -122.4194155}}) },
      { maximumAge:600000, timeout: 10000}
    )
    //dfd.resolve({coords: {latitude: 37.7749295, longitude: -122.4194155}});
    return dfd.promise();
  }
  
  // Wrapper for gmaps panTo (if no coords are passed, we go to the user's position).
  function panTo(coords) {
    if(coords) {
      map.panTo(new google.maps.LatLng(coords.latitude, coords.longitude));
    } else {
      getPosition().then(function(pos) {
        coords = pos.coords;
        map.panTo(new google.maps.LatLng(coords.latitude, coords.longitude));
      });
    }
  }
  
  function putMap(coords) {
    setTimeout(function() { geo.locked = false; }, 1000);
    geo.locked = true;
    
    record_markers = {};
    
    // Set center of map to the coordinates passed in
    var current_map_location = new google.maps.LatLng(coords.latitude, coords.longitude);
    
    // Set the map options
    var map_options = {
      zoom: 13,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      center: current_map_location,
      mapTypeControl: false
    };
    
    // Create the map
    map = new google.maps.Map(document.getElementById("map-container"), map_options);
    
    // Create marker for the user's position on the map
    
    current_location_marker = new google.maps.Marker({
      map: map,
      draggable: false,
      position: current_map_location,
      icon: current_loc_icon
    });

    // Refresh the map pins after the map is dragged
    google.maps.event.addListener(map, 'dragend', function () {
      //console.log('dragend is kicking off');
      putPins(map, record_markers);
      user_moved_map = true;
    });

    // Setup the info window for the user's position
    var info_window = new google.maps.InfoWindow({
      content: '<p>Current Location</p>'
    });
    google.maps.event.addListener(current_location_marker, 'click', function (location) {
      info_window.open(map, current_location_marker);
    });
    
    //load the initial points once the map has finished loading
    google.maps.event.addListener(map, 'bounds_changed', function () {
      //console.log("bounds_changed is kicking off");
      putPins(map, record_markers);
      google.maps.event.clearListeners(map, 'bounds_changed');
    });
  }
  
  // Setup the watch method to follow the user if they are moving
  function getWatch() {
    return navigator.geolocation.watchPosition(function (pos) {
      current_location = pos.coords
      current_map_location = new google.maps.LatLng(current_location.latitude, current_location.longitude);
      if (!user_moved_map) {
        map.setCenter(current_map_location);
        map.setZoom(13);
      }
      current_location_marker.setPosition(current_map_location);
      putPins(map, record_markers);
    }, function () {
      if(navigator.notification) { 
        navigator.notification.alert("Geolocation service failed to determine your location.", $.noop, "GPS Failure");
      } else {
        alert("Geolocation service failed to determine your location.");
      }
    }, {
      enableHighAccuracy: true,
      maximumAge: 90000
    });
  }
  
  function makePin(map, p) {
    var id = p.properties._id;
    
    var content = '<div class="ibc"><a href="details.html?id='+id+'" title="' + p.properties.title + '">' + p.properties.title + '</div>';
    var info_window = new google.maps.InfoWindow({
      content: content,
      maxWidth: 400
    });

    var pin_icon = new google.maps.MarkerImage('images/green_pin.png', null, null, null, new google.maps.Size(12, 28));

    var marker = new google.maps.Marker({
      map: map,
      icon: pin_icon,
      shadow: new google.maps.MarkerImage('images/pin_shadow.png', new google.maps.Size(56, 56), null, new google.maps.Point(5, 28), new google.maps.Size(28, 28)),
      position: new google.maps.LatLng(p.geometry.coordinates[1], p.geometry.coordinates[0])
    });
    google.maps.event.addListener(marker, 'click', function (location) {
      info_window.open(map, marker);
    });
    
    return marker;
    
  }

  function putPins(map, markers) {
    getData(function(locationData) {
      $.each(locationData, function (i, p) {
        if (!markers[p.properties._id]) {
          markers[p.properties._id] = makePin(map, p);
        }
      });
    })
  }
  
  function getData(callback) {
    var bounds = map.getBounds();
    if(bounds) {
      var ne = bounds.getNorthEast();
      var sw = bounds.getSouthWest();
      var bbox = [sw.lng(),sw.lat(),ne.lng(),ne.lat()].join(",");
    
      $.mobile.showPageLoadingMsg();
      $.getJSON('http://'+ app.couch + "/" + app.database + '/_design/geo/_spatiallist/geojson/full?bbox=' + bbox + '&callback=?', {}, function (resp) {
        $.mobile.hidePageLoadingMsg();      
        callback(resp.features);
      });
    }
  }
  
  function deleteMap() {
    $('#map-container').empty();
  }
  
  function getBBOX(location) {
    return [location.lon - (location.deltaX / 2),
            location.lat - (location.deltaY / 2),
            location.lon + (location.deltaX / 2),
            location.lat + (location.deltaY / 2)].join(",");
  }
  
  function onMapMove(lat, lon, deltaY, deltaX) {
    if (geo.locked) return;
    
    app.lastLocation = {
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      deltaY: parseFloat(deltaY),
      deltaX: parseFloat(deltaX)
    }

    app.lastLocation.bbox = getBBOX(app.lastLocation);
    couch.get('http://'+ app.couch + '/' + app.database + '/geo?bbox=' + app.lastLocation.bbox).then(function(results) {
      putPins(results.rows.map(function(row) {
        return row.value;
      }));
    })
  }
  
  // http://www.movable-type.co.uk/scripts/latlong.html
  var quickDist = function(lat1, lon1, lat2, lon2) {
    var R = 6371; // km
    var d = Math.acos(Math.sin(lat1)*Math.sin(lat2) + 
                      Math.cos(lat1)*Math.cos(lat2) *
                      Math.cos(lon2-lon1)) * R;
    return d;
  };

  return {
    getPosition: getPosition,
    panTo: panTo,
    putMap: putMap,
    putPins: putPins,
    deleteMap: deleteMap,
    onMapMove: onMapMove,
    getData: getData,
    quickDist: quickDist,
    getWatch: getWatch
  };
  
}();