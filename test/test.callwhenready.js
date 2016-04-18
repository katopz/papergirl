/* global beforeEach:true */
this.mocha.setup('bdd');

beforeEach(function(done) {
    ////var previousDriver = papergirl.driver();

    function rerequirepapergirl() {
        // The API method stubs inserted by callWhenReady must be tested before
        // they are replaced by the driver, which happens as soon as it loads.
        //
        // To ensure that they work when the drivers are loaded asynchronously,
        // we run the entire test suite (except for config tests), but undefine
        // the papergirl module and force it to reload before each test, so that
        // it will be initialized again.
        //
        // This ensures that the synchronous parts of papergirl initialization
        // and the API calls in the tests occur first in every test, such that the
        // callWhenReady API method stubs are called before RequireJS
        // asynchronously loads the drivers that replace them.
        require.undef('papergirl');
        require(['papergirl'], function(papergirl) {
            ////papergirl.setDriver(previousDriver);
            window.papergirl = papergirl;
            done();
        });
    }

    papergirl.ready().then(function() {
        ////previousDriver = papergirl.driver();
        rerequirepapergirl();
    }, function() {
        rerequirepapergirl();
    });
});
