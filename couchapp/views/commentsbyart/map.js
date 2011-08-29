function(doc) { 
  var idx, max;
  
  if(doc.doc_type == 'user' && doc.comments) {
    max = doc.comments.length;
    for(idx = 0; idx < max; idx += 1) {
      emit(doc.comments[idx].artwork, {id: doc._id, username: doc.username, comment: doc.comments[idx].comment});
    }
  }
}