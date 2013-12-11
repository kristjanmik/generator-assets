(function () {
    "use strict";

    var fs = require('fs'),
        path = require('path'),
        growl = require('growl');

    //_generator.toggleMenu(MENU_ID, true, enabled);
    //_generator.getPhotoshopPath()
    //deleteDirectoryIfEmpty
    //reportErrorsToUser
    //document.closed ef búið er að loka psd skjali
    //include-ancestor-masks
    function Generator(generator, config){
    	var self = this;
    	console.log('Starting up:',require("./package.json").name)
    	//console.log(generator, config);
    	this.generator = generator;
    	this.generatorConfig = config;

    	this.document = {
    		id: null,
    		obj: null
    	}

    	this.config = {
    		menu: {
    			id: 'blendin',
    			label: 'Blendin'
    		},
    		path: '/Users/kristjanmik/Desktop/ps/'
    	}

    	self.outputAssets();
    	this.addEventListeners();
    }

    Generator.prototype.outputAssets = function(){
    	var self = this;
    	self.updateDocument(self.processDocument.bind(self));
    }

    Generator.prototype.sendMessage = function(message){
    	return growl(message);
    }

    Generator.prototype.addEventListeners = function(){
    	var self = this;

    	this.generator.addMenuItem(self.config.menu.id, self.config.menu.label, true, false).then(
            function () { console.log('Menu created', self.config.menu.id); }, 
            function () { console.error('Menu creation failed', self.config.menu.id); }
        );

        this.generator.onPhotoshopEvent('generatorMenuChanged', function(event) {
            var menu = event.generatorMenuChanged;

            // Ignore changes to other menus
            if (!menu || menu.name !== self.config.menu.id) {
                return;
            }

            var startingMenuState = self.generator.getMenuState(menu.name);
            console.log('Menu event for:', menu, 'starting state:', startingMenuState);
        });

        this.generator.onPhotoshopEvent('currentDocumentChanged', function(id) {
            console.log('Swapped to a new document with the id: ',id)
            this.document.id = id;
        });

        //this.generator.onPhotoshopEvent("imageChanged", self.modified);
        
        this.generator.onPhotoshopEvent('imageChanged',function(){
        	console.log('Asset is changed');
        	self.outputAssets();
        })

        // this.generator.onPhotoshopEvent('toolChanged', function(document){
        //     console.log('Tool changed ' + document.id + ' was changed:');
        // });
    };

    Generator.prototype.modified = function(document){



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

        requestEntireDocument(this.document.id,function(error,data){
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


    }

    Generator.prototype.updateDocument = function(callback){
    	var self = this;
        this.generator.getDocumentInfo(this.document.id).then(
            function (document) {
            	self.document.obj = document;
                callback(null,document);
            },
            function (err) {
                callback(err);
            }
        ).done();
    }

    Generator.prototype.processDocument = function(error,data){
    	if(error){
    		throw new Error(error);
    	}
    	var self = this;

    	self.sendMessage('Processing the .psd document, please wait');

    	var filename = data.file,
    		timestamp = data.timeStamp;

    	console.log(filename,timestamp)


    	function createLayersIMG(layers){
    		layers.l.forEach(function(layer){
    			if(!layer.visible){
    				return;
    			}

    			if(layer.type === 'layerSection'){
    				createLayersIMG({isTopLevel:false,l:layer.layers});
    			}else if(layer.type === 'layer'){
    				//Create the image here
    				
    				//Check if this is something to process
    				//@TODO rethink when the merging of layers is implemented
    				var toProcess = self.checkIfProcess(layer.name);

    				if(!toProcess){
    					return;
    				}

    				console.log('Processing layer:',layer.name);

    				console.log('toProcess',toProcess);

    				if(toProcess.types.android.low){
	    				self.create({
				    		document: self.document.obj.id,
							layer: layer.id,
							filename: self.config.path + 'andoid/res-notlong-port-ldpi/' + toProcess.filename + '.' + toProcess.extension,
							fileInfo: {
								format:toProcess.format,
								ppi:72,
								half: true
							}
				    	});
    				}

    				if(toProcess.types.android.mid){
	    				self.create({
				    		document: self.document.obj.id,
							layer: layer.id,
							filename: self.config.path + 'andoid/res-notlong-port-mdpi/' + toProcess.filename + '.' + toProcess.extension,
							fileInfo: {
								format:toProcess.format,
								ppi:72
							}
				    	});
    				}

    				if(toProcess.types.android.high){
	    				self.create({
				    		document: self.document.obj.id,
							layer: layer.id,
							filename: self.config.path + 'andoid/res-notlong-port-hdpi/' + toProcess.filename + '.' + toProcess.extension,
							fileInfo: {
								format:toProcess.format,
								ppi:72,
								double: true
							}
				    	});
    				}

    				if(toProcess.types.ios.mid){
	    				self.create({
				    		document: self.document.obj.id,
							layer: layer.id,
							filename: self.config.path + 'ios/' + toProcess.filename + '.' + toProcess.extension,
							fileInfo: {
								format:toProcess.format,
								ppi:72
							}
				    	});
    				}

    				if(toProcess.types.ios.high){
	    				self.create({
				    		document: self.document.obj.id,
							layer: layer.id,
							filename: self.config.path + 'ios/' + toProcess.filename + '@2x.' + toProcess.extension,
							fileInfo: {
								format:toProcess.format,
								ppi:72,
								double: true
							},
				    	});
    				}
    			}
    		});
    	}
    	
    	createLayersIMG({isTopLevel:true,l:data.layers})
    	
    }

    Generator.prototype.checkIfProcess = function(layerName){
    	/*
    		/android/leftdrawer/asset.png
    	 */
    	var self = this,
    		output = {
    			types: {
    				android: {
    					low: false,
    					mid: false,
    					high: false
    				},
    				ios: {
    					mid:false,
    					high:false
    				}
    			}
    		};

    	var psdName = self.document.obj.file.split('/');
    		psdName = psdName[psdName.length-1];

    	//Check if the psdName contains android or ios
    	if(psdName.indexOf('android') === -1 && psdName.indexOf('ios') === -1){
    		console.log('Returning false because psdName is not android or ios')
    		return false;
    	}

    	output.psdName = psdName;

    	var layerSegments = layerName.split('.'),
    		extension = layerSegments[layerSegments.length-1];
    	//Check if the extension is valid	
    	if(['png','jpg','gif','bmp'].indexOf(extension) === -1){
    		console.log('Not the right filetype');
    		return false;
    	}
    	console.log('Found filetype:',layerSegments);

    	output.extension = extension;

    	output.format = (output.extension === 'png' ? 'png8' : output.extension);

    	var types = layerSegments[0];

    	if(types.indexOf('+-') > -1 || types.indexOf('-+') > -1){
    		//All types
    		output.types.android.low = true;
    		output.types.android.mid = true;
    		output.types.android.high = true;
    		output.types.ios.mid = true;
    		output.types.ios.high = true;

    		output.filename = types.substr(0, types.length-2);

    	}else if(types.indexOf('+') > -1){
    		//Normal and high res
    		output.types.android.mid = true;
    		output.types.android.high = true;
    		output.types.ios.mid = true;
    		output.types.ios.high = true;

    		output.filename = types.substr(0, types.length-1);
    	}else if(types.indexOf('-') > -1){
    		output.types.android.low = true;
    		output.types.android.mid = true;
    		output.types.ios.mid = true;

    		output.filename = types.substr(0, types.length-1);
    	}else{
    		output.types.android.mid = true;
    		output.types.ios.mid = true;

    		output.filename = types;
    	}

    	if(output.psdName.indexOf('android') === -1){
    		output.types.android.low = false;
    		output.types.android.mid = false;
    		output.types.android.high = false;
    	}else if(output.psdName.indexOf('ios') === -1){
    		output.types.ios.mid = false;
    		output.types.ios.high = false;
    	}

    	return output;
    }

    /**
     * @param options   An object with settings for the bitmap
     * @param {!integer}  options.document  The document id
     * @param {!integer}  options.layer  The layer id
     */
    Generator.prototype.getPixmap = function(options,callback){
    	this.generator.getPixmap(options.document,options.layer,{}).then(
            function(pixmap){ callback(null,pixmap); },
            function(error){ callback(error); }
        ).done();
    }

    Generator.prototype.savePixmap = function(pixmap,filepath,o){
    	var options = o || {format:"png8",ppi:72};
    	
    	this.mkdir(filepath.substr(0,filepath.lastIndexOf('/')));
    	this.generator.savePixmap(pixmap, filepath, options);
    }

    Generator.prototype.create = function(options){
    	var self = this;

    	self.getPixmap(options,function(error,pixmap){
    		console.log(error,pixmap)

    		delete options.document;
    		delete options.layer;

    		self.savePixmap(pixmap,options.filename,options.fileInfo);
    	})
    }

    //Sends stuff to eval, currently unused
    Generator.prototype.sendJS = function(str,callback){
        _generator.evaluateJSXString(str).then(
            function(result){callback(null,result)},
            function(err){callback(err)}
        );
    }


    /**
     * Helpers
     */
    
    Generator.prototype.mkdir = function(path, root) {
    	var self = this;
        var dirs = path.split('/'), dir = dirs.shift(), root = (root||'')+dir+'/';

        try { 
        	fs.mkdirSync(root); 
        }catch (e) {
            //dir wasn't made, something went wrong
            if(!fs.statSync(root).isDirectory()) throw new Error(e);
        }

        return !dirs.length||self.mkdir(dirs.join('/'), root);
    }

    exports.init = function(generator, config){
    	return new Generator(generator, config);
    };

    // Unit test function exports
    exports._setConfig = function (config) { _config = config; };
})()