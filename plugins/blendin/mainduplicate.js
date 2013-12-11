(function () {
    "use strict";

    var PLUGIN_ID = require("./package.json").name,
        MENU_ID = "Blendin generator",
        MENU_LABEL = "$$$/JavaScripts/Generator/Blendin generator/Menu=Blendin generator";
    
    var _generator = null,
        _currentDocumentId = null,
        _config = null;

    var fs = require('fs'),
        path = require('path');

    function mkdir(path, root) {

        var dirs = path.split('/'), dir = dirs.shift(), root = (root||'')+dir+'/';

        try { fs.mkdirSync(root); }
        catch (e) {
            //dir wasn't made, something went wrong
            if(!fs.statSync(root).isDirectory()) throw new Error(e);
        }

        return !dirs.length||mkdir(dirs.join('/'), root);
    }

    function init(generator, config) {
        _generator = generator;
        _config = config;

        console.log("initializing generator getting started tutorial with config %j", _config);
        
        _generator.addMenuItem(MENU_ID, MENU_LABEL, true, false).then(
            function () {
                console.log("Menu created", MENU_ID);
            }, function () {
                console.error("Menu creation failed", MENU_ID);
            }
        );
        _generator.onPhotoshopEvent("generatorMenuChanged", function(event) {
            // Ignore changes to other menus
            var menu = event.generatorMenuChanged;
            if (!menu || menu.name !== MENU_ID) {
                return;
            }

            var startingMenuState = _generator.getMenuState(menu.name);
            console.log("Menu event %s, starting state %s", event, startingMenuState);
        });

        function initLater() {
            // Flip foreground color
            var flipColorsExtendScript = "var color = app.foregroundColor; color.rgb.red = 255 - color.rgb.red; color.rgb.green = 255 - color.rgb.green; color.rgb.blue = 255 - color.rgb.blue; app.foregroundColor = color;";
            sendJavascript(flipColorsExtendScript);

            _generator.onPhotoshopEvent("currentDocumentChanged", function(id) {
                console.log("handleCurrentDocumentChanged: "+id)
                setCurrentDocumentId(id);
            });
            
            _generator.onPhotoshopEvent("toolChanged", function(document){
                console.log("Tool changed " + document.id + " was changed:");
            });
            //requestEntireDocument();



            _generator.onPhotoshopEvent("imageChanged", function(document) {
                var _document = document;
        

                /*
                    { version: '1.0.0',
                      timeStamp: 1386700608.151,
                      id: 1116,
                      layers:
                       [ { id: 5,
                           index: 2,
                           added: true,
                           type: 'layer',
                           name: 'Layer 3',
                           bounds: [Object] } ],
                      selection: [ 2 ] }
                 */

                if(!_document.layers || _document.layers.length === 0){
                    return console.log('Did nothing','Was metadata',_document.metaDataOnly);
                }

                var layerId = _document.layers[0].id;

                requestEntireDocument(_currentDocumentId,function(error,data){
                    if(error){
                        return console.error(error);
                    }

                    if(!data || !data.layers || data.layers.length === 0){
                        return console.error('Wrong data object given:',data);
                    }

                    // console.log('All Data:', data);
                    // console.log('All Document', _document);
                    
                    // data.layers.forEach(function(layer){
                    //     if(layer.type === 'layerSection'){
                    //         console.log('MASK',layer.mask)
                    //         console.log('BlendOptions',layer.blendOptions);
                    //         console.log('LAYERS',layer.layers)

                    //     }
                    // });

                    // return;

                    var layer = data.layers.filter(function(layer){
                        return layer.id === layerId ? true : false;
                    }) || [];


                    if(layer.length === 0){
                        return console.error('Layer not found!');
                    }



                    var psdName = data.file.substr(data.file.lastIndexOf('/')+1,data.file.length);

                    psdName = psdName.split('.')[0];

                    console.log(psdName)

                    layer = layer[0];

                    _generator.getPixmap(_document.id,layerId,{}).then(
                        function(pixmap){

                            var layerName = layer.name.split(' ');

                            if(layerName[0] !== 'EXP'){
                                return console.log('Not working in a export layer');
                            }

                            var filename = '/Users/kristjanmik/Desktop/ps/' + psdName + '/' + layerName[1] + '.png';


                            var foldername = filename.substr(0,filename.lastIndexOf('/'));

                            mkdir(foldername)

                            console.log("got Pixmap: "+pixmap.width+" x "+pixmap.height);

                            _generator.savePixmap(pixmap, filename, {format:"png8",ppi:72});
                        },
                        function(err){
                            console.error("err pixmap:",err);
                        }
                    ).done();

                })
                return;
            });
            
        }
        
        process.nextTick(initLater);

    }

    function requestEntireDocument(documentId,callback) {
        if (!documentId) {
            console.log("Determining the current document ID");
        }
        
        _generator.getDocumentInfo(documentId).then(
            function (document) {
                callback(null,document);
            },
            function (err) {
                callback(err);
            }
        ).done();
    }

    function getBitmap(options,callback){

        console.log('getBitmap:',options);

        _generator.getPixmap(options.documentId,options.layerId,{}).then(
            function(pixmap){
                console.log("got Pixmap: "+pixmap.width+" x "+pixmap.height);
                console.log(stringify(pixmap));
                savePixmap(pixmap);

            },
            function(err){
                console.error("err pixmap:",err);
            }
        ).done();
    }

    function updateMenuState(enabled) {
        console.log("Setting menu state to", enabled);
        _generator.toggleMenu(MENU_ID, true, enabled);
    }

    /*********** HELPERS ***********/


    function sendJavascript(str){
        _generator.evaluateJSXString(str).then(
            function(result){
                console.log(result);
            },
            function(err){
                console.log(err);
            });
    }

    function setCurrentDocumentId(id) {
        if (_currentDocumentId === id) {
            return;
        }
        console.log("Current document ID:", id);
        _currentDocumentId = id;
    }

    exports.init = init;

    // Unit test function exports
    exports._setConfig = function (config) { _config = config; };
    
}());