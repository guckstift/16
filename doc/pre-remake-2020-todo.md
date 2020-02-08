# To Do

* create ocean layer
* carve caves into landscape
* create simple height map editor
* bug: missing collision for bridge slope
	[131.35515879956074, 69.60516357421875, 181.13658461347222]
	[78.29574732808396, 7, 90.42907194048166]
* bug: jumping sometimes hangs when running on slopes
* bug: jittery walk on slopes upwards
* bug: improve slope normal calculation
* bug: improve slope AO calculation

# Done

* Use chunk vicinity to calculate mesh
* Implement a skybox
* Distance fog
* Sun vector movement
* blender a simple tree and import into game
* make an infinite ground plane
* create sun sprite moving with the vector
* bug: missing block at [63.4689856704790, 47, 45.3498148769140] [143.25, 47, 127.534036636119]
	-> was a bug in ChunkData: intervalPlace()
* make a slope block
* collide and slide with slope block
* bug: lots of slopes missing [70.0534761659801, 28, 25.381044451147318]
	-> fixing block loop within slopes are modified in generator
* async meshing of chunks with worker
* model batching and instancing
* async generation of world with worker
* generate trees on map
* implement shadow mapping
* bug: slope glitches
	-> new slope generation
* bug: slope vertices need to be flipped
