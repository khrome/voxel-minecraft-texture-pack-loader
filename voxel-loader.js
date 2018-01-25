var csv = require('csv');
var fs = require('fs');
var group = require('group-by-subsequence');
//todo: enable client use

function metaData(cb){
    fs.readFile(__dirname+'/block_list.csv', function(err, data){
        csv.parse(data, function(err, data){
            cb(undefined, data)
        });
    });
}

var minecraftData = {};

function minecraftLoader(directory, cb){
    //todo: cache switch
    if(minecraftData[directory]) return cb(undefined, minecraftData[directory]);
    var dir = directory+'/assets/minecraft/textures/blocks';
    fs.readdir(dir,function(err, list){
        var blocks = group(list, {
            stopwords : [
                'log', 'rail', 'trip', 'sapling', 'leaves',
                'mushroom', 'nether', 'bed'
            ],
            replacements : {
                png : 'side'
            },
            wordBoundary : '_',
            objectReturn : function(s, prefix){
                return s.substring(prefix.length).split('.').shift();
            }
        });
        metaData(function(err, materials){
            var finalMaterials = [];
            var flatIndex = [];
            materials.forEach(function(material, index){
                var simpleName = material[3].split(':').pop();
                var meta = {
                    id : material[0].trim(),
                    label : material[1].trim(),
                    index : parseInt(material[2]),
                    code : material[3].trim(),
                    actualIndex : index,
                    flatIndex : index,
                };

                var cans = [];
                var keywords;
                var labelwords;
                var blockNameIndex = Object.keys(blocks);
                blockNameIndex.forEach(function(key, index){
                    keywords = key.split('_');
                    cans[index] = 0;
                    keywords.forEach(function(keyword){
                        labelwords = meta.label.toLowerCase().split(' ');
                        labelwords.forEach(function(labelword){
                            if(labelword === keyword){
                                cans[index]++;
                            }
                        })
                    })
                    cans[index] = cans[index]?
                        (
                            // #of matching words
                            cans[index] /
                            // #of unique words
                            (keywords.length + labelwords.length - cans[index])
                        ):0;
                    var highestValue =0;
                    var highestPosition;
                    cans.forEach(function(can, index){
                        if(can > highestValue){
                            highestValue = can;
                            highestPosition = index;
                        }
                    })
                    if(highestValue){ //if we have a sorted candidate
                        meta['block_textures'] = blocks[blockNameIndex[highestPosition]];
                    }
                });
                //match any string from simple name
                if(!meta['block_textures']) Object.keys(blocks).forEach(function(key){
                    if(key.indexOf(simpleName) !== -1){
                        meta['block_textures'] = blocks[key]
                    }
                });
                //nothing? then stuff something in there
                if(!meta['block_textures']){

                    meta['block_textures'] = {
                        side : 'glass.png'
                    }
                    if(meta.index == 3) meta.block_textures.side = 'dirt.png'
                }
                flatIndex[index] = meta;
                if(finalMaterials[meta.index]){
                    if(!finalMaterials[meta.index].alternates)
                        finalMaterials[meta.index].alternates = [];
                    finalMaterials[meta.index].alternates.push(meta);
                }else{
                    finalMaterials[meta.index] = meta;
                }
            });
            //if(!minecraftData[directory]) minecraftData[directory] = {};
            //skip air, trim records (work out non-continuity later)
            finalMaterials = finalMaterials.slice(1, 450).map(function(item){
                if(item) return item;
                else return { textures : {
                    side : 'glass.png'
                }};
            });
            var control = {
                mapName : 'mcmap',
                forEach : function(cb){
                    finalMaterials.forEach(cb)
                },
                toArray : function(){
                    return finalMaterials;
                },
                toTextureList : function(){
                    var results = flatIndex.map(function(i){
                        var item = i.block_textures;
                        if(item.top && item.bottom && item.side){
                            return [item.top, item.bottom, item.side];
                        }
                        if(item.top && item.side){
                            return [item.top, item.side, item.side];
                        }
                        if(item.bottom && item.side){
                            return [item.side, item.bottom, item.side];
                        }
                        var single = item.side || item.block_side || item.block;
                        //if(!(item.side || item.block_side)) console.log('sideless', item)
                        return single || 'iron_bars.png';
                    });
                    return results;
                },
                toString : function(){
                    return JSON.stringify(finalMaterials, undefined, '    ')
                },
                block : function(id, returnParent){
                    if(typeof id == 'number'){
                        return finalMaterials[id];
                    }
                    if(typeof id == 'string'){
                        if(id.indexOf('minecraft:') !== -1){
                            var result;
                            var subresult;
                            finalMaterials.forEach(function(material){
                                if(material.code == id && !result) result = material;
                                if(material.alternates && !result){
                                    material.alternates.forEach(function(submaterial){
                                        if(submaterial.code == id && !result){
                                            result = material;
                                            subresult = submaterial
                                        }
                                    });
                                }
                            });
                            return returnParent?result:(subresult || result);
                        }
                        if(true){ //
                            var result;
                            var subresult;
                            finalMaterials.forEach(function(material){
                                if(material.id == id && !result) result = material;
                                if(material.alternates && !result){
                                    material.alternates.forEach(function(submaterial){
                                        if(submaterial.id == id && !result){
                                            result = material;
                                            subresult = submaterial
                                        }
                                    });
                                }
                            });
                            return returnParent?result:(subresult || result);
                        }
                    }
                }
            }
            minecraftData[directory] = control;
            if(cb) cb(undefined, control);
        });
    });
}

/*minecraftLoader('./texture-packs/PhotoRealistic', function(err, pack){
    console.log('TEXTURES', pack.toTextureList());
    //console.log('BRICK', pack.block('minecraft:dirt'))
    //console.log('BRICK', pack.block('1-3'));
    //console.log('BRICK', pack.block(2));
});*/

module.exports = minecraftLoader;
