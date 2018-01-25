voxel-minecraft-texture-pack-loader
===================================

I want to index all the blocks from a minecraft theme and didn't find anything I like, so I built this.

Currently support is limited to blocks, but I'll eventually expand it to more. It uses a prefix/suffix based auto-loader, which is still undergoing work, once that's done I'll need to alias the remaining fields to finish it. I'd estimate 30% of the blocks are currently there, the rest are glass textured.

Usage
-----

    var minecraftLoader = require('voxel-minecraft-texture-pack-loader');
    minecraftLoader('/path/to/my/texturePack', function(err, pack){
        /* pack.toArray() looks like:
            [
                ...
                {
                    "id": "2-0",
                    "label": "Grass",
                    "index": "2",
                    "code": " minecraft:grass",
                    "textures": {
                        "side": "grass_side.png",
                        "side_overlay": "grass_side_overlay.png",
                        "side_snowed": "grass_side_snowed.png",
                        "top": "grass_top.png"
                    }
                }
                ...
            ]
        */
     });

Utility Functions
-----------------

- **pack.forEach(callback)** - Iterate over the set
- **pack.block(id, callback)** - The provided id can be a numeric index like `1` or a sting like `'1-3'` or a string like`'minecraft:dirt'`

Testing
-------
Eventually it'll be:

    mocha

Enjoy,

 -Abbey Hawk Sparrow
