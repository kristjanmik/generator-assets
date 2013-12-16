(function () {
    "use strict"; //Because we are evil

    var fs = require('fs'),
        path = require('path'),
        growl = require('growl');

    /**
     * The Generator init function
     * @param {object} generator Photoshop generator
     * @param {object} config    Config object
     */
    function Generator(generator, config) {
        console.log('Starting up:', require("./package.json").name);

        this.generator = generator;
        this.generatorConfig = config;

        this.document = {
            id: null,
            obj: null
        };

        this.config = {
            menu: {
                id: 'blendin',
                label: 'Blendin'
            },
            path: '/Users/kristjanmik/Desktop/ps/'
        };

        //this.outputAssets();

        this.addEventListeners();
    }

    /**
     * Sets up the photoshop event listeners
     */
    Generator.prototype.addEventListeners = function () {
        var self = this;

        //Add a menu item into Photoshop
        this.generator.addMenuItem(self.config.menu.id, self.config.menu.label, true, false).then(
            function () {
                console.log('Menu created', self.config.menu.id);
            },
            function () {
                console.error('Menu creation failed', self.config.menu.id);
            }
        );

        //If something is clicked in the generator menu we will catch it here
        this.generator.onPhotoshopEvent('generatorMenuChanged', function (event) {
            var menu = event.generatorMenuChanged;

            // Ignore changes to other menus
            if (!menu || menu.name !== self.config.menu.id) {
                return;
            }

            var startingMenuState = self.generator.getMenuState(menu.name);
            console.log('Menu event for:', menu, 'starting state:', startingMenuState);
        });

        //If the open .psd file is changed
        this.generator.onPhotoshopEvent('currentDocumentChanged', function (id) {
            console.log('Swapped to a new document with the id: ', id);
            this.document.id = id;
        });

        this.generator.onPhotoshopEvent('imageChanged', function () {
            console.log('Asset is changed');
            self.outputAssets();
        });

        //When a tool is changed this event will fire
        this.generator.onPhotoshopEvent('toolChanged', function (document) {
            console.log('Tool changed ' + document.id + ' was changed:');
        });
    };

    /**
     * Bootstraps the assets exporting process
     */
    Generator.prototype.outputAssets = function () {
        var self = this;

        self.generator.getDocumentInfo(self.document.id).then(
            function (document) {
                self.document.obj = document;
                self.processDocument.call(self, null, document);
            },
            function (error) {
                console.error(error);
            }
        ).done();
    };

    Generator.prototype.processDocument = function (error, data) {
        if (error) {
            return console.error('Error in processing doccument', error);
        }

        var self = this;

        self.sendMessage('Processing the .psd document, please wait');

        var filename = data.file,
            timestamp = data.timeStamp;

        console.log(filename, timestamp)


        function createLayersIMG(layers) {
            layers.l.forEach(function (layer) {
                if (!layer.visible) {
                    return;
                }

                if (layer.type === 'layerSection') {
                    createLayersIMG({
                        isTopLevel: false,
                        l: layer.layers
                    });
                } else if (layer.type === 'layer') {
                    //Create the image here

                    //Check if this is something to process
                    //@TODO rethink when the merging of layers is implemented
                    var toProcess = self.checkIfProcess(layer.name);

                    if (!toProcess) {
                        return;
                    }

                    console.log('Processing layer:', layer.name);

                    console.log('toProcess', toProcess);

                    if (toProcess.types.android.low) {
                        self.create({
                            document: self.document.obj.id,
                            layer: layer.id,
                            filename: self.config.path + 'andoid/res-notlong-port-ldpi/' + toProcess.filename + '.' + toProcess.extension,
                            fileInfo: {
                                format: toProcess.format,
                                ppi: 72,
                                half: true
                            }
                        });
                    }

                    if (toProcess.types.android.mid) {
                        self.create({
                            document: self.document.obj.id,
                            layer: layer.id,
                            filename: self.config.path + 'andoid/res-notlong-port-mdpi/' + toProcess.filename + '.' + toProcess.extension,
                            fileInfo: {
                                format: toProcess.format,
                                ppi: 72
                            }
                        });
                    }

                    if (toProcess.types.android.high) {
                        self.create({
                            document: self.document.obj.id,
                            layer: layer.id,
                            filename: self.config.path + 'andoid/res-notlong-port-hdpi/' + toProcess.filename + '.' + toProcess.extension,
                            fileInfo: {
                                format: toProcess.format,
                                ppi: 72,
                                double: true
                            }
                        });
                    }

                    if (toProcess.types.ios.mid) {
                        self.create({
                            document: self.document.obj.id,
                            layer: layer.id,
                            filename: self.config.path + 'ios/' + toProcess.filename + '.' + toProcess.extension,
                            fileInfo: {
                                format: toProcess.format,
                                ppi: 72
                            }
                        });
                    }

                    if (toProcess.types.ios.high) {
                        self.create({
                            document: self.document.obj.id,
                            layer: layer.id,
                            filename: self.config.path + 'ios/' + toProcess.filename + '@2x.' + toProcess.extension,
                            fileInfo: {
                                format: toProcess.format,
                                ppi: 72,
                                double: true
                            },
                        });
                    }
                }
            });
        }

        createLayersIMG({
            isTopLevel: true,
            l: data.layers
        })

    }

    Generator.prototype.checkIfProcess = function (layerName) {
        var self = this,
            output = {
                types: {
                    android: {
                        low: false,
                        mid: false,
                        high: false
                    },
                    ios: {
                        mid: false,
                        high: false
                    }
                }
            };

        var psdName = self.document.obj.file.split('/');
        psdName = psdName[psdName.length - 1];

        //Check if the psdName contains android or ios
        if (psdName.indexOf('android') === -1 && psdName.indexOf('ios') === -1) {
            console.log('Returning false because psdName is not android or ios')
            return false;
        }

        output.psdName = psdName;

        var layerSegments = layerName.split('.'),
            extension = layerSegments[layerSegments.length - 1];
        //Check if the extension is valid	
        if (['png', 'jpg', 'gif', 'bmp'].indexOf(extension) === -1) {
            console.log('Not the right filetype');
            return false;
        }
        console.log('Found filetype:', layerSegments);

        output.extension = extension;

        output.format = (output.extension === 'png' ? 'png8' : output.extension);

        var types = layerSegments[0];

        if (types.indexOf('+-') > -1 || types.indexOf('-+') > -1) {
            //All types
            output.types.android.low = true;
            output.types.android.mid = true;
            output.types.android.high = true;
            output.types.ios.mid = true;
            output.types.ios.high = true;

            output.filename = types.substr(0, types.length - 2);

        } else if (types.indexOf('+') > -1) {
            //Normal and high res
            output.types.android.mid = true;
            output.types.android.high = true;
            output.types.ios.mid = true;
            output.types.ios.high = true;

            output.filename = types.substr(0, types.length - 1);
        } else if (types.indexOf('-') > -1) {
            output.types.android.low = true;
            output.types.android.mid = true;
            output.types.ios.mid = true;

            output.filename = types.substr(0, types.length - 1);
        } else {
            output.types.android.mid = true;
            output.types.ios.mid = true;

            output.filename = types;
        }

        if (output.psdName.indexOf('android') === -1) {
            output.types.android.low = false;
            output.types.android.mid = false;
            output.types.android.high = false;
        } else if (output.psdName.indexOf('ios') === -1) {
            output.types.ios.mid = false;
            output.types.ios.high = false;
        }

        return output;
    }

    /**
     * Gets a pixmap from a layer
     * @param options   An object with settings for the bitmap
     * @param {!integer}  options.document  The document id
     * @param {!integer}  options.layer  The layer id
     * @param {function} callback The callback to execute
     */
    Generator.prototype.getPixmap = function (options, callback) {
        this.generator.getPixmap(options.document, options.layer, {}).then(
            function (pixmap) {
                callback(null, pixmap);
            },
            function (error) {
                callback(error);
            }
        ).done();
    }

    /**
     * Saves a given pixmap
     * @param  {object} pixmap   The pixmap
     * @param  {String} filepath The path to save the pixmap
     * @param  {object} fileSettings        Image settings
     */
    Generator.prototype.savePixmap = function (pixmap, filepath, fileSettings) {
        var options = fileSettings || {
            format: "png8",
            ppi: 72
        };

        this.mkdir(filepath.substr(0, filepath.lastIndexOf('/')));
        this.generator.savePixmap(pixmap, filepath, options);
    }

    Generator.prototype.create = function (options) {
        var self = this;

        self.getPixmap(options, function (error, pixmap) {
            console.log(error, pixmap)

            delete options.document;
            delete options.layer;

            self.savePixmap(pixmap, options.filename, options.fileInfo);
        })
    }

    /**
     * Sends a message to the notification center
     * @param  {String} message The message
     */
    Generator.prototype.sendMessage = function (message) {
        return growl(message);
    }

    /**
     * Creates a folder recursively to the path given
     * @param  {String} path The path to create
     * @param  {String} root What is yet to be created
     */
    Generator.prototype.mkdir = function (path, root) {
        var self = this;
        var dirs = path.split('/'),
            dir = dirs.shift(),
            root = (root || '') + dir + '/';

        try {
            fs.mkdirSync(root);
        } catch (e) {
            //dir wasn't made, something went wrong
            if (!fs.statSync(root).isDirectory()) throw new Error(e);
        }

        return !dirs.length || self.mkdir(dirs.join('/'), root);
    }

    exports.init = function (generator, config) {
        return new Generator(generator, config);
    };

    // Unit test function exports, also needed for the generator
    exports._setConfig = function (config) {
        _config = config;
    };
})()