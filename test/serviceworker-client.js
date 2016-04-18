/*globals importScripts:true, self:true */
importScripts("/dist/papergirl.js");

self.onmessage = function(messageEvent) {
    return papergirl
        .setDriver(messageEvent.data.driver)
        .then(function() {
            return papergirl.setItem('service worker', messageEvent.data.value);
        })
        .then(function() {
            return papergirl.getItem('service worker');
        })
        .then(function(value) {
            messageEvent
                .ports[0]
                .postMessage({
                    body: value + ' using ' + papergirl.driver()
                });

        })
        .catch(function(error) {
            messageEvent
                .ports[0]
                .postMessage({
                    error: JSON.stringify(error),
                    body: error,
                    fail: true
                });
        });
};

self.oninstall = function(event) {
    event.waitUntil(
        papergirl
        .setItem('service worker registration', 'serviceworker present')
        .then(function(value) {
            console.log(value);
        })
    );
};
