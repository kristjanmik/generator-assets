//this.generator.onPhotoshopEvent("imageChanged", self.modified);


Generator.prototype.modified = function(doc){

    //Make sure we have a layer
    if(!doc.layers || doc.layers.length === 0){
        return console.log('Did nothing','Was metadata',doc.metaDataOnly);
    }

    //Only one layer is returned for a change event
    var layerId = doc.layers[0].id;

    requestEntireDocument(this.document.id,function(error,data){
        if(error){
            return console.error(error);
        }

        if(!data || !data.layers || data.layers.length === 0){
            return console.error('Wrong data object given:',data);
        }

        // console.log('All Data:', data);
        // console.log('All Document', doc);
        
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

        _generator.getPixmap(doc.id,layerId,{}).then(
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

//Sends stuff to eval, currently unused
Generator.prototype.sendJS = function(str,callback){
    _generator.evaluateJSXString(str).then(
        function(result){callback(null,result)},
        function(err){callback(err)}
    );
}