> PS : In heavy development, please leave her alone for now. :)

Papergirl
===
Papergirl will deliver content when you make a request. She's smart enough  
to let you know that you already have content in your hand by `etag`  
so you will save your time going to remote server and be happy using local content.   

Stack
===
- [x] Persistent Data : https://github.com/mozilla/localForage
- [ ] Compression : https://github.com/pieroxy/lz-string

Examples
===
```shell
npm run dev
```

Basic
===
* Simple request as functional.
```js
papergirl.watch()
.onCache(function(data) {
    // Occur when got cached data.
    console.log(data);
})
.onUpsert(function(data) {
    // Occur when insert or update cache from remote.
    console.log(data);
})
.onError(function(error) {
    console.log(error);
})
.request('/test/foo.json');
```
* Simple request with intercept.
```js
papergirl.getCacheFirst('foo.json', {
    // Occur when got cached data.
    'cache': function(data) {
        console.log(data);
    },
    // Intercept xhr request to modify headers before send.
    'beforeSend': function(xhr) {
        xhr.setRequestHeader('foo', 'bar');
    },
    // Intercept xhr while onload
    'onload': function(xhr) {
        console.log(xhr);
    },
    // Occur when never cache before and get insert from remote.
    'insert': function(data) {
        console.log('insert');
    },
    // Cached but not match from remote.
    'update': function(data) {
        console.log('update');
    },
    // Cache is upsert from remote.
    'upsert': function(data) {
        console.log('upsert');
    },
    // Cache data is match with remote data.
    'match': function(data) {
        console.log('match');
    },
    // Cache is match with remote by ETag.
    'not_mod': function(data) {
        console.log('not_mod');
    },
    // Occur after 200 OK and cached done.
    'sync': function(data) {
        console.log('sync');
    }
});
```

Advance
===
- [x] `cache` : Occur when got cached data.
- [x] `beforeSend`: Intercept xhr request usually to modify headers before send.
- [x] `onload`: Intercept xhr while onload.
- [x] `insert` : Occur when never cache before and get insert from remote.
- [x] `update` : Cached but not match from remote.
- [x] `upsert` : Cache get `insert` or `update` from remote.
- [x] `match` : Cache data is match with remote data.
- [x] `not_mod` : Cache is match with remote by ETag.
- [x] `sync` : Occur after 200 or 304 and cached done.

TODO
===
- [x] Test strategy.cacheFirst.
- [ ] Test strategy.networkFirst.
- [ ] Test strategy.cacheOnly.
- [ ] Test strategy.networkOnly.
- [ ] Test parallel requests.
- [ ] Implement optional `etag`. // useIfNoneMatch
- [ ] Implement optional `last-modified`. // useLastModify
- [ ] Implement `last-modified` fallback.
- [ ] Test `last-modified` fallback.
- [ ] Test ready.
- [ ] Support multiple `storeName`.
- [ ] Support `Cache-Control: max-age`.
- [ ] Support xhr.responseTextType = 'json'.
- [ ] Ignore query when cache.