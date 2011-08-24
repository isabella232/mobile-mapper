function(doc) { 
  var idx, max;
  
  if(doc.doc_type == 'user') {
    if(doc.username) {
      emit(doc.username, doc);
    } else {
      emit(doc._id, doc);
    }
  }
}