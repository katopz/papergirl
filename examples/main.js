requirejs.config({
    paths: {
        papergirl: './../dist/papergirl'
    }
});
define(['papergirl'], function(pg) {
    pg.storage.ready(function() {
        var key = 'STORE_KEY';
        var value = 'What we save offline';
        var UNKNOWN_KEY = 'unknown_key';

        pg.storage.setItem(key, value, function() {
            console.log('SAVING', value);

            pg.storage.getItem(key, function(readValue) {
                console.log('READING', readValue);
            });
        });

        // Promises code.
        pg.storage.setItem('promise', 'ring', function() {
            pg.storage.getItem('promise').then(function(readValue) {
                console.log('YOU PROMISED!', readValue);
            });
        });

        // Since this key hasn't been set yet, we'll get a null value
        pg.storage.getItem(UNKNOWN_KEY, function(readValue) {
            console.log('FAILED READING', UNKNOWN_KEY, readValue);
        });
    });

    pg.storage.ready().then(function() {
        console.log("You can use ready from Promises too");
    })
});
