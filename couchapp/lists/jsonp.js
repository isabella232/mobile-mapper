function(head, req) {
    var row, out, sep = '\n', firstTime = true;

    // Send the same Content-Type as CouchDB would
    if (req.headers.Accept.indexOf('application/json')!=-1)
      start({"headers":{"Content-Type" : "application/json"}});
    else
      start({"headers":{"Content-Type" : "text/plain"}});

    if ('callback' in req.query) send(req.query['callback'] + "(");

    send('[');
    while (row = getRow()) {
        if(firstTime) {
          out = JSON.stringify(row.value);
          firstTime = false;
        } else {
          out = ','+JSON.stringify(row.value);
        }
        send(out);
    }
    send(']');
    if ('callback' in req.query) send(")");
    
};