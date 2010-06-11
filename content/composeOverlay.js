if (!contactPhoto) var contactPhoto = {};


contactPhoto.compose = {
	photoStack: {
		width: 150,
		height: 90
	},
	stackDrawNumber: 0,
	
	contentLoaded: function() {
		if (contactPhoto.debug) dump('content loaded\n')
		
		var widget = document.getElementById('addressingWidget');
		
		widget.parentNode.addEventListener('DOMNodeInserted', contactPhoto.compose.nodeInserted, false);
		widget.parentNode.addEventListener('DOMNodeRemoved', contactPhoto.compose.nodeRemoved, false);
		
		var composeWindow = document.getElementById("msgcomposeWindow");
		composeWindow.addEventListener('compose-window-close', contactPhoto.compose.composeWindowClosed, false);
	},
	
	photoStackInitDone: false,
	initPhotoStack: function() {
		if (contactPhoto.compose.photoStackInitDone) return;
		contactPhoto.compose.photoStackInitDone = true;
	
		if (contactPhoto.prefs.get('3Dstack.display', 'bool')) {
			/* replace <addressingWidget/> with
			<hbox>
				<box><canvas/></box>
				<addressingWidget/>
			</hbox>
			*/
					
			
			var widget = document.getElementById('addressingWidget');
			var parent = widget.parentNode;
			
			var hbox = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'hbox');
			//hbox.align = 'center';
			hbox.flex = '1';
			parent.insertBefore(hbox, widget.nextSibling);
			
			var box = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'box');
			box.align = 'center';
			
			
			var canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
			canvas.id = 'DiCoP-PhotoStack';
			canvas.width = contactPhoto.compose.photoStack.width;
			canvas.height = contactPhoto.compose.photoStack.height;
			canvas.style.width = contactPhoto.compose.photoStack.width+'px';
			canvas.style.height = contactPhoto.compose.photoStack.height+'px';
			//canvas.style.border = '1px solid red';
			box.appendChild(canvas);
			
			if (contactPhoto.prefs.get('3Dstack.position', 'char') == 'left') {
				hbox.appendChild(box);
				hbox.appendChild(parent.removeChild(widget));
			} else {
				hbox.appendChild(parent.removeChild(widget));
				hbox.appendChild(box);
			}
		
		}
	},
	
	composeWindowClosed: function() {
		if (contactPhoto.debug) dump('WINDOW CLOSED\n\n')
		
		// clear the stack area
		if (contactPhoto.prefs.get('3Dstack.display', 'bool')) {
			var stack = document.getElementById('DiCoP-PhotoStack');
			stack.width = stack.width;
		}
		
		var widget = document.getElementById('addressingWidget');
		var boxes = widget.getElementsByTagName('textbox');

		for (var i in boxes) {
			boxes[i].value = '';
			boxes[i].setAttribute('value', '');
			var icon = boxes[i].previousSibling.firstChild;
			if (icon.tagName == 'image') {
				contactPhoto.compose.resetPhoto(icon);
			}
		}
		
		contactPhoto.compose.addressTextboxesValues = [];
	},
	
	
	resetPhoto: function(imgObj) {
		if (contactPhoto.debug) dump('RESET\n')
		imgObj.style.width = '16px';
		imgObj.style.height = '16px';
		imgObj.style.listStyleImage = contactPhoto.compose.defaultIconURI;
	},
	
	defaultIconURI: 'url("chrome://messenger/skin/addressbook/icons/abcard.png")',
	addressTextboxesValues: [], // complete values of the textboxes
	addressTextboxesEmail: [], // extracted e-mail addresses of the textboxes
	textboxCounter: 0,
	
	allTextboxes: function(e) {
		var widget = document.getElementById('addressingWidget');
		var bxs = widget.getElementsByTagName('textbox');
		
		for (var i in bxs) {
			if (typeof bxs[i] != 'object') continue;
			
			var boxID = bxs[i].getAttribute('DiCoP-TextboxID');
			
			if (typeof contactPhoto.compose.addressTextboxesValues[boxID] == 'undefined') continue;
			
			if (bxs[i].value == contactPhoto.compose.addressTextboxesValues[boxID]) {
				continue;
			}
			
			contactPhoto.compose.recipientChanged(bxs[i]);
		}
	},
	
	newListitem: function(listitem) {	
		var textboxes = listitem.getElementsByTagName('textbox');
		
		if (textboxes.length == 1) {
			if (contactPhoto.debug) dump('INIT textbox\n')

			textboxes[0].value = '';
			
			// listen for manual and for script-based changes
			textboxes[0].addEventListener('change', contactPhoto.compose.allTextboxes, false);
			
			textboxes[0].addEventListener('DOMAttrModified', function(e) {
				if (e.attrName != 'value') return;
				//contactPhoto.utils.mydump(e)
				contactPhoto.compose.recipientChanged(e.target, true);
			}, false);
			
			var boxID = 'box'+(contactPhoto.compose.textboxCounter++);
			textboxes[0].setAttribute('DiCoP-TextboxID', boxID);
			contactPhoto.compose.addressTextboxesValues[boxID] = 'DiCoP-TextboxInit';
			
			if (!contactPhoto.compose.hasImageBox(listitem)) {
				// hide the old icon, then create a new icon outside the textbox
				textboxes[0].firstChild.hidden = true;
				
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
				newBox.setAttribute('onclick', 'this.nextSibling.select();');
								
				var newImage = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'image');
				newImage.style.listStyleImage = contactPhoto.compose.defaultIconURI;
				newBox.appendChild(newImage);
			
				textboxes[0].parentNode.insertBefore(newBox, textboxes[0]);
			}
			
			contactPhoto.compose.allTextboxes();
		}
	},
	
	hasImageBox: function(listitem) {
		var boxes = listitem.getElementsByTagName('box');
		for (var i in boxes) {
			if (typeof boxes[i] != 'object') continue;
			if (boxes[i].getAttribute('name') == 'DiCoP-Photobox') return true;
		}
		return false;
	},
	
	nodeInserted: function(e) {
		if (contactPhoto.debug) dump('node inserted: '+e.target.tagName+'\n')
		if (e.target.tagName == 'listitem') {
			contactPhoto.compose.newListitem(e.target);
		}
	},
	
	nodeRemoved: function(e) {
		
		
		var textbox = e.target.getElementsByTagName('textbox');
		if (textbox.length == 1) {
			var boxID = textbox[0].getAttribute('DiCoP-TextboxID');
			
			if (typeof contactPhoto.compose.addressTextboxesValues[boxID] != 'undefined') {
				alert('removed '+boxID)
				delete contactPhoto.compose.addressTextboxesValues[boxID];
				contactPhoto.compose.displayStackView();
			}
		}
	},
	
	recipientChanged: function(textbox, attrChanged) {
		var recipient = (attrChanged)? textbox.getAttribute('value'): textbox.value;
		
		var boxID = textbox.getAttribute('DiCoP-TextboxID');
		// somehow a change event is fired without a value change --> exit
		//if (contactPhoto.debug) alert(boxID+'\nlastval: $'+contactPhoto.compose.addressTextboxesValues[boxID]+'$\ncurval: $'+recipient+'$')
		
		if (typeof contactPhoto.compose.addressTextboxesValues[boxID] == 'undefined') {
			if (contactPhoto.debug) alert('!boxID')
			return;
		}
		
		var icon = textbox.previousSibling.firstChild;
		
		if (recipient == contactPhoto.compose.addressTextboxesValues[boxID]) {
			if (contactPhoto.debug) dump('VALUE NOT CHANGED\n')
			
			return;
		}
		contactPhoto.compose.addressTextboxesValues[boxID] = recipient;
		
		if (contactPhoto.debug) dump('CHANGED: '+recipient+'       '+textbox.getAttribute('DiCoP-TextboxID')+'\n')
		
		
		
		if (recipient.indexOf('@') > -1) {
				
			var hdrAddresses = {};
			var msgHeaderParser = Components.classes["@mozilla.org/messenger/headerparser;1"]
										.getService(Components.interfaces.nsIMsgHeaderParser);
			var numAddresses = msgHeaderParser.parseHeadersWithArray(recipient, hdrAddresses, {}, {});
			
			if (numAddresses == 1) {
				if (contactPhoto.debug) dump('loading photo for '+hdrAddresses.value[0]);
							
				var photoInfo = contactPhoto.photoForEmailAddress(hdrAddresses.value[0]);
				contactPhoto.compose.addressTextboxesEmail[boxID] = photoInfo.emailAddress;	
				
				if (contactPhoto.prefs.get('3Dstack.display', 'bool')) {
					var photoInfoStack = {};
					for (var i in photoInfo) {
						photoInfoStack[i] = photoInfo[i];
					}
					
					photoInfoStack.size = contactPhoto.prefs.get('3Dstack.photoSize', 'int');
					photoInfoStack.photoObject = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'image');
					photoInfoStack.photoObject.setAttribute('collapsed', 'true');
					photoInfoStack.photoObject.style.display = 'block';
					document.getElementById('addressingWidget').parentNode.appendChild(photoInfoStack.photoObject);
					
					photoInfoStack.photoObject.addEventListener('load', function() {
						contactPhoto.compose.displayStackView();
						//document.getElementById('addressingWidget').parentNode.removeChild(photoInfoStack.photoObject);
						/*
						var c = document.getElementById('DiCoP-PhotoStack');
						var ct = c.getContext('2d');
						ct.drawImage(photoInfoStack.photoObject, 10, 10);
						*/
					}, false);
				
					contactPhoto.display.logic(photoInfoStack, false);
				} else {
					contactPhoto.compose.displayStackView();
				}
				
				
				photoInfo.size = contactPhoto.prefs.get('smallIconSize', 'int');
				photoInfo.noVisualEffects = true;
				photoInfo.photoObject = icon;
				contactPhoto.display.logic(photoInfo, false);
			
				return;
			}
		}
		
		if (contactPhoto.debug) dump('not a valid address: '+recipient+'\n')
		contactPhoto.compose.resetPhoto(icon);
	},
	
	newStackStarted: false,
	displayStackView: function() {
		if (contactPhoto.prefs.get('3Dstack.display', 'bool') == false) return;
		
		
		contactPhoto.compose.stackDrawNumber++;
		var currentDrawingNumber = contactPhoto.compose.stackDrawNumber;
		
		var widget = document.getElementById('addressingWidget');
		var bxs = widget.getElementsByTagName('textbox');
		
		var addresses = [];
		
		for (var i in bxs) {
			if (typeof bxs[i] != 'object') continue;
			
			var boxID = bxs[i].getAttribute('DiCoP-TextboxID');
			
			if (typeof contactPhoto.compose.addressTextboxesValues[boxID] == 'undefined') continue;
			if (typeof contactPhoto.compose.addressTextboxesEmail[boxID] == 'undefined') continue;

			addresses.push(contactPhoto.compose.addressTextboxesEmail[boxID]);
		}
		addresses.reverse();
		
		var stackCanvas = document.getElementById('DiCoP-PhotoStack');
		stackCanvas.width = stackCanvas.width;
		var stackCtx = stackCanvas.getContext('2d');
		
		var size = contactPhoto.prefs.get('3Dstack.photoSize', 'int');
		var sizeDistance = 0.5; // percentage of the size of the rearmost image compared to the foremost
		
		// initialize start coordinates with dynamic values depending on the number of images
		tmp_h = contactPhoto.display.photoCache[addresses[0]+'-'+size].height;
		tmp_w = contactPhoto.display.photoCache[addresses[addresses.length-1]+'-'+size].width
		var x0 = 0;
		var y0 = tmp_h*(sizeDistance + 1/(addresses.length)*(1-sizeDistance)); // height of rearmost image
		var x1 = stackCanvas.width - tmp_w; // width of foremost image
		var y1 = stackCanvas.height;
		
		
		var untransformedCanvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
		untransformedCanvas.width = stackCanvas.width;
		untransformedCanvas.height = stackCanvas.height;
		var untransformedCtx = untransformedCanvas.getContext('2d');
		
		for (var i=0; i<addresses.length; i++) {
			if (currentDrawingNumber != contactPhoto.compose.stackDrawNumber) return;
			if (typeof contactPhoto.display.photoCache[addresses[i]+'-'+size] == 'undefined') continue;
			
			w = contactPhoto.display.photoCache[addresses[i]+'-'+size].width;
			h = contactPhoto.display.photoCache[addresses[i]+'-'+size].height;
						
			t = (i+1)/(addresses.length+1);
			t2 = (i+1)/(addresses.length);
			
			dw = w*(sizeDistance + t2*(1-sizeDistance));
			dh = h*(sizeDistance + t2*(1-sizeDistance));
			
			dx = x0 + t*(x1-x0);
			dy = y0 + t*(y1-y0) - dh;
			
			/* create a minimal horizontal alpha gradient to let the photo behind shine through slightly */
			var tmpCanvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
			tmpCanvas.width = dw;
			tmpCanvas.height = dh;
			var tmpCtx = tmpCanvas.getContext('2d');
			tmpCtx.drawImage(contactPhoto.display.photoCache[addresses[i]+'-'+size], 0, 0, dw, dh);
			tmpCtx.globalCompositeOperation = 'destination-out';
			
			var gradient = tmpCtx.createLinearGradient(0, 0, dw, 0);
			gradient.addColorStop(0, "rgba(255, 255, 255, 0.2)");
			gradient.addColorStop(0.4, "rgba(255, 255, 255, 0)");
			tmpCtx.fillStyle = gradient;
			tmpCtx.rect(0, 0, dw, dh);
			tmpCtx.fill();
			
			if (addresses.length > 1) { // do not warp the image if there is only one
				var vp1 = { // vanishing point on the bottom side
					x: .75 * stackCanvas.width - dx,
					y: 6 * stackCanvas.height - dy
				}
				var vp2 = { // vanishing point on the right side
					x: 3 * stackCanvas.width - dx,
					y: 0 * stackCanvas.height - dy
				}
				
				var perspectiveWarp = new canvasPerspectiveWarp(tmpCanvas); 
				perspectiveWarp.interpolationMethod = 'bl';
				var transformation = perspectiveWarp.vanishingPoints('tl', vp1.x, vp1.y, vp2.x, vp2.y);
				
				if (currentDrawingNumber != contactPhoto.compose.stackDrawNumber) return;
				stackCtx.drawImage(transformation, dx, dy);
			} else {
				stackCtx.drawImage(tmpCanvas, dx, dy);
			}
			
			//untransformedCtx.drawImage(tmpCanvas, dx, dy);
		}
		
		/*
		stackCanvas.width = stackCanvas.width;
		var stackCtx = stackCanvas.getContext('2d');
		
		var vp1 = { // vanishing point on the bottom side
			x: .7 * untransformedCanvas.width,
			y: 8 * untransformedCanvas.height
		}
		var vp2 = { // vanishing point on the left side
			x: 3 * untransformedCanvas.width,
			y: .3 * untransformedCanvas.height
		}
		
		var perspectiveWarp = new canvasPerspectiveWarp(untransformedCanvas); 
		perspectiveWarp.interpolationMethod = 'bl';
		var transformation = perspectiveWarp.vanishingPoints('tl', vp1.x, vp1.y, vp2.x, vp2.y);
		
		
		stackCtx.drawImage(transformation, 0, 0);
		*/
		//stackCtx.drawImage(untransformedCanvas, 0, 0);
		
		
	}
}

window.addEventListener('DOMContentLoaded', contactPhoto.compose.contentLoaded, false);
window.addEventListener('load', contactPhoto.compose.initPhotoStack, false);

