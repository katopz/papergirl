/*globals importScripts:true, self:true */
importScripts("/dist/papergirl.js");

self.addEventListener('message', function(e) {
    function handleError(e) {
        self.postMessage({
            error: JSON.stringify(e),
            body: e,
            fail: true
        });
    }

    papergirl.setDriver(e.data.driver, function() {
        papergirl.setItem('web worker', e.data.value, function() {
            papergirl.getItem('web worker', function(err, value) {
                self.postMessage({
                    body: value
                });
            });
        }, handleError).catch(handleError);
    }, handleError);
}, false);
