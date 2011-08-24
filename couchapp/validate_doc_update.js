function(new_doc, old_doc, userCtx) {
  if(!userCtx.name) {
    // CouchDB sets userCtx.name only after a successful authentication
    throw({forbidden: "Please log in first."+JSON.stringify(userCtx)});
  }
}