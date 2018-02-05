var csv = require('csv');
var fs = require('fs');
var Levenshtein = require('levenshtein');
var distance = function(a, b){
    return new Levenshtein( a, b ).distance
}
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

var aliasWords = {
    wood : 'log',
    smooth : 'polished',
}

var alias = function(key){
    return aliasWords[key.toLowerCase?key.toLowerCase():key] || key;
}

function minecraftLoader(directory, cb){
    //todo: cache switch
    if(minecraftData[directory]) return cb(undefined, minecraftData[directory]);
    var dir = directory+'/assets/minecraft/textures/blocks';
    fs.readdir(dir,function(err, list){
        var blocks = group(list, {
            stopwords : [
                'log', 'rail', 'trip', 'sapling', 'leaves', 'hardened',
                'mushroom', 'nether', 'bed', 'red', 'sea', 'quartz', 'planks','stone',
                'flower', 'emerald', 'diamond', 'coal', 'gold', 'iron'
            ],
            replacements : {
                png : 'side',
                smooth : 'polished'
            },
            alias : aliasWords,
            wordBoundary : '_',
            objectReturn : function(s, prefix){
                return s.substring(prefix.length).split('.').shift();
            }
        });
        metaData(function(err, materials){
            var finalMaterials = [];
            var flatIndex = [];
            var out;
            materials.map(function(material, materialIndex){
                var simpleName = material[3].split(':').pop();
                var meta = {
                    id : material[0].trim(),
                    label : material[1].trim()
                        //should be fixed in list
                        .replace('Wood Plank', 'Plank'),
                    index : parseInt(material[2]),
                    code : material[3].trim(),
                    actualIndex : materialIndex,
                    flatIndex : materialIndex,
                };
                var labelwords = meta.label.toLowerCase().split(' ');
                var blockNameIndex = Object.keys(blocks);
                var blockLabels = blockNameIndex.map(function(key, blockIndex){
                    var buff = {};
                    var can = 0;
                    keywords = key.split('_');
                    var matches = labelwords.map(function(l){
                        var labelword = alias(l); //labels haven't been aliased
                        var bestWord = keywords.map(function(keyword){
                            var dis = distance(keyword, labelword);
                            var diff = (labelword.length-Math.abs(keyword.length - labelword.length))/
                                labelword.length;
                            var score = diff*Math.max((labelword.length - dis)/labelword.length, 0);
                            return {
                                keyword:keyword,
                                score:score
                            }
                        }).reduce(function(a, b){
                            return a.score > b.score?a:b;
                        });
                        bestWord.labelword = labelword;
                        return bestWord;
                    });
                    var keyScore = matches.reduce(function(a, b){
                        return {
                            score:a.score+b.score
                        };
                    });
                    keyScore.key = key;
                    keyScore.index = blockIndex;
                    return keyScore;
                });
                blockLabels = blockLabels.filter(function(item){
                    return item.score !== 0;
                }).sort(function(a, b){
                    if(a.score < b.score) return 1;
                    if(a.score > b.score) return -1;
                    return 0;
                });
                meta['block_textures'] = blocks[blockLabels[0].key];
                flatIndex[materialIndex] = meta;
                if(finalMaterials[meta.index]){
                    if(!finalMaterials[meta.index].alternates)
                        finalMaterials[meta.index].alternates = [];
                    finalMaterials[meta.index].alternates.push(meta);
                }else{
                    finalMaterials[meta.index] = meta;
                }
                if(materialIndex==1){
                    meta['block_textures']= {side:'stone.png'};
                }
            });
            //process.exit();
            //if(!minecraftData[directory]) minecraftData[directory] = {};
            //skip air, trim records (work out non-continuity later)
            finalMaterials = finalMaterials.slice(1, 450).map(function(item){
                if(item) return item;
                else return { textures : {
                    side : 'mob_spawner.png'
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
                        var side = item.side || item.block_side || item.block || item.normal;
                        var top = item.top || item.bottom || side;
                        var bottom = item.bottom || item.top || side;
                        var front = item.front || side || item.back;
                        var back = item.back || item.top || side;
                        if(!(side || top || bottom)) return 'redstone_block.png';
                        return [top, bottom, side, side, front, back];
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
