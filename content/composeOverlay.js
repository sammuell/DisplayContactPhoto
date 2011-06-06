if (!contactPhoto) var contactPhoto = {};


contactPhoto.compose = {
	photoStack: {
		width: 250,
		height: 90,
		padding: 2
	},
	
	stackDrawNumber: 0,
	widget: null,
	widgetParent: null,
	photoStackInitDone: false,
	canvasClickTimeout: 0,
	
	initPhotoStack: function() {
		if (contactPhoto.debug) dump('--------------- initPhotoStack\n')
		if (contactPhoto.compose.photoStackInitDone) return;
		contactPhoto.compose.photoStackInitDone = true;


		contactPhoto.compose.widget = document.getElementById('addressingWidget'); /* addressingWidget is a <listbox> */

		// init first textbox
		contactPhoto.compose.newListitem(contactPhoto.compose.widget.getElementsByTagName('listitem')[0]);

		if (contactPhoto.prefs.get('composePhotos.display', 'bool')) {
			/* replace <addressingWidget/> with

			<hbox id='DiCoP-AddressingContainer'>
				<box id="DiCoP-PhotoStackContainer'>
					<canvas id='DiCoP-PhotoStack'/>
				</box>
				<addressingWidget/>
			</hbox>
			*/

			var wParent = contactPhoto.compose.widget.parentNode;

			var hbox = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'hbox');
			hbox.flex = '1';
			hbox.id = 'DiCoP-AddressingContainer';
			wParent.insertBefore(hbox, contactPhoto.compose.widget.nextSibling);
			
			// create a box around the canvas to center the canvas
			var box = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'box');
			box.align = 'center';
			box.id = 'DiCoP-PhotoStackContainer';
			box.style.overflow = 'hidden'

			var canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
			canvas.id = 'DiCoP-PhotoStack';
			canvas.width = contactPhoto.compose.photoStack.width;
			canvas.height = contactPhoto.compose.photoStack.height;
			canvas.style.width = contactPhoto.compose.photoStack.width+'px';
			canvas.style.height = contactPhoto.compose.photoStack.height+'px';

			canvas.addEventListener('click', function() {
				if (contactPhoto.debug) dump("\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n")
				
				// capture subsequent clicks on the canvas and exit
				if (new Date().getTime() - contactPhoto.compose.canvasClickTimeout < 500) return;
				contactPhoto.compose.canvasClickTimeout = new Date().getTime();
				
				var widget = document.getElementById('addressingWidget');
				
				var textboxes = widget.getElementsByTagName("textbox");
				
				if (textboxes.length > 1) {
					// get type and value of first row
					var type = awGetPopupElement(1).selectedItem.getAttribute("value");
					var value = awGetInputElement(1).value;
					
					// remove the first row
					awDeleteRow(1);
					
					// add a new row at the bottom
					awAddRecipient(type, value);
				}
			}, false);
			
			box.appendChild(canvas);

			if (contactPhoto.prefs.get('composePhotos.position', 'char') == 'left') {
				hbox.appendChild(box);
				hbox.appendChild(wParent.removeChild(contactPhoto.compose.widget));
			} else {
				hbox.appendChild(wParent.removeChild(contactPhoto.compose.widget));
				hbox.appendChild(box);
			}

			contactPhoto.compose.widgetParent = hbox;
			
			window.setTimeout(contactPhoto.compose.displayEmptyCanvas, 20);
		}
	},
	
	
	setupEventListeners: function() {
		if (contactPhoto.debug) dump('--------------- setupEventListeners\n')

		contactPhoto.compose.widget.parentNode.addEventListener('DOMNodeInserted', contactPhoto.compose.listenerNodeInserted, false);
		contactPhoto.compose.widget.parentNode.addEventListener('DOMNodeRemoved', contactPhoto.compose.listenerNodeRemoved, false);
		
		// change stack height after the size addressingwidget has been changed
		document.getElementById('compose-toolbar-sizer').addEventListener('mousedown', contactPhoto.compose.listenerSizerMouseDown, false);

		var composeWindow = document.getElementById("msgcomposeWindow");
		composeWindow.addEventListener('compose-window-close', contactPhoto.compose.listenerComposeWindowClosed, false);
	},


	listenerComposeWindowClosed: function() {
		if (contactPhoto.debug) dump('WINDOW CLOSED\n\n')

		// clear the stack area
		if (contactPhoto.prefs.get('composePhotos.display', 'bool')) {
			var stackCanvas = document.getElementById('DiCoP-PhotoStack');
			stackCanvas.width = stackCanvas.width;
		}


		// remove cached images
		var hbox = document.getElementById('DiCoP-AddressingContainer');
		var imageNodes = [];
		for (i in hbox.childNodes) {
			if (hbox.childNodes[i].tagName && hbox.childNodes[i].tagName.toLowerCase() == 'image') {
				imageNodes.push(hbox.childNodes[i]);
			}
		}
		for (i in imageNodes) {
			hbox.removeChild(imageNodes[i]);
		}

		// reset images in addressingWidget
		var widget = document.getElementById('addressingWidget');
		var boxes = widget.getElementsByTagName('textbox');

		for (var i=0; i<boxes.length; i++) {
			boxes[i].value = '';
			boxes[i].currnetValue = '';
			boxes[i].previousValue = '';
			var icon = boxes[i].previousSibling.firstChild;
			if (icon.tagName == 'image') {
				contactPhoto.compose.resetPhoto(icon);
			}
		}
	},
	
	
	listenerSizerMouseDown: function() {
		document.getElementById('compose-toolbar-sizer').addEventListener('mouseup', contactPhoto.compose.listenerSizerMouseUp, false);
	},
	
	
	listenerSizerMouseUp: function() {
		document.getElementById('compose-toolbar-sizer').removeEventListener('mouseup', contactPhoto.compose.listenerSizerMouseUp, false);
		
		var listboxHeight = document.getElementById("addressingWidget").boxObject.height;
		var stackCanvas = document.getElementById('DiCoP-PhotoStack');
		stackCanvas.style.height = (listboxHeight-2)+"px";
		stackCanvas.height = listboxHeight-2;
		window.setTimeout(contactPhoto.compose.displayStackView, 0);
	},


	resetPhoto: function(imgObj) {
		if (contactPhoto.debug) dump('RESET img\n')
		imgObj.style.width = '16px';
		imgObj.style.height = '16px';
		imgObj.style.listStyleImage = contactPhoto.compose.defaultIconURI;
	},

	defaultIconURI: 'url("chrome://messenger/skin/addressbook/icons/abcard.png")',
	textboxCounter: 0, // counter for continuous identification of textboxes



	// iterate through all textboxes in the addressingwidget.
	// check whether the contents have changed and load the photo.
	checkAllTextboxes: function() {
		if (contactPhoto.debug) dump("\n----- checkAllTextboxes start\n");

		var forceRedraw = false; // force redraw of stack
		var photoChanged = false; // true whenever a photo will be changed

		var currentDrawNumber = contactPhoto.compose.stackDrawNumber;

		var bxs = contactPhoto.compose.widgetParent.getElementsByTagName('textbox');
		if (contactPhoto.debug) dump('num boxes found: '+bxs.length+'\n')

		for (var i=0; i<bxs.length; i++) {

			var boxID =  bxs[i].getAttribute('DiCoP-TextboxID');

			var setDefaultIcon = true;

			var curBoxValue = bxs[i].currentValue;
			
			if (contactPhoto.debug) {
				dump('current box value: '+curBoxValue+"\n")
				dump('previous box value: '+bxs[i].previousValue+"\n")
				dump('email: '+bxs[i].email+"\n")
			}

			var icon = bxs[i].previousSibling.firstChild;

			// only parse data if it has changed and there is an @-sign
			if (curBoxValue != bxs[i].previousValue) {

				if (curBoxValue.indexOf('@') > -1) {
					bxs[i].previousValue = curBoxValue;

					// extract e-mail address
					var hdrAddresses = {};
					var msgHeaderParser = Components.classes["@mozilla.org/messenger/headerparser;1"].getService(Components.interfaces.nsIMsgHeaderParser);
					var numAddresses = msgHeaderParser.parseHeadersWithArray(curBoxValue, hdrAddresses, {}, {});
					var emailAddress = hdrAddresses.value[0];

					// one address found and it has been changed --> update icon and photo stack
					if (numAddresses == 1 && bxs[i].email != emailAddress) {
						setDefaultIcon = false;
						photoChanged = true;
						bxs[i].email = emailAddress.toLowerCase();
						bxs[i].imgLoaded = false;
						var _ii_ = i; // used in event-listener-closures

						if (contactPhoto.debug > 1) dump('loading photo for '+emailAddress+'\n');


						var photoInfo = contactPhoto.photoForEmailAddress(emailAddress);

						var photoInfoStack = {};
						for (var x in photoInfo) { // copy the photoInfo object
							photoInfoStack[x] = photoInfo[x];
						}

						photoInfo.size = contactPhoto.prefs.get('smallIconSize', 'int');
						photoInfo.noVisualEffects = true;
						photoInfo.photoObject = icon;
						contactPhoto.display.logic(photoInfo, false);

						if (contactPhoto.prefs.get('composePhotos.display', 'bool')) {
							photoInfoStack.size = contactPhoto.prefs.get('composePhotos.size', 'int');
							
							photoInfoStack.photoObject = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'image');
							photoInfoStack.photoObject.setAttribute('collapsed', 'true'); // don't show the image in the ui
							photoInfoStack.photoObject.style.display = 'block';
							document.getElementById('addressingWidget').parentNode.appendChild(photoInfoStack.photoObject);

							bxs[i].imgObject = photoInfoStack.photoObject;

							photoInfoStack.photoObject.addEventListener('load', function() {
								if (contactPhoto.debug) dump(bxs[_ii_].email+' loaded '+_ii_+'----------\n')
								bxs[_ii_].imgLoaded = true;
								
								// clear abort timeout
								window.clearTimeout(bxs[_ii_].loadTimeout);
								bxs[_ii_].timeoutOccurred = false;

								// cancel if stack has already been redrawn in the meantime
								if (currentDrawNumber != contactPhoto.compose.stackDrawNumber) {
									return;
								}

								if (contactPhoto.compose.checkAllImagesLoaded()) {
									if (contactPhoto.debug) dump('all images loaded (load call)\n');

									contactPhoto.compose.displayStackView();
								}
							}, false);

							// add a timeout in case a photo can't be loaded (error-event does not work)
							bxs[i].loadTimeout = window.setTimeout(function() {
								if (contactPhoto.debug) dump('photo load timeout for '+_ii_+'  '+bxs[_ii_].email+'\n');
								
								
								bxs[_ii_].timeoutOccurred = true;
								
								// trigger image check again, as this might be the last image
								if (contactPhoto.compose.checkAllImagesLoaded()) {
									if (contactPhoto.debug) dump('all images loaded (timeout call)\n');

									contactPhoto.compose.displayStackView();
								}
							}, 10000);
							
							contactPhoto.display.logic(photoInfoStack, false);
						}

					}
				} else { // no mail address found, don't display a photo in the stack
					bxs[i].email = '';
					bxs[i].imgLoaded = false;
				}
			} else { // value of this textbox did not change
				setDefaultIcon = false;
			}

			if (contactPhoto.debug) dump("setdefaulticon: "+setDefaultIcon+"\n")

			if (setDefaultIcon) {
				bxs[i].email = '';
				bxs[i].imgLoaded = false;
				contactPhoto.compose.resetPhoto(icon);
				forceRedraw = true
			}

		}

		if (forceRedraw && !photoChanged) {
			if (contactPhoto.debug) dump("Forced redraw\n");
			contactPhoto.compose.displayStackView(); // redraw the photo stack
		}

		if (contactPhoto.debug) dump("---------- checkAllTextboxes end\n");
	},

	checkAllImagesLoaded: function() {
		if (contactPhoto.debug) dump('checkAllImagesLoaded\n');

		var boxes = contactPhoto.compose.widgetParent.getElementsByTagName('textbox');
		for (var id=0; id<boxes.length; id++) {
			if (contactPhoto.debug) dump("box "+id+" img loaded: "+boxes[id].imgLoaded);
			
			// skip not valid email addresses
			if (boxes[id].email == '') {
				if (contactPhoto.debug) dump(' (not valid)\n')
				continue;
			}
			// skip not loaded images (they may trigger a redraw whenever they are loaded)
			if (boxes[id].timeoutOccurred == true) {
				if (contactPhoto.debug) dump(' (timeout)\n')
				continue;
			}
			if (contactPhoto.debug) dump('\n')
			// exit if the current image is not yet loaded
			if (boxes[id].imgLoaded == false) return false;
		}
		// all images have been checked and no error has been found -> OK
		return true;
	},


	// this function is called when a new listitem is inserted into the addressingwidget.
	// it modifies the textbox inside and sets eventlisteners for value changes.
	newListitem: function(listitem) {
		var textboxes = listitem.getElementsByTagName('textbox');
		
		if (textboxes.length == 1) {
			if (contactPhoto.debug) dump('INIT textbox\n')
			//alert('counter '+contactPhoto.compose.textboxCounter)

			textboxes[0].value = '';
			textboxes[0].setAttribute('value', '');

			var boxID = 'box'+(contactPhoto.compose.textboxCounter++);
			textboxes[0].setAttribute('DiCoP-TextboxID', boxID);

			textboxes[0].currentValue = '';
			textboxes[0].previousValue = '';
			textboxes[0].email = '';
			textboxes[0].imgObject = null;
			textboxes[0].imgLoaded = false;
			textboxes[0].timeoutOccurred = false;


			// listen for user-based changes which fire after the textbox loses focus
			textboxes[0].addEventListener('change', function(e) {
				if (contactPhoto.debug) dump('\nvalue changed: '+e.target.getAttribute('DiCoP-TextboxID')+' --> '+e.target.value+'\n')

				textboxes[0].previousValue = textboxes[0].currentValue;
				textboxes[0].currentValue = e.target.value;

				contactPhoto.compose.checkAllTextboxes();
			}, false);

			// listen for script-based changes
			textboxes[0].addEventListener('DOMAttrModified', function(e) {
				if (e.attrName != 'value') return;
				if (contactPhoto.debug) dump('\nvalue modified: '+e.target.getAttribute('DiCoP-TextboxID')+' --> '+e.target.getAttribute('value')+'\n')

				textboxes[0].previousValue = textboxes[0].currentValue;
				textboxes[0].currentValue = e.target.getAttribute('value');

				contactPhoto.compose.checkAllTextboxes();
			}, false);

			// listen for input changes, but only do something when the box is cleared (for performance reasons)
			textboxes[0].addEventListener('input', function(e) {
				if (textboxes[0].value != '') return;

				textboxes[0].previousValue = textboxes[0].currentValue;
				textboxes[0].currentValue = e.target.value;

				contactPhoto.compose.checkAllTextboxes();
			}, false);


			// add a 'change' event to the ontextentered attribute (textentered event is not fired)
			var eventCode = 'e = document.createEvent("UIEvents");';
			eventCode = eventCode + 'e.initUIEvent("change", true, true, window, 1);';
			eventCode = eventCode + 'this.dispatchEvent(e);';
			textboxes[0].setAttribute('ontextentered', textboxes[0].getAttribute('ontextentered')+';'+eventCode)




			if (!contactPhoto.compose.hasImageBox(listitem)) {
				// hide the existing icon
				textboxes[0].firstChild.hidden = true;

				// create a new icon outside the textbox
				var newBox = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'box');
				newBox.setAttribute('name', 'DiCoP-Photobox');
				newBox.className = 'DiCoP-ComposeImageBox';
				newBox.setAttribute('align', 'center');
				newBox.setAttribute('pack', 'center');
				var boxSize = contactPhoto.prefs.get('smallIconSize', 'int');
				newBox.setAttribute('width', boxSize);
				newBox.setAttribute('height', boxSize);
				newBox.style.height = boxSize+'px';
				newBox.style.width = boxSize+'px';
				newBox.addEventListener('click', function(e) {
					this.nextSibling.select();
				}, false);

				var newImage = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'image');
				newImage.style.listStyleImage = contactPhoto.compose.defaultIconURI;
				newBox.appendChild(newImage);

				textboxes[0].parentNode.insertBefore(newBox, textboxes[0]);

			} else {
				contactPhoto.compose.resetPhoto(textboxes[0].previousSibling.firstChild);
			}
		}
	},

	// check whether there is box which contains the image
	hasImageBox: function(listitem) {
		var boxes = listitem.getElementsByTagName('box');
		for (var i in boxes) {
			if (typeof boxes[i] != 'object') continue;
			if (boxes[i].getAttribute('name') == 'DiCoP-Photobox') return true;
		}
		return false;
	},

	// event-listener for DOMNodeInserted events
	listenerNodeInserted: function(e) {
		if (contactPhoto.debug) dump('node inserted: '+e.target.tagName+'\n')
		if (e.target.tagName == 'listitem') {
			contactPhoto.compose.newListitem(e.target);
		}
	},

	// event-listener for DOMNodeRemoved events, fires before a node is removed
	listenerNodeRemoved: function(e) {
		var textbox = e.target.getElementsByTagName('textbox');
		if (textbox.length == 1) {
			if (contactPhoto.debug) dump('******** textbox removed: '+textbox[0].getAttribute('DiCoP-TextboxID')+'\n\n');

			// when a textbox is removed, redraw the stack if the email property is not a nullstring
			// in the latter case, the textbox has been empty oder the stack has already been redrawn
			if (textbox[0].email != '') {
				textbox[0].value = '';
				textbox[0].email = '';
				textbox[0].currentValue = '';
				textbox[0].previousValue = '';
				textbox[0].imgLoaded = false;
				textbox[0].imgObject = null;

				contactPhoto.compose.displayStackView(); // redraw the photo stack
			}
		}
	},
	
	
	displayStackView: function() {
		if (contactPhoto.debug) dump("DRAW STACK ")

		var currentDrawNumber = ++contactPhoto.compose.stackDrawNumber;

		var bxs = contactPhoto.compose.widgetParent.getElementsByTagName('textbox');

		
		var maxAddresses = 10; // max of displayed addresses
		var addresses = [];

		// check if an image has been assigned and reverse the order
		var boxes = contactPhoto.compose.widgetParent.getElementsByTagName('textbox');
		if (contactPhoto.debug) dump('displayStackView: '+boxes.length+'\n')
		for (var id=0; id<boxes.length; id++) {

			if (boxes[id].email == '') {
				if (contactPhoto.debug) dump('id: '+id+' '+boxes[id].email+' (email not valid)\n');
				continue;
			}
			if (boxes[id].imgObject == null) {
				if (contactPhoto.debug) dump('id: '+id+' '+boxes[id].email+' (no img obj)\n');
				continue;
			}
			if (boxes[id].imgLoaded == false) {
				if (contactPhoto.debug) dump('id: '+id+' '+boxes[id].email+' (not loaded)\n');
				continue;
			}
			
			if (contactPhoto.debug) dump('id: '+id+' '+boxes[id].email+' added\n')
			addresses.unshift(boxes[id].email);
			
			if (addresses.length >= maxAddresses) break;
		}

		
		var stackCanvas = document.getElementById('DiCoP-PhotoStack');
		stackCanvas.width = stackCanvas.width; // clear the canvas
		
		// exit if there is nothing to draw
		if (addresses.length == 0) { 
			if (contactPhoto.debug) dump("addresses.length == 0\n\n");
			contactPhoto.compose.displayEmptyCanvas();
			return; 
		}
		
		var stackCtx = stackCanvas.getContext('2d');

		var size = contactPhoto.prefs.get('composePhotos.size', 'int'); // max size of the foremost image
		var sizeDistance = 0.6; // percentage of the size of the rearmost image compared to the foremost

		
		var vanPt1 = { // vanishing point on the bottom side
			x: .95 * stackCanvas.width,
			y: 20 * stackCanvas.height
		}
		var vanPt2 = { // vanishing point on the right side
			x: 3 * stackCanvas.width,
			y: .05 * stackCanvas.height
		}
		
		/**
		* estimate dimensions of a transformed image at bottom right side (foremost image)
		* determine vanishing points using an untransformed image then calculate the bounding box
		**/
		
		var vp1 = { // vanishing point on the bottom side
			x: vanPt1.x - (stackCanvas.width - size),//- contactPhoto.compose.photoStack.padding),
			y: vanPt1.y - (stackCanvas.height - size)//- contactPhoto.compose.photoStack.padding)
		}
		var vp2 = { // vanishing point on the right side
			x: vanPt2.x - (stackCanvas.width - size),//- contactPhoto.compose.photoStack.padding),
			y: vanPt2.y - (stackCanvas.height- size)//- contactPhoto.compose.photoStack.padding)
		}
		var dummyCanvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
		dummyCanvas.width = size;
		dummyCanvas.height = size;
		var perspectiveWarp = new canvasPerspectiveWarp(dummyCanvas);
		perspectiveWarp.interpolationMethod = 'bl'; // bilinear
		perspectiveWarp.referencePoint = 'bl'; // bottom left
		var boundingBox = perspectiveWarp.vanishingPointsBoundingBox(vp1.x, vp1.y, vp2.x, vp2.y);
		//alert(boundingBox.width+'\n'+boundingBox.height)
		
		// draw photos along a linear slope from x0/y0 to x1/y1
		var x0 = contactPhoto.compose.photoStack.padding;
		var y0 = size*sizeDistance + contactPhoto.compose.photoStack.padding;
		//var x1 = stackCanvas.width - contactPhoto.display.photoCache[addresses[addresses.length-1]+'-'+size].width - contactPhoto.compose.photoStack.padding; // width of foremost image
		var x1 = stackCanvas.width - (boundingBox.width) - contactPhoto.compose.photoStack.padding;
		var y1 = stackCanvas.height - (boundingBox.height-size) - contactPhoto.compose.photoStack.padding;
			

		var untransformedCanvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
		untransformedCanvas.width = stackCanvas.width;
		untransformedCanvas.height = stackCanvas.height;
		var untransformedCtx = untransformedCanvas.getContext('2d');
		
		/** 
		* for each image, a percentage is calculated where to draw it along the slope.
		* two approaches are used u and v, they are linearly mixed depending on the count 
		* of images; at addr.len>=m, only v is used.
		* strategy for calculating u and v:
		*	img		%u		%v
		*	1		.33		0
		*	2		.37		1
		*
		*	1		.2		0
		*	2		.4		.33
		*	3		.6		.67
		*	4		.8		1
		*
		* a maximum of maxAddresses are displayed (already filtered above)
		* u / v is used for positioning, while u2 / v2 is used for scaling the images
		**/
		var m = 6;
		var k = Math.min(addresses.length-1, m);
		var div = k/m;
		
		for (var i=0; i<addresses.length; i++) {
			// exit if there is a more recent call to displayStackView()
			if (currentDrawNumber != contactPhoto.compose.stackDrawNumber) { return; }


			var w = contactPhoto.display.photoCache[addresses[i]+'-'+size].width;
			var h = contactPhoto.display.photoCache[addresses[i]+'-'+size].height;
			
			
			
			var dx, dy, dw, dh
			
			// if there is only one image, position it in full size in the center
			if (addresses.length == 1) {
				dw = w;
				dh = h;
				
				dx = ((stackCanvas.width-w)*.5 - contactPhoto.compose.photoStack.padding);
				dy = ((stackCanvas.height-h)*.5 - contactPhoto.compose.photoStack.padding);
				
			} else {
			
				/* ellipse stack
				var a = stackCanvas.width - size; // x halbachse
				var b = stackCanvas.height - size*sizeDistance; // y halbachse
				var oX = -0;
				var oY = stackCanvas.height;
				
				var dx = oX + a * Math.cos((1-t) * (2*Math.PI/4)) -dw
				var dy = oY + b * -Math.sin((1-t) * (2*Math.PI/4)) -dh
				*/
				
				var n = (addresses.length == 1)? 1: addresses.length-1; // make sure n is never equal to zero (division by n), addr.len==0 handled earlier
				
				var u = (i+1)/(addresses.length+1);
				var u2 = (i+1)/(addresses.length);
				
				var v = i/n;
				var v2 = v;
				
				var t = (1-div)*u + (div)*v; // linearly mix the two functions
				var t2 = (1-div)*u2 + (div)*v2; 			
				
				if (contactPhoto.debug) dump("tp: "+t.toFixed(2)+"\nts: "+t2.toFixed(2)+"\n")

				var dw = w*(sizeDistance + t2*(1-sizeDistance));
				var dh = h*(sizeDistance + t2*(1-sizeDistance));
				
				var dx = x0 + t*(x1-x0);
				var dy = y0 + t*(y1-y0) - dh;
			}
			
			
			/* create a slight horizontal alpha gradient to let the photo behind shine through */
			var tmpCanvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
			tmpCanvas.width = dw;
			tmpCanvas.height = dh;
			var tmpCtx = tmpCanvas.getContext('2d');
			tmpCtx.drawImage(contactPhoto.display.photoCache[addresses[i]+'-'+size], 0, 0, dw, dh);
			tmpCtx.globalCompositeOperation = 'destination-out';

			var gradient = tmpCtx.createLinearGradient(0, 0, dw, 0);
			gradient.addColorStop(0, "rgba(255, 255, 255, 0.2)");
			gradient.addColorStop(0.5, "rgba(255, 255, 255, 0)");
			tmpCtx.fillStyle = gradient;
			tmpCtx.rect(0, 0, dw, dh);
			tmpCtx.fill();
			
			
			// vanishing points are relative to top left of image -> adjust by position of image
			var vp1 = { // vanishing point on the bottom side
				x: vanPt1.x - dx,
				y: vanPt1.y - dy
			}
			var vp2 = { // vanishing point on the right side
				x: vanPt2.x - dx,
				y: vanPt2.y - dy
			}

			if (currentDrawNumber != contactPhoto.compose.stackDrawNumber) { return; }
			var perspectiveWarp = new canvasPerspectiveWarp(tmpCanvas);
			perspectiveWarp.interpolationMethod = 'bl'; // bilinear
			perspectiveWarp.referencePoint = 'bl'; // bottom left
			var transformation = perspectiveWarp.vanishingPoints(vp1.x, vp1.y, vp2.x, vp2.y);

			if (currentDrawNumber != contactPhoto.compose.stackDrawNumber) { return; }
			
			stackCtx.drawImage(transformation, dx, dy);
			//stackCtx.drawImage(tmpCanvas, dx, dy);

		} // end addresses loop

		if (contactPhoto.debug) dump('  ... finished\n-------------------------------\n');
	},
	
	
	displayEmptyCanvas: function() {
		var stackCanvas = document.getElementById('DiCoP-PhotoStack');
		var stackCtx = stackCanvas.getContext('2d');
		
		stackCtx.strokeStyle = 'rgba(200, 0, 0, .08)';
		stackCtx.lineWidth = 3;
		stackCtx.lineCap = 'round';
		var padding = .15; // % of width, height
		
		// draw a cross
		stackCtx.moveTo(stackCanvas.width*padding, stackCanvas.height*padding);
		stackCtx.lineTo(stackCanvas.width*(1-padding), stackCanvas.height*(1-padding));
		stackCtx.moveTo(stackCanvas.width*padding, stackCanvas.height*(1-padding));
		stackCtx.lineTo(stackCanvas.width*(1-padding), stackCanvas.height*padding);
		stackCtx.stroke();
	}
}

window.addEventListener('load', function() {
	if (contactPhoto.debug) dump("event load\n");
	
	// no possiblity to delay - setup of photostack has to be done before the addresses are filled in
	contactPhoto.compose.initPhotoStack();
	contactPhoto.compose.setupEventListeners();
} , false);