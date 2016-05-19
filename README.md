Papergirl
===
Papergirl will deliver content when you make a request. She's smart enough  
to let you know that you already have content in your hand by `etag`  
so you will save your time going to remote server and be happy using local content.   

```
                                 ┌───(304)────────────── not_mod ┐
                                 │         ┌─ insert ─┐          │ ┌─▪ sync
 request ─┬─────────┬─ send ── load ─(200)─┤          ├─ upsert ─┼─┤
          └─ cache ─┘                      ├─ update ─┘          │ └─▫ error
               ▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪└──────────── match ──┘
```
Stack
===
- [x] Persistent Data : https://github.com/mozilla/localForage
- [ ] Compression : https://github.com/pieroxy/lz-string

Install
===
```shell
npm install papergirl --save
```
How to use
===
### Request and watch as functional.
```js
papergirl.watch()
    // Occur when got cached data.
    .onCache(function(data) {
        console.log(data);
    })
    // Never Cached this data before.  
    .onInsert(function(data) {
        console.log('onInsert:' + data);
    })
    // Cached exist but data is mismatch.
    .onUpdate(function(data) {
        console.log('onUpdate:' + data);
    })
    // Something wrong.
    .onError(function(error) {
        console.log(error);
    })
    .request('foo.json');
```

### Request and watch as functional with **localhost** fallback.
```js
papergirl.watch()
    // Occur when got cached data.
    .onCache(function(data) {
        console.log(data);
    })
    // Never Cached this data before.  
    .onInsert(function(data) {
        console.log('onInsert:' + data);
    })
    // Cached exist but data is mismatch.
    .onUpdate(function(data) {
        console.log('onUpdate:' + data);
    })
    // Something wrong.
    .onError(function(error) {
        console.log(error);
    })
    // Use this uri when at localhost origin.
    .local('bar.json')
    // Make remote request.
    .request('foo.json');
```

### Request and watch every methods as functional.
```js
papergirl.watch()
    // Cached exist.
    .onCache(function(data) {
        console.log('onCache:' + data);
    })
    // Intercept xhr request to modify headers before send.
    .onSend(function(xhr) {
        xhr.setRequestHeader('foo', 'bar');
    })
    // Intercept xhr while load
    .onLoad(function(xhr) {
        console.log(xhr);
    })
    // Never Cached this data before.  
    .onInsert(function(data) {
        console.log('onInsert:' + data);
    })
    // Cached exist but data is mismatch.
    .onUpdate(function(data) {
        console.log('onUpdate:' + data);
    })
    // Occur when insert or update cache from remote.
    .onUpsert(function(data) {
        console.log('onUpsert:' + data);
    })
    // Cache data is match with remote data.
    .onMatch(function(data) {
        console.log('match:' + data);
    })
    // Occur after response and cached is done.
    .onSync(function(data) {
        console.log('onSync:' + data);
    })
    // Something wrong.
    .onError(function(error) {
        console.log('onError : ' + error);
    })
    // Use this uri when at localhost origin.
    .local('bar.json')
    // Make remote request.
    .request('foo.json');
```
How to use as options and promise.
===
```js
papergirl.request('foo.json', {
    // Occur when got cached data.
    'cache': function(data) {
        console.log(data);
    },
    // Intercept xhr request to modify headers before send.
    'send': function(xhr) {
        xhr.setRequestHeader('foo', 'bar');
    },
    // Intercept xhr while load
    'load': function(xhr) {
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
    // Occur after response and cached is done.
    'sync': function(data) {
        console.log('sync');
    }
}).then(function(data) {
    // Done.
    console.log(data);
}).catch(function(error) {
    // Something wrong.
    console.log(error);
});
```

How to develop
===
Run 
```shell
npm run dev
```
Test 
```shell
npm test
```
Deploy to git and npm
```shell
npm run deploy
```

Options
===
- [x] `cache` : Occur when got cached data.
- [x] `send`: Intercept xhr request usually to modify headers before send.
- [x] `load`: Intercept xhr while onload.
- [x] `insert` : Occur when never cache before and get insert from remote.
- [x] `update` : Cached but not match from remote.
- [x] `upsert` : Cache get `insert` or `update` from remote.
- [x] `match` : Cache data is match with remote data.
- [x] `not_mod` : Cache is match with remote by ETag.
- [x] `sync` : Occur after response and cached is done.

TODO
===
- [x] Test strategy.cacheFirst.
- [x] Test strategy.networkFirst.
- [ ] Test strategy.cacheOnly.
- [ ] Test strategy.networkOnly.
- [x] Test parallel requests.
- [ ] Implement optional `etag`. // useIfNoneMatch
- [ ] Implement optional `last-modified`. // useLastModify
- [ ] Implement `last-modified` fallback.
- [ ] Test `last-modified` fallback.
- [x] Test ready.
- [ ] Support multiple `storeName`.
- [ ] Support `Cache-Control: max-age`.
- [ ] Support xhr.responseTextType = 'json'.
- [ ] Ignore query when cache.