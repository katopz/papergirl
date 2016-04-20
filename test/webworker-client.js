/*globals importScripts:true, self:true */
importScripts("/dist/papergirl.storage.js");

self.addEventListener('message', function(e) {
    function handleError(e) {
        self.postMessage({
            error: JSON.stringify(e),
            body: e,
            fail: true
        });
    }

    papergirl.storage.setDriver(e.data.driver, function() {
        papergirl.setData('web worker', e.data.value).then(function() {
            return papergirl.getData('web worker').then(function(err, value) {
                self.postMessage({
                    body: value
                });
            });
        }).catch(handleError);
    }, handleError);
}, false);
