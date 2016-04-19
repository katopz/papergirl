// For measure speed.
var beg_local = new Date().valueOf();
var timeuse_cache_local;
var timeuse_cache_remote;

// Will get from cached first if has and then localhost after that.
papergirl.getCacheFirst('foo.json', {
    'cache': function(data) {
        timeuse_cache_local = new Date().valueOf() - beg_local;

        // Cache is faster so this will call first.
        document.getElementById('local-cached').innerHTML = '// Time used : ' + timeuse_cache_local + 'ms.<br>' + data;
    },
    // Intercept xhr request to modify headers before send.
    'beforeSend': function(xhr) {
        xhr.setRequestHeader('foo', 'bar');
    },
    // Intercept xhr while onload
    'onload': function(xhr) {
        console.log(xhr);
    },
    // Never cache before from remote.
    'insert': function(xhr) {
        console.log('insert');
    },
    // Cached but not match from remote.
    'update': function(xhr) {
        console.log('update');
    },
    // Cache is upsert from remote.
    'upsert': function(xhr) {
        console.log('upsert');
    },
    // Cache is match with remote by content.
    'match': function(xhr) {
        console.log('match');
    },
    // Cache is match with remote by ETag.
    'not_mod': function(xhr) {
        console.log('not_mod');
    }
}).then(function(data) {
    // Result.
    if (timeuse_cache_local) {
        var timeuse_local = new Date().valueOf() - beg_local;
        document.getElementById('local-cached-result').innerHTML = (timeuse_local / timeuse_cache_local).toFixed(2) + 'x Faster';
    }

    // And then we got update from local.
    document.getElementById('local').innerHTML = '// Time used : ' + timeuse_local + 'ms.<br>' + data;
});

// For measure speed from remote.
var beg_remote = new Date().valueOf();

// Will get from cached first if has and then remote host after that.
papergirl.getCacheFirst('https://raw.githubusercontent.com/katopz/papergirl/master/package.json', {
    'cache': function(data) {
        timeuse_cache_remote = new Date().valueOf() - beg_remote;

        // Cache is faster so this will call first.
        document.getElementById('remote-cached').innerHTML = '// Time used : ' + timeuse_cache_remote + 'ms.<br>' + data;
    }
}).then(function(data) {
    // Result.
    if (timeuse_cache_remote) {
        var timeuse_remote = new Date().valueOf() - beg_remote;
        document.getElementById('remote-cached-result').innerHTML = (timeuse_remote / timeuse_cache_remote).toFixed(2) + 'x Faster';
    }

    // And then we got update from remote.
    document.getElementById('remote').innerHTML = '// Time used : ' + timeuse_remote + 'ms.<br>' + data;
});