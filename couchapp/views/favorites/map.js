function(doc) { 
  var idx, max;
  
  if(doc.favorites) {
    max = doc.favorites.length;
    for(idx = 0; idx < max; idx += 1) {
      emit(doc.favorites[idx], doc);
    }
  }
}