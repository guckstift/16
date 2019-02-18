build: ./bundles/mesher.js ./bundles/generator.js

install:
	sudo npm i -g rollup

clean:
	rm ./bundles/*.js


./bundles/mesher.js: ./src/*.js
	rollup ./src/mesher.js --file ./bundles/mesher.js --format iife --name mesher

./bundles/generator.js: ./src/*.js
	rollup ./src/generator.js --file ./bundles/generator.js --format iife --name generator


.PHONY: build install clean
