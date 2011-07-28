var geo = function() {
  var map;
  function getPosition() {
    var dfd = $.Deferred();
    navigator.geolocation.getCurrentPosition(
      function(position) { dfd.resolve(position) },
      function(error) { dfd.resolve({coords: {latitude: 37.7749295, longitude: -122.4194155}}) },
      {maximumAge:600000}
    )
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
    
    var user_moved_map = false;
    var record_markers = {};
    
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
    var current_loc_icon = new google.maps.MarkerImage('images/current_location_icon.png', null, null, null, new google.maps.Size(12, 12));
    var current_location_marker = new google.maps.Marker({
      map: map,
      draggable: false,
      position: current_map_location,
      icon: current_loc_icon
    });

    // Refresh the map pins after the map is dragged
    google.maps.event.addListener(map, 'dragend', function () {
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

    // Setup the watch method to follow the user if they are moving
    nearby_watch = navigator.geolocation.watchPosition(function (pos) {
      current_location = pos.coords
      current_map_location = new google.maps.LatLng(current_location.latitude, current_location.longitude);
      if (!user_moved_map) {
        map.setCenter(current_map_location);
        map.setZoom(16);
      }
      current_location_marker.setPosition(current_map_location);
      putPins(map, record_markers);
    }, function () {
      navigator.notification.alert("Geolocation service failed to determine your location.", $.noop, "GPS Failure");
    }, {
      enableHighAccuracy: true,
      maximumAge: 30000
    });

    //load the initial points once the map has finished loading
    google.maps.event.addListener(map, 'bounds_changed', function () {
      putPins(map, record_markers);
      google.maps.event.clearListeners(map, 'bounds_changed');
    });
  }
  
  function makePin(map, p) {
    var id = p.properties._id;
    
    var content = '<div class="ibc"><h3 class="ibh">' + p.properties.title + '</h3>' + '<p class="ibhs"></p></div>';
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
    app.mapPins = [];
    
		var bounds = map.getBounds();
    var ne = bounds.getNorthEast();
    var sw = bounds.getSouthWest();

    $.getJSON('http://'+ app.couch + "/" + app.database + '/_design/geo/_spatiallist/geojson/full?bbox=' + sw.lng() + ',' + sw.lat() + ',' + ne.lng() + ',' + ne.lat() + '&callback=?', {}, function (resp) {
      $.each(resp.features, function (i, p) {
        if (!markers[p.properties._id]) {
          markers[p.properties._id] = makePin(map, p);
        }
      });
    });
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
    
    couch.get("http://x.ic.ht/public_art/geo?bbox=" + app.lastLocation.bbox).then(function(results) {
      putPins(results.rows.map(function(row) {
        return row.value;
      }));
    })
    
  }

  return {
    getPosition: getPosition,
    panTo: panTo,
    putMap: putMap,
    putPins: putPins,
    deleteMap: deleteMap,
    onMapMove: onMapMove
  };
  
}();