if (!contactPhoto) var contactPhoto = {};


contactPhoto.compose = {
	contentLoaded: function() {
		if (contactPhoto.debug) dump('content loaded\n')
		var widget = document.getElementById('addressingWidget');
		
		widget.parentNode.addEventListener('DOMNodeInserted', contactPhoto.compose.nodeInserted, false);
		
		var composeWindow = document.getElementById("msgcomposeWindow");
		composeWindow.addEventListener('compose-window-close', contactPhoto.compose.composeWindowClosed, false);

	},
	
	composeWindowClosed: function() {
		if (contactPhoto.debug) dump('WINDOW CLOSED\n\n')
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
	addressTextboxesValues: [],
	textboxCounter: 0,
	
	allTextboxes: function(e) {
		var widget = document.getElementById('addressingWidget');
		var bxs = widget.getElementsByTagName('textbox');
		
		for (var i in bxs) {
			if (typeof bxs[i] != 'object') continue;
			
			var boxID = bxs[i].getAttribute('DiCoP-Textbox');
			
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
			textboxes[0].setAttribute('DiCoP-Textbox', boxID);
			contactPhoto.compose.addressTextboxesValues[boxID] = 'DiCoP-TextboxInit';
			
			if (!contactPhoto.compose.hasImageBox(listitem)) {
				// hide the old icon, then create a new icon outside the textbox
				textboxes[0].firstChild.hidden = true;
				
				var newBox = document.createElement('box');
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
								
				var newImage = document.createElement('image');
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
	
	
	recipientChanged: function(textbox, attrChanged) {
		var recipient = (attrChanged)? textbox.getAttribute('value'): textbox.value;
		
		var boxID = textbox.getAttribute('DiCoP-Textbox');
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
		
		if (contactPhoto.debug) dump('CHANGED: '+recipient+'       '+textbox.getAttribute('DiCoP-Textbox')+'\n')
		
		
		
		if (recipient.indexOf('@') > -1) {
				
			var hdrAddresses = {};
			var msgHeaderParser = Components.classes["@mozilla.org/messenger/headerparser;1"]
										.getService(Components.interfaces.nsIMsgHeaderParser);
			var numAddresses = msgHeaderParser.parseHeadersWithArray(recipient, hdrAddresses, {}, {});
			
			if (numAddresses == 1) {
				if (contactPhoto.debug) dump('loading photo for '+hdrAddresses.value[0]);
							
				var photoInfo = contactPhoto.photoForEmailAddress(hdrAddresses.value[0]);
				photoInfo.size = contactPhoto.prefs.get('smallIconSize', 'int');
				photoInfo.noVisualEffects = true;
				
				photoInfo.photoObject = icon;
				
				contactPhoto.display.logic(photoInfo, false);
			
				return;
			}			
		}
		
		if (contactPhoto.debug) dump('not a valid address: '+recipient+'\n')
		contactPhoto.compose.resetPhoto(icon);
	}	
}

window.addEventListener('DOMContentLoaded', contactPhoto.compose.contentLoaded, false);

