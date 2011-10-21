if (!contactPhoto) var contactPhoto = {};

contactPhoto.addressbook = {
	
	DCPDisplayHandler: function(aCard, aImg) {
		aImg.style.listStyleImage = ''; // clear the existing image
		
		var photoInfo = contactPhoto.photoForEmailAddress(aCard.primaryEmail);
		
		photoInfo.size = contactPhoto.prefs.get('addressbook.size', 'int');
		photoInfo.photoObject = aImg;
		
		contactPhoto.display.logic(photoInfo);
		
		return true;
	},
	
	// DCP needs a <image> element instead of a <html:img> element. additionally the size's unit has to be 'px' instead of 'ch'.
	initCardDisplay: function() {
		var container = document.getElementById('cvbPhoto');
		container.setAttribute('context', 'DCP-Contextmenu'); // set the contextmenu
		
		var oldPhoto = document.getElementById('cvPhoto');
		var description = container.firstChild;
		
		var width = contactPhoto.prefs.get('addressbook.size', 'int')+'px';
		
		// override unit of width (ch -> px)
		description.style.width = width;
		description.style.minWidth = width;
		description.style.maxWidth = width;
		
		var image = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'image');
		image.id = 'cvPhoto';
		image.style.margin = 'auto'; // center the image
		image.setAttribute('tooltiptext', container.getAttribute('tooltiptext')); // transfer the tooltip from container to image (defined in xul not js)
		container.removeAttribute('tooltiptext');
		
		// open the edit card window when clicking on the photo
		image.addEventListener('click', function(e) {
			if (e.button != 0) return; // do nothing if not left click
			
			window.contactPhoto.editCardFocusPhotoTab = true; // tell the dialog to focus the photo tab
			goDoCommand('button_edit'); // this opens the contact dialog
		}, false);
		
		description.replaceChild(image, oldPhoto);
	},
}

window.addEventListener('load', contactPhoto.addressbook.initCardDisplay, false);

// override the default display handlers, can't use registerPhotoDisplayHandler()
// the add-on contains the logic deciding which photo to display
gPhotoDisplayHandlers['generic'] = contactPhoto.addressbook.DCPDisplayHandler;
gPhotoDisplayHandlers['file'] = contactPhoto.addressbook.DCPDisplayHandler;
gPhotoDisplayHandlers['web'] = contactPhoto.addressbook.DCPDisplayHandler;