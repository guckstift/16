# TODO

* async generation of chunks with worker
* model batching and instancing
* create ocean layer
* implement shadow mapping
* carve caves into landscape
* bug: slope glitches at
	[33.59912694245577, 17.84912872314453, 17.34668625332415]
	[50.39612765714992, 38.03401565551758, 32.78401653841138]
	[1.1936624720547115, 1.4436625242233276, 49.86722643300891]
* bug: missing collision for bridge slope
	[131.35515879956074, 69.60516357421875, 181.13658461347222]
* bug: slope vertices need to be flipped
	[129.72039170307107, 67.52290344238281, 173.72709045762895]
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
