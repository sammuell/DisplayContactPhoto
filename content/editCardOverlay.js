if (!contactPhoto) var contactPhoto = {};

contactPhoto.editCard = {
	displayGenericPhotos: function() {
		// display more generic photos. copy them from the hidden list to the #GenericPhotoList
	
		var genericPhotoList = document.getElementById('GenericPhotoList');
		var menupopup = genericPhotoList.firstChild;
		
		// update existing entries to iconic style
		for (var i=0; i<menupopup.childNodes.length; i++) {
			menupopup.childNodes[i].className += ' menuitem-iconic';
		}

		var templateList = document.getElementById('DCP-GenericPhotoListTemplate');
		var templateMenupopup = templateList.firstChild;
		
		for (var i=0; i<templateMenupopup.childNodes.length; i++) {
			var clone = templateMenupopup.childNodes[i].cloneNode(true);
			menupopup.appendChild(clone);
		}
		
	},
	
	newGenericPhotoHandler: {
		onLoad: function(aCard, aDocument) {
			var genericPhotoList = document.getElementById('GenericPhotoList');
			
			var photoURI = aCard.getProperty('PhotoURI', '');
			if (photoURI == '') {
				 // if photoURI is empty, assign the default photo, 
				 // this will be done as soon as the preferences are available (load event)
				genericPhotoList.showDefaultPhoto = true;
			} else {
				genericPhotoList.value = photoURI;
			}
			
			return true;
		},

		onShow: function(aCard, aDocument, aTargetID) {
			var genericPhotoList = document.getElementById('GenericPhotoList');
			
			aDocument.getElementById(aTargetID).setAttribute('src', genericPhotoList.value);
			return true;
		},

		onSave: function(aCard, aDocument) {
			// If we had the photo saved locally, clear it.
			removePhoto(aCard.getProperty('PhotoName', null));
			aCard.setProperty('PhotoName', null);
			aCard.setProperty('PhotoType', 'generic');
			
			var genericPhotoList = document.getElementById('GenericPhotoList');
			
			aCard.setProperty('PhotoURI', genericPhotoList.value);
			return true;
		}
	},
	
	// check if gravatar is enabled, else disable menuitem and assign default URI if gravatar has been selected
	// select the correct default photo from DCP prefs
	checkDCPDefaultPrefs: function() {
		var genericPhotoList = document.getElementById('GenericPhotoList');
		
		if (contactPhoto.prefs.get('enableGravatar', 'bool') == false) {
			var menuitemGravatar = document.getElementById('DCP-GenericPhotoGravatar');
			
			if (menuitemGravatar.selected) {
				genericPhotoList.value = contactPhoto.prefs.get('defaultGenericPhoto', 'char');
			}
			
			menuitemGravatar.disabled = true;
		}
		
		// assign the default photo from DCP prefs if necessary
		if (genericPhotoList.showDefaultPhoto) {
			genericPhotoList.value = contactPhoto.prefs.get('defaultGenericPhoto', 'char');
		}
	},
}

RegisterLoadListener(contactPhoto.editCard.displayGenericPhotos);

registerPhotoHandler('generic', contactPhoto.editCard.newGenericPhotoHandler);

window.addEventListener('load', contactPhoto.editCard.checkDCPDefaultPrefs, false);