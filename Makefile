build: ./bundles/mesher.js

install:
	sudo npm i -g rollup

clean:
	rm ./bundles/*.js


./bundles/mesher.js: ./src/*.js
	rollup ./src/mesher.js --file ./bundles/mesher.js --format iife --name mesher


.PHONY: build install clean
