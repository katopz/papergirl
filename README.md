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

How to use
===
* Simple request.
```js
// Will get from cached first if has and then remote after that.
papergirl.getCacheFirst('foo.json', function(data) {
    // Cache is faster so this will call first.
    console.log('cached : ' + data);
}).then(function(data) {
    // And then we got update from remote.
    console.log('remote : ' + data);
});
```
* Simple request with `beforeSend` intercept.
```js
// Will get from cached first if has and then remote after that.
papergirl.getCacheFirst('foo.json', function(data) {
    // Cache is faster so this will call first.
    console.log('cached : ' + data);
}, {
    // Intercept xhr request to modify headers before send.
    'beforeSend': function(xhr) { 
        xhr.setRequestHeader('foo', 'bar'); 
    },
    // Intercept xhr while onload
    'onload': function(xhr) {
        console.log(xhr);
    }
}).then(function(data) {
    // And then we got update from remote.
    console.log('remote : ' + data);
});
```

Options
===
- [x] 'etag' : Capture `etag` from response header and send back to get 304 to save latency. 
- [x] `beforeSend`: Intercept xhr request usually to modify headers before send.
- [x] `onload`: Intercept xhr while onload.

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
- [ ] Support multiple `storeName`.
- [ ] Support `Cache-Control: max-age`.
- [ ] Support xhr.responseTextType = 'json'.
- [ ] Ignore query when cache.